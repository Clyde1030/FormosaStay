# app/schemas/electricity.py
from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal
from typing import Optional


class MeterReadingCreate(BaseModel):
    """Schema for creating a meter reading"""
    room_id: int = Field(..., description="ID of the room")
    read_date: date = Field(..., description="Date of the meter reading")
    read_amount: Decimal = Field(..., ge=0, description="Meter reading amount (kWh)")


class MeterReadingResponse(BaseModel):
    """Schema for meter reading response"""
    id: int
    room_id: int
    read_date: date
    read_amount: Decimal

    class Config:
        from_attributes = True


class ElectricityRateCreate(BaseModel):
    """Schema for creating an electricity rate"""
    building_id: int = Field(..., description="ID of the building")
    room_id: Optional[int] = Field(None, description="ID of the room (optional, for room-specific rates)")
    start_date: date = Field(..., description="Start date of the rate")
    end_date: date = Field(..., description="End date of the rate")
    rate_per_kwh: Decimal = Field(..., gt=0, description="Rate per kWh")


class ElectricityRateResponse(BaseModel):
    """Schema for electricity rate response"""
    id: int
    building_id: int
    room_id: Optional[int]
    start_date: date
    end_date: date
    rate_per_kwh: Decimal

    class Config:
        from_attributes = True


class ElectricityBillCalculation(BaseModel):
    """Schema for electricity bill calculation result"""
    previous_reading: Optional[Decimal] = Field(None, description="Previous meter reading")
    current_reading: Decimal = Field(..., description="Current meter reading")
    usage_kwh: Decimal = Field(..., description="Usage in kWh")
    rate_per_kwh: Decimal = Field(..., description="Rate per kWh")
    bill_amount: Decimal = Field(..., description="Total bill amount")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")

