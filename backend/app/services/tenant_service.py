# app/services/tenant_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from sqlalchemy.orm import selectinload
from typing import Optional

from app.models.tenant import Tenant, TenantEmergencyContact
from app.schemas.tenant import TenantCreate
from fastapi import HTTPException, status as http_status


class TenantService:
    """Service for managing tenant operations"""

    @staticmethod
    async def create_or_update_tenant(
        db: AsyncSession,
        tenant_data: TenantCreate,
        tenant_id: Optional[int] = None,
        created_by: Optional[int] = None
    ) -> Tenant:
        """
        Create or update tenant information.
        
        If tenant_id is provided, update existing tenant.
        If tenant_id is not provided, find tenant by tenant name or create new one.
        
        Args:
            db: Database session
            tenant_data: Tenant data to create or update
            tenant_id: Optional ID of existing tenant to update
            created_by: Optional user ID who is creating/updating the tenant
            
        Returns:
            Tenant: Created or updated tenant instance
            
        Raises:
            HTTPException: If tenant_id is provided but tenant not found
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
            # Find tenant by tenant name or create new
            result = await db.execute(
                select(Tenant)
                .where(
                    and_(
                        Tenant.first_name == tenant_data.first_name,
                        Tenant.last_name == tenant_data.last_name
                    )
                )
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
        # Only update personal_id if it's different to avoid UNIQUE constraint violations
        if tenant.personal_id != tenant_data.personal_id:
            # Check if the new personal_id already exists
            existing_tenant = await db.execute(
                select(Tenant).where(
                    and_(
                        Tenant.personal_id == tenant_data.personal_id,
                        Tenant.id != tenant.id
                    )
                )
            )
            if existing_tenant.scalar_one_or_none():
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f"Personal ID {tenant_data.personal_id} already exists for another tenant"
                )
        
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

