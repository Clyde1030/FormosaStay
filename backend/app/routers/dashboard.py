# app/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.room import Room
from app.models.lease import Lease
from app.models.payment import Payment

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics"""
    # Total rooms
    rooms_result = await db.execute(select(func.count(Room.id)))
    total_rooms = rooms_result.scalar() or 0
    
    # Active leases (occupied rooms)
    leases_result = await db.execute(
        select(func.count(Lease.id)).where(Lease.status == "active")
    )
    occupied = leases_result.scalar() or 0
    
    # Occupancy rate
    occupancy_rate = (occupied / total_rooms * 100) if total_rooms > 0 else 0
    
    # Overdue payments
    payments_result = await db.execute(
        select(
            func.sum(Payment.due_amount - Payment.paid_amount).label("total_overdue"),
            func.count(Payment.id).label("count")
        ).where(Payment.status.in_(["unpaid", "partial"]))
    )
    overdue_data = payments_result.first()
    overdue_total = float(overdue_data.total_overdue) if overdue_data.total_overdue else 0
    overdue_count = overdue_data.count or 0
    
    return {
        "totalRooms": total_rooms,
        "occupied": occupied,
        "occupancyRate": round(occupancy_rate, 1),
        "overdueTotal": overdue_total,
        "overdueCount": overdue_count,
    }

