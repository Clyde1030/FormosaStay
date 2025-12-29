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


class PaymentTransactionCreate(BaseModel):
    """Schema for creating a payment transaction (rent, electricity, deposit)"""
    room_id: int = Field(..., description="Room ID")
    lease_id: Optional[int] = Field(None, description="Lease ID (optional, will be inferred from room if not provided)")
    category: str = Field(..., description="Category: '房租', '電費', '押金', or '罰款'")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    due_date: date = Field(..., description="Due date")
    period_start: Optional[date] = Field(None, description="Period start date (for rent/electricity)")
    period_end: Optional[date] = Field(None, description="Period end date (for rent/electricity)")
    status: str = Field(default="已交", description="Payment status: '已交', '未交', '部分未交', '呆帳', '歸還', '取消'")
    paid_date: Optional[date] = Field(None, description="Paid date (if status is '已交')")
    payment_method: Optional[str] = Field(None, description="Payment method: '銀行轉帳', '現金', 'LINE Pay', '其他'")
    note: Optional[str] = Field(None, description="Optional note")
    cash_account_id: Optional[int] = Field(None, description="Cash account ID (optional, will use default if not provided)")


class PaymentTransactionUpdate(BaseModel):
    """Schema for updating a payment transaction"""
    category: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    due_date: Optional[date] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    status: Optional[str] = None
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    note: Optional[str] = None


class PaymentTransactionResponse(BaseModel):
    """Schema for payment transaction response"""
    id: int
    invoice_id: int
    room_id: int
    lease_id: int
    tenant_name: Optional[str] = None
    category: str
    amount: Decimal
    due_date: date
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    status: str
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True

