# app/services/room_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from typing import Optional

from app.models.room import Room
from app.models.building import Building
from fastapi import HTTPException, status as http_status


class RoomService:
    """Service for managing room operations"""

    @staticmethod
    async def get_room_id(
        db: AsyncSession,
        building_no: int,
        floor_no: int,
        room_no: str,
    ) -> Optional[int]:
        """
        Look up room_id by building number, floor number, and room number.
        
        This function can be used when entering invoices, cash flows, and other
        services that require room_id. It works for both occupied and vacant rooms.
        
        Args:
            db: Database session
            building_no: Building number
            floor_no: Floor number
            room_no: Room number (single character, e.g., 'A', 'B')
            
        Returns:
            int: Room ID if found, None if not found
            
        Raises:
            HTTPException: If multiple rooms found (should not happen due to unique constraint)
        """
        # Query room table directly with building join for efficiency
        # This ensures we get all rooms, including vacant ones
        result = await db.execute(
            select(Room.id)
            .join(Building, Room.building_id == Building.id)
            .where(
                and_(
                    Building.building_no == building_no,
                    Room.floor_no == floor_no,
                    Room.room_no == room_no,
                    Room.deleted_at.is_(None),
                    Building.deleted_at.is_(None)
                )
            )
        )
        room_id = result.scalar_one_or_none()
        
        return room_id

    @staticmethod
    async def get_room_id_from_view(
        db: AsyncSession,
        building_no: int,
        floor_no: int,
        room_no: str,
    ) -> Optional[int]:
        """
        Look up room_id using the v_room_current_tenant view.
        
        This alternative implementation uses the view, which includes all rooms
        (both occupied and vacant). For vacant rooms, tenant-related columns
        will be NULL, but room_id, building_no, floor_no, and room_no will be present.
        
        Args:
            db: Database session
            building_no: Building number
            floor_no: Floor number
            room_no: Room number (single character, e.g., 'A', 'B')
            
        Returns:
            int: Room ID if found, None if not found
        """
        result = await db.execute(
            text("""
                SELECT DISTINCT room_id 
                FROM v_room_current_tenant 
                WHERE building_no = :building_no 
                  AND floor_no = :floor_no 
                  AND room_no = :room_no
                LIMIT 1
            """),
            {
                "building_no": building_no,
                "floor_no": floor_no,
                "room_no": room_no
            }
        )
        row = result.first()
        
        if row:
            return row._mapping.get('room_id')
        
        return None

