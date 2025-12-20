# app/services/lease_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import date
from decimal import Decimal
from typing import Optional

from app.models.lease import Lease, LeaseAsset
from app.models.room import Room
from app.models.tenant import Tenant
from app.schemas.lease import LeaseCreate, LeaseRenew, LeaseTerminate
from fastapi import HTTPException, status


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
        - Tenant must exist
        - Room must not have an active lease
        - End date must be after start date
        """
        # Verify room exists
        room_result = await db.execute(
            select(Room).where(Room.id == lease_data.room_id)
        )
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {lease_data.room_id} not found"
            )

        # Verify tenant exists
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.id == lease_data.tenant_id)
        )
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with id {lease_data.tenant_id} not found"
            )

        # Check if room already has an active lease
        existing_lease_result = await db.execute(
            select(Lease).where(
                and_(
                    Lease.room_id == lease_data.room_id,
                    Lease.status == "active"
                )
            )
        )
        existing_lease = existing_lease_result.scalar_one_or_none()
        if existing_lease:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room {lease_data.room_id} already has an active lease (lease_id: {existing_lease.id})"
            )

        # Validate dates
        if lease_data.end_date <= lease_data.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be after start_date"
            )

        # Create new lease
        new_lease = Lease(
            tenant_id=lease_data.tenant_id,
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
            .options(selectinload(Lease.assets))
        )
        lease = result.scalar_one_or_none()

        if not lease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )

        if lease.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot renew lease with status '{lease.status}'. Only active leases can be renewed."
            )

        # Validate new end date
        if renew_data.new_end_date <= lease.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"new_end_date ({renew_data.new_end_date}) must be after current end_date ({lease.end_date})"
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
        """
        # Get the lease
        result = await db.execute(
            select(Lease)
            .where(Lease.id == lease_id)
            .options(selectinload(Lease.assets))
        )
        lease = result.scalar_one_or_none()

        if not lease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )

        if lease.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot terminate lease with status '{lease.status}'. Only active leases can be terminated."
            )

        # Validate termination date
        if terminate_data.termination_date < lease.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"termination_date ({terminate_data.termination_date}) cannot be before lease start_date ({lease.start_date})"
            )

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

