# app/routers/rooms.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional

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
    
    # Get active leases to determine room status
    leases_result = await db.execute(
        select(Lease).where(Lease.status == "有效")
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
    
    # Check if room has active lease
    lease_result = await db.execute(
        select(Lease).where(
            and_(
                Lease.room_id == room_id,
                Lease.status == "有效"
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
