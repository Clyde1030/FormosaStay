# app/models/__init__.py
from app.models.building import Building
from app.models.room import Room
from app.models.tenant import Tenant, TenantEmergencyContact
from app.models.lease import Lease, LeaseAsset

__all__ = [
    "Building",
    "Room",
    "Tenant",
    "TenantEmergencyContact",
    "Lease",
    "LeaseAsset",
]

