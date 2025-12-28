# app/schemas/payment.py
from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal
from typing import Optional


class RentCalculationRequest(BaseModel):
    """Schema for rent amount calculation request"""
    monthly_rent: Decimal = Field(..., gt=0, description="Monthly rent amount")
    payment_term_months: int = Field(..., ge=1, description="Number of months in payment term (1, 3, 6, or 12)")
    discount: Decimal = Field(default=Decimal("0"), ge=0, description="Discount amount to apply")


class RentCalculationResponse(BaseModel):
    """Schema for rent amount calculation response"""
    total_amount: Decimal = Field(..., description="Total rent amount after discount")
    base_amount: Decimal = Field(..., description="Base amount before discount (monthly_rent * payment_term_months)")
    discount: Decimal = Field(..., description="Discount amount applied")


class PeriodEndCalculationRequest(BaseModel):
    """Schema for period end date calculation request"""
    period_start: date = Field(..., description="Start date of the payment period")
    payment_term_months: int = Field(..., ge=1, description="Number of months in payment term (1, 3, 6, or 12)")


class PeriodEndCalculationResponse(BaseModel):
    """Schema for period end date calculation response"""
    period_end: date = Field(..., description="End date of the payment period")


class RentNoteRequest(BaseModel):
    """Schema for rent note formatting request"""
    base_note: Optional[str] = Field(None, description="Base note text (optional)")
    discount: Decimal = Field(default=Decimal("0"), ge=0, description="Discount amount applied")


class RentNoteResponse(BaseModel):
    """Schema for rent note formatting response"""
    formatted_note: str = Field(..., description="Formatted note with discount information if applicable")

