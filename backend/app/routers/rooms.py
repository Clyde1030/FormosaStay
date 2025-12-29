# app/routers/rooms.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.room import Room
from app.models.lease import Lease

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("/")
async def list_rooms(
    building_id: Optional[int] = Query(None, description="Filter by building ID"),
    db: AsyncSession = Depends(get_db),
):
    """List all rooms, optionally filtered by building"""
    query = select(Room).options(selectinload(Room.building))
    
    if building_id:
        query = query.where(Room.building_id == building_id)
    
    query = query.order_by(Room.floor_no, Room.room_no)
    
    result = await db.execute(query)
    rooms = result.scalars().all()
    
    # Get active leases to determine room status (early_termination_date IS NULL AND end_date >= CURRENT_DATE)
    leases_result = await db.execute(
        select(Lease).where(
            and_(
                Lease.early_termination_date.is_(None),
                Lease.end_date >= func.current_date(),
                Lease.deleted_at.is_(None)
            )
        )
    )
    active_leases = {lease.room_id: lease for lease in leases_result.scalars().all()}
    
    return [
        {
            "id": r.id,
            "building_id": r.building_id,
            "buildingId": r.building_id,
            "floor_no": r.floor_no,
            "room_no": r.room_no,
            "roomNumber": f"{r.floor_no}{r.room_no}",
            "size_ping": float(r.size_ping) if r.size_ping else None,
            "sizePing": float(r.size_ping) if r.size_ping else None,
            "status": "Occupied" if r.id in active_leases else "Vacant",
            "currentMeterReading": 0,  # Would need to fetch from meter_reading
            "building": {
                "id": r.building.id,
                "building_no": r.building.building_no,
                "address": r.building.address,
            } if r.building else None,
        }
        for r in rooms
    ]


@router.get("/{room_id}")
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    """Get a room by ID"""
    result = await db.execute(
        select(Room)
        .where(Room.id == room_id)
        .options(selectinload(Room.building))
    )
    room = result.scalar_one_or_none()
    
    if not room:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )
    
    # Check if room has active lease (early_termination_date IS NULL AND end_date >= CURRENT_DATE)
    lease_result = await db.execute(
        select(Lease).where(
            and_(
                Lease.room_id == room_id,
                Lease.early_termination_date.is_(None),
                Lease.end_date >= func.current_date(),
                Lease.deleted_at.is_(None)
            )
        )
    )
    has_active_lease = lease_result.scalar_one_or_none() is not None
    
    return {
        "id": room.id,
        "building_id": room.building_id,
        "floor_no": room.floor_no,
        "room_no": room.room_no,
        "roomNumber": f"{room.floor_no}{room.room_no}",
        "size_ping": float(room.size_ping) if room.size_ping else None,
        "status": "Occupied" if has_active_lease else "Vacant",
        "building": {
            "id": room.building.id,
            "building_no": room.building.building_no,
            "address": room.building.address,
        } if room.building else None,
    }


def _serialize_row(row) -> dict:
    """Convert row to dict and serialize datetime objects to ISO format strings"""
    data = dict(row._mapping)
    for key, value in data.items():
        if isinstance(value, datetime):
            data[key] = value.isoformat()
    return data


@router.get("/{room_id}/dashboard")
async def get_room_dashboard(room_id: int, db: AsyncSession = Depends(get_db)):
    """Get complete dashboard summary for a room"""
    try:
        result = await db.execute(
            text("SELECT * FROM v_room_dashboard_summary WHERE room_id = :room_id"),
            {"room_id": room_id}
        )
        row = result.first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {room_id} not found"
            )
        
        return _serialize_row(row)
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL views not found. Please run backend/app/db/views/room_dashboard_views.sql to create the views."
            )
        raise


@router.get("/{room_id}/tenant")
async def get_room_tenant(room_id: int, db: AsyncSession = Depends(get_db)):
    """Get current tenant information for a room (primary tenant only)"""
    try:
        result = await db.execute(
            text("""
                SELECT * FROM v_room_current_tenant 
                WHERE room_id = :room_id AND tenant_role = '主要'
                LIMIT 1
            """),
            {"room_id": room_id}
        )
        row = result.first()
        
        # Check if row exists and has tenant_id
        if not row:
            return None
        
        tenant_id = row._mapping.get('tenant_id')
        if not tenant_id:
            return None
        
        data = _serialize_row(row)
        
        # Format assets if present
        if data.get('assets'):
            import json
            if isinstance(data['assets'], str):
                data['assets'] = json.loads(data['assets'])
        
        return data
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL views not found. Please run backend/app/db/views/room_dashboard_views.sql to create the views."
            )
        raise


@router.get("/{room_id}/tenants")
async def get_room_tenants(room_id: int, db: AsyncSession = Depends(get_db)):
    """Get all current tenants for a room (primary and co-tenants)"""
    try:
        result = await db.execute(
            text("""
                SELECT * FROM v_room_current_tenant 
                WHERE room_id = :room_id
                ORDER BY tenant_role DESC, tenant_id
            """),
            {"room_id": room_id}
        )
        rows = result.all()
        
        if not rows:
            return []
        
        tenants = []
        for row in rows:
            tenant_id = row._mapping.get('tenant_id')
            if tenant_id:
                data = _serialize_row(row)
                
                # Format assets if present
                if data.get('assets'):
                    import json
                    if isinstance(data['assets'], str):
                        data['assets'] = json.loads(data['assets'])
                
                tenants.append(data)
        
        return tenants
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL views not found. Please run backend/app/db/views/room_dashboard_views.sql to create the views."
            )
        raise


@router.get("/{room_id}/invoices")
async def get_room_invoices(
    room_id: int,
    category: Optional[str] = Query(None, description="Filter by category (房租, 電費, 罰款, 押金)"),
    status_filter: Optional[str] = Query(None, description="Filter by invoice status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice history for a room"""
    try:
        query = "SELECT * FROM v_room_payment_history WHERE room_id = :room_id"
        params = {"room_id": room_id}
        
        if category:
            query += " AND category = :category"
            params["category"] = category
        
        if status_filter:
            query += " AND payment_status = :status_filter"
            params["status_filter"] = status_filter
        
        query += " ORDER BY due_date DESC, invoice_created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = limit
        params["offset"] = offset
        
        result = await db.execute(text(query), params)
        rows = result.all()
        
        return [_serialize_row(row) for row in rows]
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL views not found. Please run backend/app/db/views/room_dashboard_views.sql to create the views."
            )
        raise


@router.get("/{room_id}/electricity")
async def get_room_electricity(
    room_id: int,
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get electricity usage and cost history for a room"""
    try:
        query = "SELECT * FROM v_room_electricity_history WHERE room_id = :room_id"
        params = {"room_id": room_id}
        
        if start_date:
            query += " AND read_date >= :start_date"
            params["start_date"] = start_date
        
        if end_date:
            query += " AND read_date <= :end_date"
            params["end_date"] = end_date
        
        query += " ORDER BY read_date DESC LIMIT :limit OFFSET :offset"
        params["limit"] = limit
        params["offset"] = offset
        
        result = await db.execute(text(query), params)
        rows = result.all()
        
        return [_serialize_row(row) for row in rows]
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SQL views not found. Please run backend/app/db/views/room_dashboard_views.sql to create the views."
            )
        raise
