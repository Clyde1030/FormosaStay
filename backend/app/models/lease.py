# app/models/lease.py
from sqlalchemy import Column, BigInteger, Date, Numeric, SmallInteger, String, ForeignKey, CheckConstraint, Index, text, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import relationship
from datetime import date
from typing import Optional
from app.models.base import Base, AuditMixin

# Define ENUM types
payment_term_type = ENUM('annual', 'semi-annual', 'seasonal', 'monthly', name='payment_term_type', create_type=False)
tenant_role_type = ENUM('primary', 'secondary', name='tenant_role_type', create_type=False)
lease_amendment_type = ENUM('rent_change', 'discount', 'other', name='lease_amendment_type', create_type=False)
discount_type = ENUM('free_months', 'fixed_amount', 'percentage', name='discount_type', create_type=False)


class Lease(Base, AuditMixin):
    __tablename__ = "lease"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(BigInteger, ForeignKey("room.id"), nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    terminated_at = Column(Date, nullable=True)  # Date when lease was terminated
    termination_reason = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)  # When lease was submitted (moves from draft to pending)

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
    amendments = relationship("LeaseAmendment", back_populates="lease", cascade="all, delete-orphan")

    def get_status(self, today: Optional[date] = None) -> str:
        """
        Calculate lease status based on business rules.
        Status is derived from facts, not manually editable.
        
        Rules:
        - terminated: terminated_at IS NOT NULL
        - expired: today > end_date AND terminated_at IS NULL
        - pending: today < start_date AND submitted_at IS NOT NULL
        - draft: today < start_date AND submitted_at IS NULL
        - active: today >= start_date AND today <= end_date AND terminated_at IS NULL
        """
        if today is None:
            today = date.today()
        
        terminated_at = self.terminated_at
        
        if terminated_at is not None:
            return "terminated"
        elif today > self.end_date:
            return "expired"
        elif today < self.start_date:
            if self.submitted_at is not None:
                return "pending"
            else:
                return "draft"
        else:  # today >= start_date AND today <= end_date
            return "active"

    @property
    def status(self) -> str:
        """Property for backward compatibility - recalculates on read"""
        return self.get_status()

    __table_args__ = (
        CheckConstraint("end_date > start_date", name="chk_lease_dates"),
        CheckConstraint("terminated_at IS NULL OR (terminated_at >= start_date AND terminated_at <= end_date)", name="chk_termination"),
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


class LeaseAmendment(Base):
    __tablename__ = "lease_amendment"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("lease.id"), nullable=False)
    amendment_type = Column(lease_amendment_type, nullable=False)  # 'rent_change', 'discount', 'other'
    effective_date = Column(Date, nullable=False)

    # Financial deltas (nullable depending on amendment_type)
    old_monthly_rent = Column(Numeric(10, 2), nullable=True)
    new_monthly_rent = Column(Numeric(10, 2), nullable=True)

    # DISCOUNT fields
    discount_type = Column(discount_type, nullable=True)  # 'free_months', 'fixed_amount', 'percentage'
    discount_value = Column(Numeric(10, 2), nullable=True)
    applies_to_payment_term = Column(payment_term_type, nullable=True)
    billing_cycle_months = Column(Integer, nullable=True)

    reason = Column(String, nullable=False)
    created_by = Column(BigInteger, ForeignKey("user_account.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    lease = relationship("Lease", back_populates="amendments")

    __table_args__ = (
        # Rent change amendments must have both values
        CheckConstraint(
            "amendment_type <> 'rent_change' OR (old_monthly_rent IS NOT NULL AND new_monthly_rent IS NOT NULL AND old_monthly_rent >= 0 AND new_monthly_rent >= 0)",
            name="chk_rent_change_values"
        ),
        # Discount amendments must have discount_type and discount_value
        CheckConstraint(
            "amendment_type <> 'discount' OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)",
            name="chk_discount_values"
        ),
        Index("uq_rent_change_effective", "lease_id", "effective_date", unique=True, postgresql_where=text("amendment_type = 'rent_change' AND deleted_at IS NULL")),
    )

