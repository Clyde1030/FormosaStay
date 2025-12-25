# app/models/lease.py
from sqlalchemy import Column, BigInteger, Integer, Date, Numeric, SmallInteger, String, ForeignKey, CheckConstraint, Index, text
from sqlalchemy.orm import relationship
from app.models.base import Base, AuditMixin


class Lease(Base, AuditMixin):
    __tablename__ = "lease"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(BigInteger, ForeignKey("tenant.id"), nullable=False)
    room_id = Column(BigInteger, ForeignKey("room.id"), nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    early_termination_date = Column(Date, nullable=True)

    monthly_rent = Column(Numeric(10, 2), nullable=False)
    deposit = Column(Numeric(10, 2), nullable=False)
    pay_rent_on = Column(SmallInteger, nullable=False)  # 1-31
    payment_term = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'active', 'terminated', 'expired'

    # Relationships
    tenant = relationship("Tenant", back_populates="leases")
    room = relationship("Room", back_populates="leases")
    assets = relationship("LeaseAsset", back_populates="lease", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="lease")  # No cascade - keep payments for audit even if lease is deleted
    cash_flows = relationship("CashFlow", back_populates="lease")

    __table_args__ = (
        CheckConstraint("pay_rent_on BETWEEN 1 AND 31", name="check_pay_rent_on"),
        CheckConstraint("status IN ('active','terminated','expired')", name="check_status"),
        Index("idx_lease_room", "room_id"),
        Index("uq_active_lease_per_room", "room_id", unique=True, postgresql_where=text("status = 'active'")),
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

