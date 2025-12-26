# app/routers/tenants.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.lease import Lease, LeaseTenant
from app.schemas.tenant import TenantCreate

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/", response_model=List[dict])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """List all tenants"""
    result = await db.execute(
        select(Tenant)
        .order_by(Tenant.last_name, Tenant.first_name)
        .offset(skip)
        .limit(limit)
    )
    tenants = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "first_name": t.first_name,
            "last_name": t.last_name,
            "name": f"{t.first_name} {t.last_name}",
            "gender": t.gender,
            "birthday": str(t.birthday),
            "personal_id": t.personal_id,
            "idNumber": t.personal_id,
            "phone": t.phone,
            "phoneNumber": t.phone,
            "email": t.email,
            "line_id": t.line_id,
            "address": t.address,
            "homeAddress": t.address,
        }
        for t in tenants
    ]


@router.get("/{tenant_id}", response_model=dict)
async def get_tenant(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Get a tenant by ID with active lease"""
    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant_id)
        .options(
            selectinload(Tenant.lease_tenants).selectinload(LeaseTenant.lease).selectinload(Lease.room),
            selectinload(Tenant.emergency_contacts)
        )
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )
    
    # Get active lease through lease_tenants relationship
    active_lease = None
    for lt in tenant.lease_tenants:
        if lt.lease.status == "有效" and (lt.lease.deleted_at is None):
            active_lease = lt.lease
            break
    
    return {
        "id": tenant.id,
        "first_name": tenant.first_name,
        "last_name": tenant.last_name,
        "name": f"{tenant.first_name} {tenant.last_name}",
        "gender": tenant.gender,
        "birthday": str(tenant.birthday),
        "personal_id": tenant.personal_id,
        "idNumber": tenant.personal_id,
        "phone": tenant.phone,
        "phoneNumber": tenant.phone,
        "email": tenant.email,
        "line_id": tenant.line_id,
        "address": tenant.address,
        "homeAddress": tenant.address,
        "active_lease": {
            "id": active_lease.id,
            "start_date": str(active_lease.start_date),
            "end_date": str(active_lease.end_date),
            "monthly_rent": float(active_lease.monthly_rent),
            "deposit": float(active_lease.deposit),
            "status": active_lease.status,
            "room": {
                "id": active_lease.room.id,
                "floor_no": active_lease.room.floor_no,
                "room_no": active_lease.room.room_no,
                "roomNumber": f"{active_lease.room.floor_no}{active_lease.room.room_no}",
            } if active_lease.room else None,
        } if active_lease else None,
        "emergency_contacts": [
            {
                "id": ec.id,
                "first_name": ec.first_name,
                "last_name": ec.last_name,
                "relationship": ec.relationship,
                "phone": ec.phone,
            }
            for ec in tenant.emergency_contacts
        ],
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant"""
    from app.services.tenant_service import TenantService
    
    tenant = await TenantService.create_or_update_tenant(db, tenant_data)
    
    return {
        "id": tenant.id,
        "first_name": tenant.first_name,
        "last_name": tenant.last_name,
        "name": f"{tenant.first_name} {tenant.last_name}",
        "personal_id": tenant.personal_id,
        "phone": tenant.phone,
        "email": tenant.email,
        "address": tenant.address,
    }


@router.put("/{tenant_id}", response_model=dict)
async def update_tenant(
    tenant_id: int,
    tenant_data: TenantCreate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing tenant"""
    from app.services.tenant_service import TenantService
    
    # Update tenant using the service method with tenant_id
    updated_tenant = await TenantService.create_or_update_tenant(
        db, 
        tenant_data, 
        tenant_id=tenant_id,
        created_by=None  # TODO: Get from auth context when auth is implemented
    )
    
    # Reload with relationships
    await db.refresh(updated_tenant, ["emergency_contacts"])
    
    return {
        "id": updated_tenant.id,
        "first_name": updated_tenant.first_name,
        "last_name": updated_tenant.last_name,
        "name": f"{updated_tenant.first_name} {updated_tenant.last_name}",
        "personal_id": updated_tenant.personal_id,
        "phone": updated_tenant.phone,
        "email": updated_tenant.email,
        "address": updated_tenant.address,
        "emergency_contacts": [
            {
                "id": ec.id,
                "first_name": ec.first_name,
                "last_name": ec.last_name,
                "relationship": ec.relationship,
                "phone": ec.phone,
            }
            for ec in updated_tenant.emergency_contacts
        ],
    }

