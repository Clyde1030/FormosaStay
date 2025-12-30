# app/models/invoice.py
from sqlalchemy import Column, BigInteger, Date, Numeric, ForeignKey, Index, CheckConstraint, text, String, DateTime, func
from sqlalchemy.dialects.postgresql import ENUM
from app.models.base import Base, AuditMixin
from sqlalchemy.orm import relationship

# Define ENUM types
invoice_category_type = ENUM('rent', 'electricity', 'penalty', 'deposit', name='invoice_category', create_type=False)
payment_status_type = ENUM('unmatured', 'overdue', 'paid', 'partial', 'uncollectable', 'returned', 'canceled', name='payment_status', create_type=False)
adjustment_source_type = ENUM('promotion', 'manual', 'penalty', name='adjustment_source_type', create_type=False)


class Invoice(Base, AuditMixin):
    __tablename__ = "invoice"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("lease.id", ondelete="RESTRICT"), nullable=False)
    category = Column(invoice_category_type, nullable=False)  # 'rent', 'electricity', 'penalty', 'deposit'
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    due_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    payment_status = Column(payment_status_type, nullable=False)  # 'unmatured', 'overdue', 'paid', 'partial', 'uncollectable', 'returned', 'canceled'

    # Relationships
    lease = relationship("Lease", back_populates="invoices")
    cash_flows = relationship("CashFlow", back_populates="invoice")
    adjustments = relationship("InvoiceAdjustment", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("due_amount >= 0", name="chk_invoice_due_amount"),
        CheckConstraint("paid_amount >= 0", name="chk_invoice_paid_amount"),
        Index("idx_invoice_lease", "lease_id"),
        Index("uq_invoice_period_active", "lease_id", "category", "period_start", "period_end", unique=True, postgresql_where=text("deleted_at IS NULL")),
    )


class InvoiceAdjustment(Base):
    __tablename__ = "invoice_adjustment"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id = Column(BigInteger, ForeignKey("invoice.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(adjustment_source_type, nullable=False)  # 'promotion', 'manual', 'penalty'
    source_id = Column(BigInteger, nullable=True)  # Reference to source (e.g., lease_amendment id)
    description = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="adjustments")

