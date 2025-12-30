# app/schemas/lease.py
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import date
from decimal import Decimal
from typing import List, Optional, Dict, Any

from app.schemas.tenant import TenantCreate


class LeaseAssetCreate(BaseModel):
    """Schema for creating a lease asset (used in JSONB assets array)"""
    type: str = Field(..., description="Type of asset: 'key', 'fob', or 'controller'")
    quantity: int = Field(default=1, ge=1, description="Quantity of the asset")

    @field_validator("type")
    @classmethod
    def validate_asset_type(cls, v: str) -> str:
        allowed = {"key", "fob", "controller"}
        if v not in allowed:
            raise ValueError(f"asset type must be one of {allowed}")
        return v


class LeaseCreate(BaseModel):
    """Schema for creating a new lease contract
    
    Either tenant_id or tenant_data must be provided.
    If tenant_id is provided, tenant_data can be used to update tenant information.
    If only tenant_data is provided, tenant will be found by personal_id or created if not found.
    """
    tenant_id: Optional[int] = Field(None, description="ID of existing tenant (optional if tenant_data is provided)")
    tenant_data: Optional[TenantCreate] = Field(None, description="Tenant information for creating/updating tenant")
    room_id: int = Field(..., description="ID of the room")
    start_date: date = Field(..., description="Lease start date")
    end_date: date = Field(..., description="Lease end date")
    monthly_rent: Decimal = Field(..., gt=0, description="Monthly rent amount")
    deposit: Decimal = Field(..., ge=0, description="Security deposit amount")
    pay_rent_on: int = Field(..., ge=1, le=31, description="Day of month when rent is due (1-31)")
    payment_term: str = Field(..., description="Payment term: '年繳', '半年繳', '季繳', or '月繳'")
    vehicle_plate: Optional[str] = Field(None, description="Vehicle/motorcycle plate number")
    assets: Optional[List[LeaseAssetCreate]] = Field(default=[], description="Assets associated with the lease (will be stored as JSONB)")

    @model_validator(mode="after")
    def validate_tenant_and_dates(self):
        # Validate that at least one tenant identifier is provided
        if not self.tenant_id and not self.tenant_data:
            raise ValueError("Either tenant_id or tenant_data must be provided")
        
        # Validate dates
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class LeaseRenew(BaseModel):
    """Schema for renewing an existing lease contract"""
    new_end_date: date = Field(..., description="New lease end date")
    new_monthly_rent: Optional[Decimal] = Field(None, gt=0, description="New monthly rent (optional, uses current if not provided)")
    new_deposit: Optional[Decimal] = Field(None, ge=0, description="New deposit amount (optional)")
    new_pay_rent_on: Optional[int] = Field(None, ge=1, le=31, description="New rent due day (optional)")
    new_payment_term: Optional[str] = Field(None, description="New payment term: 'annual', 'semi-annual', 'seasonal', or 'monthly' (optional)")
    new_vehicle_plate: Optional[str] = Field(None, description="New vehicle/motorcycle plate number (optional)")

    @field_validator("new_end_date")
    @classmethod
    def validate_new_end_date(cls, v: date) -> date:
        # Note: Actual validation against current lease end_date is done in the service layer
        # This just ensures it's a valid date
        return v


class LeaseUpdate(BaseModel):
    """Schema for updating a draft or pending lease contract"""
    start_date: Optional[date] = Field(None, description="Lease start date")
    end_date: Optional[date] = Field(None, description="Lease end date")
    monthly_rent: Optional[Decimal] = Field(None, gt=0, description="Monthly rent amount")
    deposit: Optional[Decimal] = Field(None, ge=0, description="Security deposit amount")
    pay_rent_on: Optional[int] = Field(None, ge=1, le=31, description="Day of month when rent is due (1-31)")
    payment_term: Optional[str] = Field(None, description="Payment term")
    vehicle_plate: Optional[str] = Field(None, description="Vehicle/motorcycle plate number")
    assets: Optional[List[LeaseAssetCreate]] = Field(None, description="Assets associated with the lease")

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class LeaseAmend(BaseModel):
    """Schema for creating a lease amendment"""
    effective_date: date = Field(..., description="Date when the amendment takes effect (must be in the future)")
    old_rent: Decimal = Field(..., gt=0, description="Current monthly rent before amendment")
    new_rent: Decimal = Field(..., gt=0, description="New monthly rent after amendment")
    reason: str = Field(..., min_length=1, description="Reason for the amendment")

    @field_validator("effective_date")
    @classmethod
    def validate_effective_date(cls, v: date) -> date:
        # Note: Actual validation that it's in the future is done in the service layer
        # This just ensures it's a valid date
        return v


class LeaseTerminate(BaseModel):
    """Schema for terminating a lease contract"""
    termination_date: date = Field(..., description="Date when the lease is terminated")
    reason: Optional[str] = Field(None, description="Reason for termination")
    meter_reading_date: Optional[date] = Field(
        None, 
        description="Date of meter reading (defaults to termination_date if not provided)"
    )
    meter_reading: Optional[float] = Field(
        None,
        ge=0,
        description="Final meter reading amount (kWh). If provided, will calculate prorated electricity bill."
    )

    @field_validator("termination_date")
    @classmethod
    def validate_termination_date(cls, v: date) -> date:
        # Note: Actual validation against lease start_date is done in the service layer
        # This just ensures it's a valid date
        return v


class LeaseTenantResponse(BaseModel):
    """Schema for lease-tenant relationship response"""
    tenant_id: int
    tenant_role: str  # '主要' or '次要'
    joined_at: Optional[date] = None

    class Config:
        from_attributes = True


class LeaseAmendmentResponse(BaseModel):
    """Schema for lease amendment response"""
    id: int
    lease_id: int
    amendment_type: str
    effective_date: date
    old_monthly_rent: Optional[Decimal]
    new_monthly_rent: Optional[Decimal]
    reason: str
    created_at: str

    class Config:
        from_attributes = True


class LeaseResponse(BaseModel):
    """Schema for lease response"""
    id: int
    room_id: int
    start_date: date
    end_date: date
    terminated_at: Optional[date] = None
    termination_reason: Optional[str] = None
    submitted_at: Optional[str] = None
    monthly_rent: Decimal
    deposit: Decimal
    pay_rent_on: int
    payment_term: str  # '年繳', '半年繳', '季繳', '月繳'
    status: str  # 'draft', 'pending', 'active', 'expired', 'terminated'
    vehicle_plate: Optional[str] = None
    assets: Optional[List[Dict[str, Any]]] = None  # JSONB array: [{"type": "鑰匙", "quantity": 1}, ...]
    tenants: List[LeaseTenantResponse] = []
    # For backward compatibility, include primary tenant_id (will be populated by service layer)
    tenant_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

