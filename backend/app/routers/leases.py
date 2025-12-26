# app/routers/leases.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.db.session import get_db
from app.services.lease_service import LeaseService
from app.schemas.lease import (
    LeaseCreate,
    LeaseRenew,
    LeaseTerminate,
    LeaseResponse,
)

router = APIRouter(prefix="/leases", tags=["Leases"])


@router.post("/", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    lease_data: LeaseCreate,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication to get current user ID
    # current_user: User = Depends(get_current_user)
):
    """
    Create a new lease contract.
    
    This endpoint creates a new active lease for a tenant and room.
    The room must not already have an active lease.
    """
    lease = await LeaseService.create_lease(db, lease_data)
    # Extract primary tenant_id for backward compatibility
    primary_tenant = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
    lease_dict = LeaseResponse.model_validate(lease).model_dump()
    if primary_tenant:
        lease_dict['tenant_id'] = primary_tenant.tenant_id
    return LeaseResponse(**lease_dict)


@router.post("/{lease_id}/renew", response_model=LeaseResponse)
async def renew_lease(
    lease_id: int,
    renew_data: LeaseRenew,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication
    # current_user: User = Depends(get_current_user)
):
    """
    Renew an existing lease contract.
    
    This endpoint extends the lease end date and optionally updates
    rent, deposit, or payment terms. Only active leases can be renewed.
    """
    lease = await LeaseService.renew_lease(db, lease_id, renew_data)
    # Extract primary tenant_id for backward compatibility
    primary_tenant = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
    lease_dict = LeaseResponse.model_validate(lease).model_dump()
    if primary_tenant:
        lease_dict['tenant_id'] = primary_tenant.tenant_id
    return LeaseResponse(**lease_dict)


@router.post("/{lease_id}/terminate", response_model=LeaseResponse)
async def terminate_lease(
    lease_id: int,
    terminate_data: LeaseTerminate,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication
    # current_user: User = Depends(get_current_user)
):
    """
    Terminate an existing lease contract.
    
    This endpoint marks a lease as terminated and records the termination date.
    Only active leases can be terminated.
    """
    lease = await LeaseService.terminate_lease(db, lease_id, terminate_data)
    # Extract primary tenant_id for backward compatibility
    primary_tenant = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
    lease_dict = LeaseResponse.model_validate(lease).model_dump()
    if primary_tenant:
        lease_dict['tenant_id'] = primary_tenant.tenant_id
    return LeaseResponse(**lease_dict)


@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a lease by ID.
    """
    lease = await LeaseService.get_lease(db, lease_id)
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )
    # Extract primary tenant_id for backward compatibility
    primary_tenant = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
    lease_dict = LeaseResponse.model_validate(lease).model_dump()
    if primary_tenant:
        lease_dict['tenant_id'] = primary_tenant.tenant_id
    return LeaseResponse(**lease_dict)


@router.get("/", response_model=List[LeaseResponse])
async def list_leases(
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    room_id: Optional[int] = Query(None, description="Filter by room ID"),
    status: Optional[str] = Query(None, description="Filter by status (active, terminated, expired)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    List leases with optional filters.
    
    You can filter by tenant_id, room_id, or status.
    """
    leases = await LeaseService.list_leases(
        db, tenant_id=tenant_id, room_id=room_id, status=status, skip=skip, limit=limit
    )
    result = []
    for lease in leases:
        # Extract primary tenant_id for backward compatibility
        primary_tenant = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
        lease_dict = LeaseResponse.model_validate(lease).model_dump()
        if primary_tenant:
            lease_dict['tenant_id'] = primary_tenant.tenant_id
        result.append(LeaseResponse(**lease_dict))
    return result

