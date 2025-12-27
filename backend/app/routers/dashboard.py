# app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.room import Room
from app.models.lease import Lease
from app.models.invoice import Invoice

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        # Total rooms
        rooms_result = await db.execute(select(func.count(Room.id)))
        total_rooms = rooms_result.scalar() or 0
        
        # Active leases (occupied rooms) - early_termination_date IS NULL AND end_date >= CURRENT_DATE
        from sqlalchemy import and_
        leases_result = await db.execute(
            select(func.count(Lease.id)).where(
                and_(
                    Lease.early_termination_date.is_(None),
                    Lease.end_date >= func.current_date(),
                    Lease.deleted_at.is_(None)
                )
            )
        )
        occupied = leases_result.scalar() or 0
        
        # Occupancy rate
        occupancy_rate = (occupied / total_rooms * 100) if total_rooms > 0 else 0
        
        # Overdue invoices - handle case where no invoices exist
        try:
            invoices_result = await db.execute(
                select(
                    func.sum(Invoice.due_amount - Invoice.paid_amount).label("total_overdue"),
                    func.count(Invoice.id).label("count")
                ).where(Invoice.status.in_(["未交", "部分未交"])).where(Invoice.deleted_at.is_(None))
            )
            overdue_data = invoices_result.first()
            overdue_total = float(overdue_data.total_overdue) if overdue_data and overdue_data.total_overdue else 0
            overdue_count = overdue_data.count if overdue_data else 0
        except Exception as e:
            # If invoice table doesn't exist or has issues, default to 0
            overdue_total = 0
            overdue_count = 0
        
        return {
            "totalRooms": total_rooms,
            "occupied": occupied,
            "occupancyRate": round(occupancy_rate, 1),
            "overdueTotal": overdue_total,
            "overdueCount": overdue_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard stats: {str(e)}"
        )

