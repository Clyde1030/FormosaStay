# app/schemas/tenant.py
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import List, Optional


class TenantEmergencyContactCreate(BaseModel):
    """Schema for creating/updating tenant emergency contact"""
    first_name: str = Field(..., description="Emergency contact first name")
    last_name: str = Field(..., description="Emergency contact last name")
    relationship: str = Field(..., description="Relationship to tenant")
    phone: str = Field(..., description="Emergency contact phone number")


class TenantEmergencyContactResponse(BaseModel):
    """Schema for tenant emergency contact response"""
    id: int
    first_name: str
    last_name: str
    relationship: str
    phone: str

    class Config:
        from_attributes = True


class TenantCreate(BaseModel):
    """Schema for creating/updating tenant information"""
    first_name: str = Field(..., description="Tenant first name")
    last_name: str = Field(..., description="Tenant last name")
    gender: str = Field(..., description="Gender: '男', '女', or '其他'")
    birthday: date = Field(..., description="Date of birth")
    personal_id: str = Field(..., description="Personal ID (unique identifier)")
    phone: str = Field(..., description="Phone number")
    email: Optional[str] = Field(None, description="Email address")
    line_id: Optional[str] = Field(None, description="LINE ID")
    address: str = Field(..., description="Address")
    emergency_contacts: Optional[List[TenantEmergencyContactCreate]] = Field(
        default=[], 
        description="List of emergency contacts"
    )

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        allowed = {"男", "女", "其他"}
        if v not in allowed:
            raise ValueError(f"gender must be one of {allowed}")
        return v


class TenantResponse(BaseModel):
    """Schema for tenant response"""
    id: int
    first_name: str
    last_name: str
    gender: str
    birthday: date
    personal_id: str
    phone: str
    email: Optional[str]
    line_id: Optional[str]
    address: str
    emergency_contacts: List[TenantEmergencyContactResponse] = []

    class Config:
        from_attributes = True

