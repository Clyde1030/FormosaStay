# app/routers/leases.py
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date, timedelta

from app.db.session import get_db
from app.services.lease_service import LeaseService, determine_lease_status
from app.schemas.lease import (
    LeaseCreate,
    LeaseUpdate,
    LeaseRenew,
    LeaseTerminate,
    LeaseAmend,
    LeaseResponse,
    LeaseAmendmentResponse,
    ProrationCalculationRequest,
    ProrationCalculationResponse,
)
from app.models.lease import Lease

router = APIRouter(prefix="/leases", tags=["Leases"])


def build_lease_response(lease: Lease) -> LeaseResponse:
    """Helper function to build lease response from model"""
    # Extract primary tenant_id for backward compatibility
    primary_tenant = next((lt for lt in lease.tenants if lt.tenant_role == 'primary'), None)
    
    # Recalculate status on read
    current_status = determine_lease_status(lease)
    
    # Build lease dict
    lease_dict = {
        'id': lease.id,
        'room_id': lease.room_id,
        'start_date': lease.start_date,
        'end_date': lease.end_date,
        'terminated_at': lease.terminated_at,
        'termination_reason': lease.termination_reason,
        'submitted_at': lease.submitted_at.isoformat() if lease.submitted_at else None,
        'monthly_rent': lease.monthly_rent,
        'deposit': lease.deposit,
        'pay_rent_on': lease.pay_rent_on,
        'payment_term': lease.payment_term,
        'status': current_status,
        'vehicle_plate': lease.vehicle_plate,
        'assets': lease.assets,
        'tenants': [
            {
                'tenant_id': lt.tenant_id,
                'tenant_role': lt.tenant_role,
                'joined_at': lt.joined_at
            }
            for lt in lease.tenants
        ],
        'tenant_id': primary_tenant.tenant_id if primary_tenant else None,
        'created_at': lease.created_at.isoformat() if lease.created_at else None,
        'updated_at': lease.updated_at.isoformat() if lease.updated_at else None,
    }
    return LeaseResponse(**lease_dict)

@router.get("/", response_model=List[LeaseResponse])
async def list_leases(
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    room_id: Optional[int] = Query(None, description="Filter by room ID"),
    status: Optional[str] = Query(None, description="Filter by status (draft, pending, active, expired, terminated)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    List leases with optional filters.
    
    You can filter by tenant_id, room_id, or status.
    Status is recalculated on read from facts.
    """
    leases = await LeaseService.list_leases(
        db, tenant_id=tenant_id, room_id=room_id, status=status, skip=skip, limit=limit
    )
    return [build_lease_response(lease) for lease in leases]

@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a lease by ID.
    Status is recalculated on read from facts.
    """
    lease = await LeaseService.get_lease(db, lease_id)
    if not lease:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )
    return build_lease_response(lease)
@router.post("/", response_model=LeaseResponse, status_code=http_status.HTTP_201_CREATED)
async def create_lease(
    lease_data: LeaseCreate,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication to get current user ID
    # current_user: User = Depends(get_current_user)
):
    """
    Create a new lease contract.
    
    Creates a draft lease (status will be 'draft' until submitted).
    The room must not already have an active lease.
    """
    lease = await LeaseService.create_lease(db, lease_data)
    return build_lease_response(lease)


@router.put("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: int,
    lease_data: LeaseUpdate,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication
    # current_user: User = Depends(get_current_user)
):
    """
    Update a lease contract.
    
    Tenant information (tenant_data) can be updated at any time, regardless of lease status.
    Lease fields (start_date, end_date, monthly_rent, etc.) can only be updated when the lease is editable (draft status, no invoices, no cashflows).
    All business logic is handled in the service layer.
    """
    # Convert Pydantic model to dict, excluding None values
    update_dict = lease_data.model_dump(exclude_unset=True)
    
    # Convert assets if provided
    if 'assets' in update_dict and update_dict['assets'] is not None:
        update_dict['assets'] = [
            {"type": asset.type, "quantity": asset.quantity}
            for asset in lease_data.assets
        ]
    
    lease = await LeaseService.update_lease(db, lease_id, update_dict)
    return build_lease_response(lease)


@router.post("/{lease_id}/submit", response_model=LeaseResponse)
async def submit_lease(
    lease_id: int,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication
    # current_user: User = Depends(get_current_user)
):
    """
    Submit a draft lease (explicit state transition).
    
    This endpoint transitions a lease from DRAFT to PENDING using an explicit action.
    It does NOT accept a request body.
    
    Submission semantics:
    - The lease is finalized by the property manager
    - The lease becomes non-editable (except via amendment later)
    - The lease is awaiting activation based on start_date
    
    Submission is represented by setting lease.submitted_at = current_timestamp.
    
    Submission MUST NOT:
    - change start_date or end_date
    - generate invoices
    - activate the lease
    
    Returns:
    - 200: Lease successfully submitted
    - 404: Lease not found
    - 409: Lease already submitted (idempotency)
    - 422: Invalid submission conditions (not draft, has invoices/cashflows)
    """
    # TODO: Get submitted_by from current_user when authentication is added
    submitted_by = None
    lease = await LeaseService.submit_lease(db, lease_id, submitted_by=submitted_by)
    return build_lease_response(lease)


@router.post("/{lease_id}/amend", response_model=LeaseAmendmentResponse)
async def amend_lease(
    lease_id: int,
    amend_data: LeaseAmend,
    db: AsyncSession = Depends(get_db),
    # TODO: Add authentication
    # current_user: User = Depends(get_current_user)
):
    """
    Create a lease amendment for an active lease.
    
    Active leases cannot be edited directly. Changes to rent, dates, or terms
    must be done via amendments. Only active leases can be amended.
    """
    amendment = await LeaseService.create_amendment(
        db,
        lease_id,
        amend_data.effective_date,
        amend_data.old_rent,
        amend_data.new_rent,
        amend_data.reason
    )
    return LeaseAmendmentResponse(
        id=amendment.id,
        lease_id=amendment.lease_id,
        amendment_type=amendment.amendment_type,
        effective_date=amendment.effective_date,
        old_monthly_rent=amendment.old_monthly_rent,
        new_monthly_rent=amendment.new_monthly_rent,
        reason=amendment.reason,
        created_at=amendment.created_at.isoformat() if amendment.created_at else None
    )


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
    All business logic is handled in the service layer.
    """
    lease = await LeaseService.renew_lease(db, lease_id, renew_data)
    return build_lease_response(lease)


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
    Only active or pending leases can be terminated.
    Cancels all future invoices and optionally generates a final prorated invoice.
    All business logic is handled in the service layer.
    """
    lease = await LeaseService.terminate_lease(db, lease_id, terminate_data)
    return build_lease_response(lease)


@router.post("/{lease_id}/calculate-proration", response_model=ProrationCalculationResponse)
async def calculate_proration(
    lease_id: int,
    request: ProrationCalculationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate prorated rent amount for a lease termination.
    
    This endpoint calculates the prorated rent based on the number of days
    used in the termination month. The calculation follows the formula:
    (days_used / days_in_month) * monthly_rent
    
    Business rules:
    - Proration is based on the termination date's day of month
    - Result is rounded to the nearest integer
    """
    # Get the lease
    lease = await LeaseService.get_lease(db, lease_id)
    if not lease:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )
    
    # Calculate proration
    prorated_amount = LeaseService.calculate_proration(
        monthly_rent=lease.monthly_rent,
        termination_date=request.termination_date
    )
    
    # Calculate days used and days in month for response
    if request.termination_date.month == 12:
        next_month = date(request.termination_date.year + 1, 1, 1)
    else:
        next_month = date(request.termination_date.year, request.termination_date.month + 1, 1)
    last_day_of_month = next_month - timedelta(days=1)
    days_in_month = last_day_of_month.day
    days_used = request.termination_date.day
    
    return ProrationCalculationResponse(
        prorated_amount=prorated_amount,
        monthly_rent=lease.monthly_rent,
        days_used=days_used,
        days_in_month=days_in_month
    )
