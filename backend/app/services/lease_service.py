# app/services/lease_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import Optional, Literal
from datetime import date, datetime

from app.models.lease import Lease, LeaseTenant, LeaseAmendment
from app.models.room import Room
from app.models.tenant import Tenant
from app.models.invoice import Invoice
from app.models.cash_flow import CashFlow
from app.schemas.lease import LeaseCreate, LeaseRenew, LeaseTerminate
from app.services.electricity_service import ElectricityService
from app.services.tenant_service import TenantService
from app.exceptions import LeaseNotEditableError, LeaseAmendmentError
from fastapi import HTTPException, status as http_status
from decimal import Decimal


# Type alias for lease status
LeaseStatus = Literal["draft", "pending", "active", "expired", "terminated"]


def determine_lease_status(lease: Lease, today: Optional[date] = None) -> LeaseStatus:
    """
    Determine lease status from facts.
    
    Rules:
    - terminated: lease.terminated_at IS NOT NULL
    - expired: today > lease.end_date AND terminated_at IS NULL
    - draft: lease.submitted_at IS NULL (tenant in queue, waiting for customer sign back)
    - pending: lease.submitted_at IS NOT NULL AND today < lease.start_date (customer signed back, manager submitted, waiting for effective date)
    - active: lease.submitted_at IS NOT NULL AND today >= lease.start_date AND today <= lease.end_date AND terminated_at IS NULL (locked for modifications, change via amendment/renew/terminate)
    """
    if today is None:
        today = date.today()
    
    terminated_at = lease.terminated_at
    
    if terminated_at is not None:
        return "terminated"
    elif today > lease.end_date:
        return "expired"
    elif lease.submitted_at is None:
        # Not yet submitted - draft status (tenant in queue, waiting for customer sign back)
        return "draft"
    elif today < lease.start_date:
        # Submitted but effective date hasn't arrived - pending
        return "pending"
    else:  # submitted_at IS NOT NULL AND today >= start_date AND today <= end_date
        # Submitted and effective date has arrived - active (locked for modifications)
        return "active"


async def assert_lease_editable(
    db: AsyncSession,
    lease: Lease,
    today: Optional[date] = None
) -> None:
    """
    Assert that a lease is editable.
    
    A lease is freely editable ONLY if:
    - status == draft (submitted leases cannot be edited)
    - submitted_at IS NULL
    - no invoices exist for the lease
    - no cashflows exist for the lease
    
    Raises LeaseNotEditableError if lease cannot be edited.
    """
    if today is None:
        today = date.today()
    
    # Check if lease has been submitted
    if lease.submitted_at is not None:
        raise LeaseNotEditableError(
            f"Cannot edit lease: lease has been submitted (submitted_at: {lease.submitted_at}). "
            "Submitted leases cannot be edited. Only draft leases can be edited."
        )
    
    status = determine_lease_status(lease, today)
    
    if status != "draft":
        raise LeaseNotEditableError(
            f"Cannot edit lease with status '{status}'. Only draft leases can be edited."
        )
    
    # Check for invoices
    invoice_count = await db.execute(
        select(func.count(Invoice.id)).where(
            and_(
                Invoice.lease_id == lease.id,
                Invoice.deleted_at.is_(None)
            )
        )
    )
    invoice_count = invoice_count.scalar() or 0
    
    if invoice_count > 0:
        raise LeaseNotEditableError(
            f"Cannot edit lease: {invoice_count} invoice(s) exist for this lease. "
            "Financial history must remain immutable."
        )
    
    # Check for cashflows
    cashflow_count = await db.execute(
        select(func.count(CashFlow.id)).where(
            and_(
                CashFlow.lease_id == lease.id,
                CashFlow.deleted_at.is_(None)
            )
        )
    )
    cashflow_count = cashflow_count.scalar() or 0
    
    if cashflow_count > 0:
        raise LeaseNotEditableError(
            f"Cannot edit lease: {cashflow_count} cashflow(s) exist for this lease. "
            "Financial history must remain immutable."
        )


class LeaseService:
    """Service for managing lease contracts"""

    @staticmethod
    async def create_lease(
        db: AsyncSession,
        lease_data: LeaseCreate,
        created_by: Optional[int] = None
    ) -> Lease:
        """
        Create a new lease contract.
        
        Business rules:
        - Room must exist
        - Tenant must exist or be created from tenant_data
        - Room must not have an active lease
        - End date must be after start date
        - Updates tenant information if tenant_data is provided
        - Updates lease assets
        """
        # Verify room exists
        room_result = await db.execute(
            select(Room).where(Room.id == lease_data.room_id)
        )
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {lease_data.room_id} not found"
            )

        # Handle tenant creation/update
        tenant = None
        if lease_data.tenant_id:
            if lease_data.tenant_data:
                # Update existing tenant with new data
                tenant = await TenantService.create_or_update_tenant(
                    db, lease_data.tenant_data, tenant_id=lease_data.tenant_id, created_by=created_by
                )
            else:
                # Use existing tenant as-is
                tenant_result = await db.execute(
                    select(Tenant).where(Tenant.id == lease_data.tenant_id)
                )
                tenant = tenant_result.scalar_one_or_none()
                if not tenant:
                    raise HTTPException(
                        status_code=http_status.HTTP_404_NOT_FOUND,
                        detail=f"Tenant with id {lease_data.tenant_id} not found"
                    )
        elif lease_data.tenant_data:
            # Create or update tenant by personal_id
            tenant = await TenantService.create_or_update_tenant(
                db, lease_data.tenant_data, created_by=created_by
            )
        else:
            # This should not happen due to schema validation, but just in case
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Either tenant_id or tenant_data must be provided"
            )

        tenant_name = f"{tenant.first_name} {tenant.last_name}"
        tenant_info = f"Tenant: {tenant_name} (ID: {tenant.id})"

        # Check if room already has an active lease (submitted, not terminated, and within date range)
        existing_lease_result = await db.execute(
            select(Lease)
            .where(
                and_(
                    Lease.room_id == lease_data.room_id,
                    ~Lease.submitted_at.is_(None),
                    Lease.terminated_at.is_(None),
                    Lease.start_date <= func.current_date(),
                    Lease.end_date >= func.current_date(),
                    Lease.deleted_at.is_(None)
                )
            )
            .options(selectinload(Lease.tenants).selectinload(LeaseTenant.tenant))
        )
        existing_lease = existing_lease_result.scalar_one_or_none()
        if existing_lease:
            # Get primary tenant
            primary_tenant_relation = next((lt for lt in existing_lease.tenants if lt.tenant_role == 'primary'), None)
            if primary_tenant_relation:
                existing_tenant = primary_tenant_relation.tenant
                existing_tenant_name = f"{existing_tenant.first_name} {existing_tenant.last_name}"
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"Room {lease_data.room_id} already has an active lease (lease_id: {existing_lease.id}). "
                           f"Current tenant: {existing_tenant_name} (ID: {existing_tenant.id}). "
                           f"{tenant_info}"
                )
            else:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"Room {lease_data.room_id} already has an active lease (lease_id: {existing_lease.id}). "
                           f"{tenant_info}"
                )

        # Validate dates
        if lease_data.end_date <= lease_data.start_date:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"end_date must be after start_date. {tenant_info}"
            )

        # Convert assets to JSONB format
        # If assets is empty or None, set to None (SQL NULL)
        # Otherwise, convert to list of dicts
        assets_jsonb = None
        if lease_data.assets and len(lease_data.assets) > 0:
            assets_jsonb = [
                {"type": asset.type, "quantity": asset.quantity}
                for asset in lease_data.assets
            ]

        # Create new lease (status is now computed, no need to set it)
        new_lease = Lease(
            room_id=lease_data.room_id,
            start_date=lease_data.start_date,
            end_date=lease_data.end_date,
            monthly_rent=lease_data.monthly_rent,
            deposit=lease_data.deposit,
            pay_rent_on=lease_data.pay_rent_on,
            payment_term=lease_data.payment_term,
            vehicle_plate=lease_data.vehicle_plate,
            assets=assets_jsonb,
            created_by=created_by,
        )

        db.add(new_lease)
        await db.flush()  # Flush to get the lease ID

        # Create lease_tenant relationship (primary tenant)
        lease_tenant = LeaseTenant(
            lease_id=new_lease.id,
            tenant_id=tenant.id,
            tenant_role="primary",
            joined_at=lease_data.start_date,
        )
        db.add(lease_tenant)

        await db.commit()
        await db.refresh(new_lease)

        # Load relationships for response (assets is a JSONB column, not a relationship)
        await db.refresh(new_lease, ["tenants", "room"])
        return new_lease

    @staticmethod
    async def renew_lease(
        db: AsyncSession,
        lease_id: int,
        renew_data: LeaseRenew,
        updated_by: Optional[int] = None
    ) -> Lease:
        """
        Renew an existing lease contract.
        
        Business rules:
        - Lease must exist and be active
        - New end date must be after current end date
        - Optionally update rent, deposit, payment terms
        """
        # Get the lease with relationships
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(
                selectinload(Lease.tenants).selectinload(LeaseTenant.tenant)
            )
        )
        lease = result.scalar_one_or_none()

        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )

        # Get primary tenant for info messages
        primary_tenant_relation = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
        if primary_tenant_relation:
            tenant = primary_tenant_relation.tenant
            tenant_name = f"{tenant.first_name} {tenant.last_name}"
            tenant_info = f"Tenant: {tenant_name} (ID: {tenant.id})"
        else:
            tenant_info = f"Lease ID: {lease_id}"

        # Check if lease is active
        current_status = determine_lease_status(lease)
        if current_status != 'active':
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot renew lease with status '{current_status}'. Only active leases can be renewed. {tenant_info}"
            )

        # Validate new end date
        if renew_data.new_end_date <= lease.end_date:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"new_end_date ({renew_data.new_end_date}) must be after current end_date ({lease.end_date}). {tenant_info}"
            )

        # Update lease fields
        lease.end_date = renew_data.new_end_date
        if renew_data.new_monthly_rent is not None:
            lease.monthly_rent = renew_data.new_monthly_rent
        if renew_data.new_deposit is not None:
            lease.deposit = renew_data.new_deposit
        if renew_data.new_pay_rent_on is not None:
            lease.pay_rent_on = renew_data.new_pay_rent_on
        if renew_data.new_payment_term is not None:
            lease.payment_term = renew_data.new_payment_term
        if renew_data.new_vehicle_plate is not None:
            lease.vehicle_plate = renew_data.new_vehicle_plate
        lease.updated_by = updated_by

        await db.commit()
        await db.refresh(lease)
        return lease

    @staticmethod
    async def terminate_lease(
        db: AsyncSession,
        lease_id: int,
        terminate_data: LeaseTerminate,
        updated_by: Optional[int] = None
    ) -> Lease:
        """
        Terminate an existing lease contract.
        
        Business rules:
        - Lease must exist and be active
        - Termination date should be between start_date and end_date (or after end_date for expired leases)
        - Sets status to '終止' and records terminated_at
        - If meter_reading is provided, calculates prorated electricity bill and creates payment record
        """
        # Get the lease with room relationship
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(
                selectinload(Lease.tenants).selectinload(LeaseTenant.tenant),
                selectinload(Lease.room)
            )
        )
        lease = result.scalar_one_or_none()

        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )

        # Get primary tenant for info messages
        primary_tenant_relation = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
        if primary_tenant_relation:
            tenant = primary_tenant_relation.tenant
            tenant_name = f"{tenant.first_name} {tenant.last_name}"
            tenant_info = f"Tenant: {tenant_name} (ID: {tenant.id})"
        else:
            tenant_info = f"Lease ID: {lease_id}"

        # Check if lease can be terminated (must be active or pending)
        current_status = determine_lease_status(lease)
        if current_status not in ("active", "pending"):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot terminate lease with status '{current_status}'. Only active or pending leases can be terminated. {tenant_info}"
            )

        # Validate termination date
        if terminate_data.termination_date < lease.start_date:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"termination_date ({terminate_data.termination_date}) cannot be before lease start_date ({lease.start_date}). {tenant_info}"
            )

        # Handle electricity bill calculation if meter reading is provided
        if terminate_data.meter_reading is not None:
            # Determine reading date (defaults to termination_date)
            reading_date = terminate_data.meter_reading_date or terminate_data.termination_date

            # Create meter reading
            await ElectricityService.create_meter_reading(
                db=db,
                room_id=lease.room_id,
                read_date=reading_date,
                read_amount=Decimal(str(terminate_data.meter_reading)),
                created_by=updated_by
            )

            # Calculate electricity bill
            try:
                _, payment_data = await ElectricityService.calculate_electricity_bill(
                    db=db,
                    room_id=lease.room_id,
                    current_reading=Decimal(str(terminate_data.meter_reading)),
                    reading_date=reading_date,
                    period_start=lease.start_date,  # Use lease start as period start
                    created_by=updated_by
                )

                # Create invoice record
                invoice = Invoice(
                    lease_id=lease.id,
                    category=payment_data["category"],
                    period_start=payment_data["period_start"],
                    period_end=payment_data["period_end"],
                    due_date=payment_data.get("due_date", payment_data["period_end"]),  # Default due_date to period_end if not provided
                    due_amount=payment_data["due_amount"],
                    paid_amount=payment_data["paid_amount"],
                    status=payment_data["status"],
                    created_by=payment_data["created_by"],
                )
                db.add(invoice)
            except HTTPException:
                # Re-raise HTTP exceptions (they already have proper error messages)
                raise
            except Exception as e:
                # Wrap other exceptions with proper chaining
                raise HTTPException(
                    status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error calculating electricity bill: {str(e)}. {tenant_info}"
                ) from e

        # Cancel all future invoices (invoices with period_start > termination_date)
        future_invoices = await db.execute(
            select(Invoice).where(
                and_(
                    Invoice.lease_id == lease.id,
                    Invoice.period_start > terminate_data.termination_date,
                    Invoice.deleted_at.is_(None)
                )
            )
        )
        for invoice in future_invoices.scalars().all():
            invoice.payment_status = "canceled"
            invoice.updated_by = updated_by
        
        # Update lease: set terminated_at and termination_reason
        lease.terminated_at = terminate_data.termination_date
        lease.termination_reason = terminate_data.reason
        lease.updated_by = updated_by

        await db.commit()
        await db.refresh(lease)
        return lease

    @staticmethod
    async def update_lease(
        db: AsyncSession,
        lease_id: int,
        lease_data: dict,
        updated_by: Optional[int] = None
    ) -> Lease:
        """
        Update a draft or pending lease.
        
        Business rules:
        - Lease must be editable (draft or pending, no invoices, no cashflows)
        - Only editable fields can be updated
        """
        # Get the lease
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(
                selectinload(Lease.tenants).selectinload(LeaseTenant.tenant),
                selectinload(Lease.room)
            )
        )
        lease = result.scalar_one_or_none()
        
        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )
        
        # Assert lease is editable
        await assert_lease_editable(db, lease)
        
        # Update allowed fields
        allowed_fields = {
            "start_date", "end_date", "monthly_rent", "deposit",
            "pay_rent_on", "payment_term", "vehicle_plate", "assets"
        }
        
        for field, value in lease_data.items():
            if field in allowed_fields:
                setattr(lease, field, value)
        
        lease.updated_by = updated_by
        await db.commit()
        await db.refresh(lease)
        return lease

    @staticmethod
    async def submit_lease(
        db: AsyncSession,
        lease_id: int,
        submitted_by: Optional[int] = None
    ) -> Lease:
        """
        Submit a draft lease (moves it to pending status).
        
        Submission semantics:
        - The lease is finalized by the property manager
        - The lease becomes non-editable (except via amendment later)
        - The lease is awaiting activation based on start_date
        
        Submission is represented by setting lease.submitted_at = current_timestamp.
        
        Submission MUST NOT:
        - change start_date or end_date
        - generate invoices
        - activate the lease
        
        Allowed submission conditions:
        - lease.submitted_at IS NULL
        - derived status == draft
        - no invoices exist
        - no cashflows exist
        
        Raises domain-level errors if any condition fails.
        """
        # Get the lease
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(
                selectinload(Lease.tenants).selectinload(LeaseTenant.tenant),
                selectinload(Lease.room)
            )
        )
        lease = result.scalar_one_or_none()
        
        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )
        
        # Get primary tenant for info messages
        primary_tenant_relation = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
        if primary_tenant_relation:
            tenant = primary_tenant_relation.tenant
            tenant_name = f"{tenant.first_name} {tenant.last_name}"
            tenant_info = f"Tenant: {tenant_name} (ID: {tenant.id})"
        else:
            tenant_info = f"Lease ID: {lease_id}"
        
        # Check 1: submitted_at must be NULL (idempotency check)
        if lease.submitted_at is not None:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Cannot submit lease: lease has already been submitted (submitted_at: {lease.submitted_at}). "
                       f"Submission is idempotent-safe and cannot be repeated. {tenant_info}"
            )
        
        # Check 2: status must be draft
        current_status = determine_lease_status(lease)
        if current_status != "draft":
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot submit lease with status '{current_status}'. Only draft leases can be submitted. {tenant_info}"
            )
        
        # Check 3: no invoices must exist
        invoice_count = await db.execute(
            select(func.count(Invoice.id)).where(
                and_(
                    Invoice.lease_id == lease.id,
                    Invoice.deleted_at.is_(None)
                )
            )
        )
        invoice_count = invoice_count.scalar() or 0
        
        if invoice_count > 0:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot submit lease: {invoice_count} invoice(s) exist for this lease. "
                       f"Leases with invoices cannot be submitted. {tenant_info}"
            )
        
        # Check 4: no cashflows must exist
        cashflow_count = await db.execute(
            select(func.count(CashFlow.id)).where(
                and_(
                    CashFlow.lease_id == lease.id,
                    CashFlow.deleted_at.is_(None)
                )
            )
        )
        cashflow_count = cashflow_count.scalar() or 0
        
        if cashflow_count > 0:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot submit lease: {cashflow_count} cashflow(s) exist for this lease. "
                       f"Leases with cashflows cannot be submitted. {tenant_info}"
            )
        
        # All conditions met - submit the lease
        lease.submitted_at = datetime.now()
        lease.updated_by = submitted_by
        await db.commit()
        await db.refresh(lease)
        return lease

    @staticmethod
    async def create_amendment(
        db: AsyncSession,
        lease_id: int,
        effective_date: date,
        old_rent: Optional[Decimal],
        new_rent: Optional[Decimal],
        reason: str,
        created_by: Optional[int] = None
    ) -> LeaseAmendment:
        """
        Create a lease amendment for an active lease.
        
        Business rules:
        - Lease status MUST be active
        - amendment.effective_date MUST be in the future
        - Records old_rent and new_rent
        """
        # Get the lease
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(selectinload(Lease.room))
        )
        lease = result.scalar_one_or_none()
        
        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )
        
        # Check lease status is active
        current_status = determine_lease_status(lease)
        if current_status != "active":
            raise LeaseAmendmentError(
                f"Cannot create amendment for lease with status '{current_status}'. Only active leases can be amended."
            )
        
        # Validate effective_date is in the future
        today = date.today()
        if effective_date <= today:
            raise LeaseAmendmentError(
                f"Amendment effective_date ({effective_date}) must be in the future."
            )
        
        # Validate rent values
        if old_rent is None or new_rent is None:
            raise LeaseAmendmentError(
                "Both old_rent and new_rent must be provided for rent change amendments."
            )
        
        # Create amendment
        amendment = LeaseAmendment(
            lease_id=lease_id,
            amendment_type="rent_change",
            effective_date=effective_date,
            old_monthly_rent=old_rent,
            new_monthly_rent=new_rent,
            reason=reason,
            created_by=created_by
        )
        
        db.add(amendment)
        await db.commit()
        await db.refresh(amendment)
        return amendment

    @staticmethod
    async def get_lease(
        db: AsyncSession,
        lease_id: int
    ) -> Optional[Lease]:
        """Get a lease by ID with all relationships"""
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(
                selectinload(Lease.tenants).selectinload(LeaseTenant.tenant),
                selectinload(Lease.room)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_leases(
        db: AsyncSession,
        tenant_id: Optional[int] = None,
        room_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[Lease]:
        """List leases with optional filters"""
        query = select(Lease).options(
            selectinload(Lease.tenants).selectinload(LeaseTenant.tenant),
            selectinload(Lease.room)
        )

        conditions = []
        if tenant_id:
            # Filter by tenant through lease_tenant relationship
            query = query.join(LeaseTenant).where(LeaseTenant.tenant_id == tenant_id)
        if room_id:
            conditions.append(Lease.room_id == room_id)
        # Note: status filtering is done in Python after fetching since status is computed

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(Lease.created_at.desc())

        result = await db.execute(query)
        leases = list(result.scalars().all())
        
        # Filter by status if provided (status is computed, so filter in Python)
        if status:
            leases = [l for l in leases if determine_lease_status(l) == status]
        
        # Apply pagination after status filtering
        return leases[skip:skip + limit]

