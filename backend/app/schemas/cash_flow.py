# app/schemas/cash_flow.py
from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal
from typing import Optional, List


class CashFlowCategoryResponse(BaseModel):
    """Schema for cash flow category response"""
    id: int
    code: str
    chinese_name: str
    direction: str
    category_group: Optional[str] = None

    class Config:
        from_attributes = True


class CashFlowCreate(BaseModel):
    """Schema for creating a cash flow entry"""
    category_id: int = Field(..., description="Cash flow category ID")
    cash_account_id: int = Field(..., description="Cash account ID")
    lease_id: Optional[int] = Field(None, description="Lease ID (optional)")
    building_id: Optional[int] = Field(None, description="Building ID (optional)")
    room_id: Optional[int] = Field(None, description="Room ID (optional)")
    flow_date: date = Field(..., description="Date of the cash flow")
    amount: Decimal = Field(..., gt=0, description="Amount (must be positive)")
    payment_method: str = Field(..., description="Payment method: 'cash', 'bank', 'LINE_Pay', 'other'")
    note: Optional[str] = Field(None, description="Optional note")


class CashFlowUpdate(BaseModel):
    """Schema for updating a cash flow entry"""
    category_id: Optional[int] = None
    cash_account_id: Optional[int] = None
    lease_id: Optional[int] = None
    building_id: Optional[int] = None
    room_id: Optional[int] = None
    flow_date: Optional[date] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_method: Optional[str] = None
    note: Optional[str] = None


class CashFlowResponse(BaseModel):
    """Schema for cash flow response"""
    id: int
    category_id: int
    cash_account_id: int
    lease_id: Optional[int] = None
    building_id: Optional[int] = None
    room_id: Optional[int] = None
    flow_date: date
    amount: Decimal
    payment_method: str
    note: Optional[str] = None
    category_name: Optional[str] = None
    category_code: Optional[str] = None

    class Config:
        from_attributes = True

