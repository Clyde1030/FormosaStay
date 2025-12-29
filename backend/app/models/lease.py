# app/models/lease.py
from sqlalchemy import Column, BigInteger, Date, Numeric, SmallInteger, String, ForeignKey, CheckConstraint, Index, text
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import relationship
from datetime import date
from app.models.base import Base, AuditMixin

# Define ENUM types
payment_term_type = ENUM('annual', 'semi-annual', 'seasonal', 'monthly', name='payment_term_type', create_type=False)
tenant_role_type = ENUM('primary', 'secondary', name='tenant_role_type', create_type=False)


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
    payment_term = Column(payment_term_type, nullable=False)  # 'annual', 'semi-annual', 'seasonal', 'monthly'
    assets = Column(JSONB, nullable=True)  # JSONB array of assets: [{"type": "鑰匙", "quantity": 1}, ...]
    vehicle_plate = Column(String, nullable=True)  # Vehicle/motorcycle plate number

    # Relationships
    room = relationship("Room", back_populates="leases")
    tenants = relationship("LeaseTenant", back_populates="lease", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="lease")  # No cascade - keep invoices for audit even if lease is deleted
    cash_flows = relationship("CashFlow", back_populates="lease")

    def get_status(self) -> str:
        """
        Calculate lease status based on business rules:
        - IF early_termination_date IS NOT NULL → terminated
        - ELSE IF today < start_date → pending
        - ELSE IF today BETWEEN start_date AND end_date → active
        - ELSE → expired
        """
        today = date.today()
        if self.early_termination_date is not None:
            return "terminated"
        elif today < self.start_date:
            return "pending"
        elif self.start_date <= today <= self.end_date:
            return "active"
        else:
            return "expired"

    @property
    def status(self) -> str:
        """Property for backward compatibility"""
        return self.get_status()

    __table_args__ = (
        CheckConstraint("end_date > start_date", name="chk_lease_dates"),
        CheckConstraint("early_termination_date IS NULL OR (early_termination_date >= start_date AND early_termination_date <= end_date)", name="chk_early_termination"),
        CheckConstraint("pay_rent_on BETWEEN 1 AND 31", name="chk_pay_rent_on"),
        CheckConstraint("monthly_rent >= 0", name="chk_monthly_rent"),
        CheckConstraint("deposit >= 0", name="chk_deposit"),
        Index("idx_lease_room", "room_id"),
        # Note: Unique constraint for active leases per room cannot be enforced via partial index
        # because CURRENT_DATE is not immutable. Uniqueness is enforced at application level
        # in lease_service.py which checks for active leases before creating new ones.
    )


class LeaseTenant(Base):
    __tablename__ = "lease_tenant"

    lease_id = Column(BigInteger, ForeignKey("lease.id", ondelete="CASCADE"), primary_key=True)
    tenant_id = Column(BigInteger, ForeignKey("tenant.id", ondelete="RESTRICT"), primary_key=True)
    tenant_role = Column(tenant_role_type, nullable=False)  # 'primary', 'secondary'
    joined_at = Column(Date, nullable=True, server_default=text("CURRENT_DATE"))

    # Relationships
    lease = relationship("Lease", back_populates="tenants")
    tenant = relationship("Tenant", back_populates="lease_tenants")

    __table_args__ = (
        Index("uq_primary_tenant", "lease_id", unique=True, postgresql_where=text("tenant_role = 'primary'")),
    )

