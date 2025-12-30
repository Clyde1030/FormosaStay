# app/routers/tenants.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from typing import List
import json

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
    """List all tenants using v_tenant_complete view"""
    try:
        result = await db.execute(
            text("""
                SELECT * FROM v_tenant_complete 
                ORDER BY last_name, first_name
                LIMIT :limit OFFSET :offset
            """),
            {"limit": limit, "offset": skip}
        )
        rows = result.mappings().all()
        
        tenants = []
        for row in rows:
            tenant_dict = dict(row)
            # Parse JSONB fields
            if tenant_dict.get('emergency_contacts'):
                if isinstance(tenant_dict['emergency_contacts'], str):
                    tenant_dict['emergency_contacts'] = json.loads(tenant_dict['emergency_contacts'])
            else:
                tenant_dict['emergency_contacts'] = []
            
            if tenant_dict.get('lease_assets'):
                if isinstance(tenant_dict['lease_assets'], str):
                    tenant_dict['lease_assets'] = json.loads(tenant_dict['lease_assets'])
            
            # Format response
            tenants.append({
                "id": tenant_dict['tenant_id'],
                "first_name": tenant_dict['first_name'],
                "last_name": tenant_dict['last_name'],
                "name": tenant_dict['tenant_name'],
                "gender": tenant_dict['gender'],
                "birthday": str(tenant_dict['birthday']) if tenant_dict['birthday'] else None,
                "personal_id": tenant_dict['personal_id'],
                "idNumber": tenant_dict['personal_id'],
                "phone": tenant_dict['phone'],
                "phoneNumber": tenant_dict['phone'],
                "email": tenant_dict['email'],
                "line_id": tenant_dict['line_id'],
                "address": tenant_dict['tenant_address'],
                "emergency_contacts": tenant_dict['emergency_contacts'],
                "active_lease": {
                    "id": tenant_dict['lease_id'],
                    "start_date": str(tenant_dict['lease_start_date']) if tenant_dict['lease_start_date'] else None,
                    "end_date": str(tenant_dict['terminated_at']) if tenant_dict.get('terminated_at') else (str(tenant_dict['lease_end_date']) if tenant_dict['lease_end_date'] else None),
                    "monthly_rent": float(tenant_dict['monthly_rent']) if tenant_dict['monthly_rent'] else None,
                    "deposit": float(tenant_dict['deposit']) if tenant_dict['deposit'] else None,
                    "status": tenant_dict['lease_status'],
                    "payment_term": tenant_dict['payment_term'],
                    "vehicle_plate": tenant_dict['vehicle_plate'],
                    "assets": tenant_dict['lease_assets'],
                    "asset_keys_quantity": int(tenant_dict.get('asset_keys_quantity', 0)) if tenant_dict.get('asset_keys_quantity') is not None else 0,
                    "asset_fob_quantity": int(tenant_dict.get('asset_fob_quantity', 0)) if tenant_dict.get('asset_fob_quantity') is not None else 0,
                    "asset_remote_quantity": int(tenant_dict.get('asset_remote_quantity', 0)) if tenant_dict.get('asset_remote_quantity') is not None else 0,
                    "room": {
                        "id": tenant_dict['room_id'],
                        "floor_no": tenant_dict['floor_no'],
                        "room_no": tenant_dict['room_no'],
                        "roomNumber": tenant_dict['room_number'],
                    } if tenant_dict['room_id'] else None,
                    "building": {
                        "id": tenant_dict['building_id'],
                        "building_no": tenant_dict['building_no'],
                    } if tenant_dict['building_id'] else None,
                } if tenant_dict['lease_id'] else None,
                "room": {
                    "id": tenant_dict['room_id'],
                    "floor_no": tenant_dict['floor_no'],
                    "room_no": tenant_dict['room_no'],
                    "roomNumber": tenant_dict['room_number'],
                } if tenant_dict['room_id'] else None,
                "building": {
                    "id": tenant_dict['building_id'],
                    "building_no": tenant_dict['building_no'],
                } if tenant_dict['building_id'] else None,
            })
        
        return tenants
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL view not found. Please run backend/app/db/views/v_tenant_complete.sql to create the view."
            )
        raise


@router.get("/{tenant_id}", response_model=dict)
async def get_tenant(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Get a tenant by ID using v_tenant_complete view"""
    try:
        result = await db.execute(
            text("""
                SELECT * FROM v_tenant_complete 
                WHERE tenant_id = :tenant_id
                LIMIT 1
            """),
            {"tenant_id": tenant_id}
        )
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant with id {tenant_id} not found"
            )
        
        tenant_dict = dict(row)
        
        # Parse JSONB fields
        if tenant_dict.get('emergency_contacts'):
            if isinstance(tenant_dict['emergency_contacts'], str):
                tenant_dict['emergency_contacts'] = json.loads(tenant_dict['emergency_contacts'])
        else:
            tenant_dict['emergency_contacts'] = []
        
        if tenant_dict.get('lease_assets'):
            if isinstance(tenant_dict['lease_assets'], str):
                tenant_dict['lease_assets'] = json.loads(tenant_dict['lease_assets'])
        
        return {
            "id": tenant_dict['tenant_id'],
            "first_name": tenant_dict['first_name'],
            "last_name": tenant_dict['last_name'],
            "name": tenant_dict['tenant_name'],
            "gender": tenant_dict['gender'],
            "birthday": str(tenant_dict['birthday']) if tenant_dict['birthday'] else None,
            "personal_id": tenant_dict['personal_id'],
            "idNumber": tenant_dict['personal_id'],
            "phone": tenant_dict['phone'],
            "phoneNumber": tenant_dict['phone'],
            "email": tenant_dict['email'],
            "line_id": tenant_dict['line_id'],
            "address": tenant_dict['tenant_address'],
            "emergency_contacts": tenant_dict['emergency_contacts'],
            "active_lease": {
                "id": tenant_dict['lease_id'],
                "start_date": str(tenant_dict['lease_start_date']) if tenant_dict['lease_start_date'] else None,
                "end_date": str(tenant_dict['terminated_at']) if tenant_dict.get('terminated_at') else (str(tenant_dict['lease_end_date']) if tenant_dict['lease_end_date'] else None),
                "monthly_rent": float(tenant_dict['monthly_rent']) if tenant_dict['monthly_rent'] else None,
                "deposit": float(tenant_dict['deposit']) if tenant_dict['deposit'] else None,
                "status": tenant_dict['lease_status'],
                "payment_term": tenant_dict['payment_term'],
                "vehicle_plate": tenant_dict['vehicle_plate'],
                "assets": tenant_dict['lease_assets'],
                "asset_keys_quantity": int(tenant_dict.get('asset_keys_quantity', 0)) if tenant_dict.get('asset_keys_quantity') is not None else 0,
                "asset_fob_quantity": int(tenant_dict.get('asset_fob_quantity', 0)) if tenant_dict.get('asset_fob_quantity') is not None else 0,
                "asset_remote_quantity": int(tenant_dict.get('asset_remote_quantity', 0)) if tenant_dict.get('asset_remote_quantity') is not None else 0,
                "room": {
                    "id": tenant_dict['room_id'],
                    "floor_no": tenant_dict['floor_no'],
                    "room_no": tenant_dict['room_no'],
                    "roomNumber": tenant_dict['room_number'],
                    "building_id": tenant_dict['building_id'],
                } if tenant_dict['room_id'] else None,
            } if tenant_dict['lease_id'] else None,
            "room": {
                "id": tenant_dict['room_id'],
                "floor_no": tenant_dict['floor_no'],
                "room_no": tenant_dict['room_no'],
                "roomNumber": tenant_dict['room_number'],
                "building_id": tenant_dict['building_id'],
            } if tenant_dict['room_id'] else None,
            "building": {
                "id": tenant_dict['building_id'],
                "building_no": tenant_dict['building_no'],
            } if tenant_dict['building_id'] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL view not found. Please run backend/app/db/views/v_tenant_complete.sql to create the view."
            )
        raise


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant"""
    from app.services.tenant_service import TenantService
    
    tenant = await TenantService.create_or_update_tenant(db, tenant_data)
    
    # Reload with relationships to get emergency contacts
    await db.refresh(tenant, ["emergency_contacts"])
    
    return {
        "id": tenant.id,
        "first_name": tenant.first_name,
        "last_name": tenant.last_name,
        "name": f"{tenant.first_name} {tenant.last_name}",
        "personal_id": tenant.personal_id,
        "phone": tenant.phone,
        "email": tenant.email,
        "address": tenant.home_address,
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
    # Note: If tenant has a lease, we need to refresh lease_tenants carefully
    # to avoid issues if the lease relationship has constraints
    try:
        await db.refresh(updated_tenant, ["emergency_contacts", "lease_tenants"])
    except Exception as e:
        # If refresh fails, still try to get the tenant data
        # This can happen if there are relationship loading issues
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Could not refresh all relationships for tenant {tenant_id}: {str(e)}")
        # Try to refresh just emergency_contacts
        try:
            await db.refresh(updated_tenant, ["emergency_contacts"])
        except:
            pass
    
    # Get active lease through lease_tenants relationship (use computed status)
    active_lease = None
    for lt in updated_tenant.lease_tenants:
        if lt.lease.get_status() == "active" and (lt.lease.deleted_at is None):
            active_lease = lt.lease
            # Load room relationship
            await db.refresh(lt.lease, ["room"])
            if lt.lease.room:
                await db.refresh(lt.lease.room, ["building"])
            break
    
    return {
        "id": updated_tenant.id,
        "first_name": updated_tenant.first_name,
        "last_name": updated_tenant.last_name,
        "name": f"{updated_tenant.first_name} {updated_tenant.last_name}",
        "gender": updated_tenant.gender,
        "birthday": str(updated_tenant.birthday),
        "personal_id": updated_tenant.personal_id,
        "idNumber": updated_tenant.personal_id,
        "phone": updated_tenant.phone,
        "phoneNumber": updated_tenant.phone,
        "email": updated_tenant.email,
        "line_id": updated_tenant.line_id,
        "address": updated_tenant.home_address,
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
        "active_lease": {
            "id": active_lease.id,
            "start_date": str(active_lease.start_date),
            "end_date": str(active_lease.terminated_at) if active_lease.terminated_at else str(active_lease.end_date),
            "monthly_rent": float(active_lease.monthly_rent),
            "deposit": float(active_lease.deposit),
            "status": active_lease.status,
            "payment_term": active_lease.payment_term,
            "vehicle_plate": active_lease.vehicle_plate,
            "assets": active_lease.assets,
            "room": {
                "id": active_lease.room.id,
                "floor_no": active_lease.room.floor_no,
                "room_no": active_lease.room.room_no,
                "roomNumber": f"{active_lease.room.floor_no}{active_lease.room.room_no}",
                "building_id": active_lease.room.building_id,
            } if active_lease.room else None,
        } if active_lease else None,
    }

