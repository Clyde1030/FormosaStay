# app/models/tenant.py
from sqlalchemy import Column, BigInteger, Text, String, Date, ForeignKey
from sqlalchemy.orm import relationship as rel
from app.models.base import Base, AuditMixin


class Tenant(Base, AuditMixin):
    __tablename__ = "tenant"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    gender = Column(String(1), nullable=False)  # 'M', 'F', 'O'
    birthday = Column(Date, nullable=False)
    personal_id = Column(Text, nullable=False, unique=True)
    phone = Column(Text, nullable=False)
    email = Column(Text, nullable=True)
    line_id = Column(Text, nullable=True)
    address = Column(Text, nullable=False)

    # Relationships
    lease_tenants = rel("LeaseTenant", back_populates="tenant")
    emergency_contacts = rel("TenantEmergencyContact", back_populates="tenant", cascade="all, delete-orphan")


class TenantEmergencyContact(Base):
    __tablename__ = "tenant_emergency_contact"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(
        BigInteger,
        ForeignKey("tenant.id", ondelete="CASCADE"),
        nullable=False
    )

    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    relationship = Column(Text, nullable=False)  # Matches database schema column name
    phone = Column(Text, nullable=False)

    # Relationships - using 'rel' alias to avoid conflict with 'relationship' column
    tenant = rel("Tenant", back_populates="emergency_contacts")


