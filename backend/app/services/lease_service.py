# app/services/lease_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from sqlalchemy.orm import selectinload
from typing import Optional

from app.models.lease import Lease, LeaseAsset
from app.models.room import Room
from app.models.tenant import Tenant, TenantEmergencyContact
from app.models.payment import Payment
from app.schemas.lease import LeaseCreate, LeaseRenew, LeaseTerminate
from app.services.electricity_service import ElectricityService
from fastapi import HTTPException, status as http_status
from decimal import Decimal


class LeaseService:
    """Service for managing lease contracts"""

    @staticmethod
    async def _create_or_update_tenant(
        db: AsyncSession,
        tenant_data,
        tenant_id: Optional[int] = None,
        created_by: Optional[int] = None
    ) -> Tenant:
        """
        Create or update tenant information.
        
        If tenant_id is provided, update existing tenant.
        If tenant_id is not provided, find tenant by personal_id or create new one.
        """
        tenant = None
        
        if tenant_id:
            # Update existing tenant by ID
            result = await db.execute(
                select(Tenant)
                .where(Tenant.id == tenant_id)
                .options(selectinload(Tenant.emergency_contacts))
            )
            tenant = result.scalar_one_or_none()
            if not tenant:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail=f"Tenant with id {tenant_id} not found"
                )
        else:
            # Find tenant by personal_id or create new
            result = await db.execute(
                select(Tenant)
                .where(Tenant.personal_id == tenant_data.personal_id)
                .options(selectinload(Tenant.emergency_contacts))
            )
            tenant = result.scalar_one_or_none()
            
            if not tenant:
                # Create new tenant
                tenant = Tenant(
                    first_name=tenant_data.first_name,
                    last_name=tenant_data.last_name,
                    gender=tenant_data.gender,
                    birthday=tenant_data.birthday,
                    personal_id=tenant_data.personal_id,
                    phone=tenant_data.phone,
                    email=tenant_data.email,
                    line_id=tenant_data.line_id,
                    address=tenant_data.address,
                    created_by=created_by,
                )
                db.add(tenant)
                await db.flush()
        
        # Update tenant fields
        tenant.first_name = tenant_data.first_name
        tenant.last_name = tenant_data.last_name
        tenant.gender = tenant_data.gender
        tenant.birthday = tenant_data.birthday
        tenant.personal_id = tenant_data.personal_id
        tenant.phone = tenant_data.phone
        tenant.email = tenant_data.email
        tenant.line_id = tenant_data.line_id
        tenant.address = tenant_data.address
        tenant.updated_by = created_by
        
        # Handle emergency contacts: delete existing and create new ones
        # Delete all existing emergency contacts for this tenant
        await db.execute(
            delete(TenantEmergencyContact).where(
                TenantEmergencyContact.tenant_id == tenant.id
            )
        )
        
        # Create new emergency contacts
        if tenant_data.emergency_contacts:
            for contact_data in tenant_data.emergency_contacts:
                contact = TenantEmergencyContact(
                    tenant_id=tenant.id,
                    first_name=contact_data.first_name,
                    last_name=contact_data.last_name,
                    relationship=contact_data.relationship,
                    phone=contact_data.phone,
                )
                db.add(contact)
        
        await db.flush()
        return tenant

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
                tenant = await LeaseService._create_or_update_tenant(
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
            tenant = await LeaseService._create_or_update_tenant(
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

        # Check if room already has an active lease
        existing_lease_result = await db.execute(
            select(Lease)
            .where(
                and_(
                    Lease.room_id == lease_data.room_id,
                    Lease.status == "active"
                )
            )
            .options(selectinload(Lease.tenant))
        )
        existing_lease = existing_lease_result.scalar_one_or_none()
        if existing_lease:
            existing_tenant_name = f"{existing_lease.tenant.first_name} {existing_lease.tenant.last_name}"
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Room {lease_data.room_id} already has an active lease (lease_id: {existing_lease.id}). "
                       f"Current tenant: {existing_tenant_name} (ID: {existing_lease.tenant.id}). "
                       f"{tenant_info}"
            )

        # Validate dates
        if lease_data.end_date <= lease_data.start_date:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"end_date must be after start_date. {tenant_info}"
            )

        # Create new lease
        new_lease = Lease(
            tenant_id=tenant.id,
            room_id=lease_data.room_id,
            start_date=lease_data.start_date,
            end_date=lease_data.end_date,
            monthly_rent=lease_data.monthly_rent,
            deposit=lease_data.deposit,
            pay_rent_on=lease_data.pay_rent_on,
            payment_term=lease_data.payment_term,
            status="active",
            created_by=created_by,
        )

        db.add(new_lease)
        await db.flush()  # Flush to get the lease ID

        # Create lease assets if provided
        if lease_data.assets:
            for asset_data in lease_data.assets:
                asset = LeaseAsset(
                    lease_id=new_lease.id,
                    asset_type=asset_data.asset_type,
                    quantity=asset_data.quantity,
                )
                db.add(asset)

        await db.commit()
        await db.refresh(new_lease)

        # Load relationships for response
        await db.refresh(new_lease, ["assets", "tenant", "room"])
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
                selectinload(Lease.assets),
                selectinload(Lease.tenant)
            )
        )
        lease = result.scalar_one_or_none()

        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )

        tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}"
        tenant_info = f"Tenant: {tenant_name} (ID: {lease.tenant.id})"

        if lease.status != "active":
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot renew lease with status '{lease.status}'. Only active leases can be renewed. {tenant_info}"
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
        - Sets status to 'terminated' and records early_termination_date
        - If meter_reading is provided, calculates prorated electricity bill and creates payment record
        """
        # Get the lease with room relationship
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(
                selectinload(Lease.assets),
                selectinload(Lease.tenant),
                selectinload(Lease.room)
            )
        )
        lease = result.scalar_one_or_none()

        if not lease:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )

        tenant_name = f"{lease.tenant.first_name} {lease.tenant.last_name}"
        tenant_info = f"Tenant: {tenant_name} (ID: {lease.tenant.id})"

        if lease.status != "active":
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot terminate lease with status '{lease.status}'. Only active leases can be terminated. {tenant_info}"
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

                # Create payment record
                payment = Payment(
                    lease_id=lease.id,
                    category=payment_data["category"],
                    period_start=payment_data["period_start"],
                    period_end=payment_data["period_end"],
                    due_amount=payment_data["due_amount"],
                    paid_amount=payment_data["paid_amount"],
                    status=payment_data["status"],
                    created_by=payment_data["created_by"],
                )
                db.add(payment)
            except HTTPException:
                # Re-raise HTTP exceptions (they already have proper error messages)
                raise
            except Exception as e:
                # Wrap other exceptions with proper chaining
                raise HTTPException(
                    status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error calculating electricity bill: {str(e)}. {tenant_info}"
                ) from e

        # Update lease status
        lease.status = "terminated"
        lease.early_termination_date = terminate_data.termination_date
        lease.updated_by = updated_by

        await db.commit()
        await db.refresh(lease)
        return lease

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
                selectinload(Lease.assets),
                selectinload(Lease.tenant),
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
            selectinload(Lease.assets),
            selectinload(Lease.tenant),
            selectinload(Lease.room)
        )

        conditions = []
        if tenant_id:
            conditions.append(Lease.tenant_id == tenant_id)
        if room_id:
            conditions.append(Lease.room_id == room_id)
        if status:
            conditions.append(Lease.status == status)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.offset(skip).limit(limit).order_by(Lease.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

