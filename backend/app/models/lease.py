# app/models/lease.py
from sqlalchemy import Column, BigInteger, Integer, Date, Numeric, SmallInteger, String, ForeignKey, CheckConstraint, Index, text
from sqlalchemy.orm import relationship
from app.models.base import Base, AuditMixin


class Lease(Base, AuditMixin):
    __tablename__ = "lease"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(BigInteger, ForeignKey("room.id"), nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    early_termination_date = Column(Date, nullable=True)

    monthly_rent = Column(Numeric(10, 2), nullable=False)
    deposit = Column(Numeric(10, 2), nullable=False)
    pay_rent_on = Column(SmallInteger, nullable=False)  # 1-31
    payment_term = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'active', 'terminated', 'expired'
    vehicle_plate = Column(String, nullable=True)  # Vehicle/motorcycle plate number

    # Relationships
    room = relationship("Room", back_populates="leases")
    tenants = relationship("LeaseTenant", back_populates="lease", cascade="all, delete-orphan")
    assets = relationship("LeaseAsset", back_populates="lease", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="lease")  # No cascade - keep invoices for audit even if lease is deleted
    cash_flows = relationship("CashFlow", back_populates="lease")

    __table_args__ = (
        CheckConstraint("end_date > start_date", name="check_end_after_start"),
        CheckConstraint("early_termination_date IS NULL OR (early_termination_date >= start_date AND early_termination_date <= end_date)", name="check_early_termination_date"),
        CheckConstraint("pay_rent_on BETWEEN 1 AND 31", name="check_pay_rent_on"),
        CheckConstraint("monthly_rent >= 0", name="check_monthly_rent_positive"),
        CheckConstraint("deposit >= 0", name="check_deposit_positive"),
        CheckConstraint("status IN ('active','terminated','expired')", name="check_status"),
        Index("idx_lease_room", "room_id"),
        Index("uq_active_lease_per_room", "room_id", unique=True, postgresql_where=text("status = 'active' AND deleted_at IS NULL")),
    )


class LeaseTenant(Base):
    __tablename__ = "lease_tenant"

    lease_id = Column(BigInteger, ForeignKey("lease.id", ondelete="CASCADE"), primary_key=True)
    tenant_id = Column(BigInteger, ForeignKey("tenant.id", ondelete="RESTRICT"), primary_key=True)
    tenant_role = Column(String, nullable=False)  # 'primary', 'co_tenant'
    joined_at = Column(Date, nullable=True, server_default=text("CURRENT_DATE"))

    # Relationships
    lease = relationship("Lease", back_populates="tenants")
    tenant = relationship("Tenant", back_populates="lease_tenants")

    __table_args__ = (
        CheckConstraint("tenant_role IN ('primary','co_tenant')", name="check_tenant_role"),
        Index("uq_primary_tenant", "lease_id", unique=True, postgresql_where=text("tenant_role = 'primary'")),
    )


class LeaseAsset(Base):
    __tablename__ = "lease_asset"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("lease.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String, nullable=False)  # 'key', 'fob', 'controller'
    quantity = Column(Integer, nullable=False, default=1)

    # Relationships
    lease = relationship("Lease", back_populates="assets")

    __table_args__ = (
        CheckConstraint("asset_type IN ('key', 'fob', 'controller')", name="check_asset_type"),
    )

