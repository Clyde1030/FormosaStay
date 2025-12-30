# app/services/electricity_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import date
from decimal import Decimal
from typing import Optional

from app.models.electricity import ElectricityRate, MeterReading
from app.models.room import Room
from fastapi import HTTPException, status as http_status


class ElectricityService:
    """Service for managing electricity rates and meter readings"""

    @staticmethod
    async def get_electricity_rate_for_room(
        db: AsyncSession,
        room_id: int,
        target_date: date
    ) -> Optional[ElectricityRate]:
        """
        Get the electricity rate for a room on a specific date.
        
        Priority:
        1. Room-specific rate that covers the date
        2. Building-level rate that covers the date
        """
        # First try to get room-specific rate
        room_result = await db.execute(
            select(Room).where(Room.id == room_id)
        )
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {room_id} not found"
            )

        # Try room-specific rate first
        room_rate_result = await db.execute(
            select(ElectricityRate)
            .where(
                and_(
                    ElectricityRate.room_id == room_id,
                    ElectricityRate.start_date <= target_date,
                    ElectricityRate.end_date >= target_date
                )
            )
            .order_by(desc(ElectricityRate.start_date))
            .limit(1)
        )
        room_rate = room_rate_result.scalar_one_or_none()

        if room_rate:
            return room_rate

        # Fall back to building-level rate
        building_rate_result = await db.execute(
            select(ElectricityRate)
            .where(
                and_(
                    ElectricityRate.building_id == room.building_id,
                    ElectricityRate.room_id.is_(None),
                    ElectricityRate.start_date <= target_date,
                    ElectricityRate.end_date >= target_date
                )
            )
            .order_by(desc(ElectricityRate.start_date))
            .limit(1)
        )
        building_rate = building_rate_result.scalar_one_or_none()

        return building_rate

    @staticmethod
    async def get_previous_meter_reading(
        db: AsyncSession,
        room_id: int,
        before_date: date
    ) -> Optional[MeterReading]:
        """Get the most recent meter reading before a given date"""
        result = await db.execute(
            select(MeterReading)
            .where(
                and_(
                    MeterReading.room_id == room_id,
                    MeterReading.read_date < before_date
                )
            )
            .order_by(desc(MeterReading.read_date))
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_meter_reading(
        db: AsyncSession,
        room_id: int,
        read_date: date,
        read_amount: Decimal,
        created_by: Optional[int] = None
    ) -> MeterReading:
        """Create a new meter reading"""
        # Check if reading already exists for this date
        existing_result = await db.execute(
            select(MeterReading).where(
                and_(
                    MeterReading.room_id == room_id,
                    MeterReading.read_date == read_date
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            # Update existing reading
            existing.read_amount = read_amount
            existing.updated_by = created_by
            await db.flush()
            return existing

        # Create new reading
        reading = MeterReading(
            room_id=room_id,
            read_date=read_date,
            read_amount=read_amount,
            created_by=created_by,
        )
        db.add(reading)
        await db.flush()
        return reading

    @staticmethod
    async def calculate_electricity_bill(
        db: AsyncSession,
        room_id: int,
        current_reading: Decimal,
        reading_date: date,
        period_start: Optional[date] = None,
        created_by: Optional[int] = None
    ) -> tuple[Decimal, dict]:
        """
        Calculate electricity bill and return payment data.
        
        Returns:
            tuple: (bill_amount, payment_data_dict)
        """
        # Get previous reading
        previous_reading_obj = await ElectricityService.get_previous_meter_reading(
            db, room_id, reading_date
        )

        if not previous_reading_obj:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"No previous meter reading found for room {room_id} before {reading_date}. "
                       f"Cannot calculate electricity bill."
            )

        previous_reading = previous_reading_obj.read_amount

        # Validate current reading is greater than previous
        if current_reading < previous_reading:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Current reading ({current_reading}) cannot be less than previous reading ({previous_reading})"
            )

        # Calculate usage
        usage_kwh = current_reading - previous_reading

        # Get electricity rate
        rate = await ElectricityService.get_electricity_rate_for_room(
            db, room_id, reading_date
        )

        if not rate:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"No electricity rate found for room {room_id} on {reading_date}"
            )

        # Calculate bill amount
        bill_amount = usage_kwh * rate.rate_per_kwh

        # Determine period dates
        if not period_start:
            period_start = previous_reading_obj.read_date
        period_end = reading_date

        # Create invoice record data
        # Note: We need lease_id, but we'll get it from the calling function
        # For now, we'll return the invoice data to be created with lease_id
        # Default due_date to period_end if not specified
        payment_data = {
            "category": "electricity",
            "period_start": period_start,
            "period_end": period_end,
            "due_date": period_end,  # Default due_date to period_end
            "due_amount": bill_amount,
            "paid_amount": Decimal(0),
            "status": "overdue",
            "created_by": created_by,
        }

        return bill_amount, payment_data

