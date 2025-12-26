# app/models/invoice.py
from sqlalchemy import Column, BigInteger, Date, Numeric, String, ForeignKey, Index, CheckConstraint, text
from app.models.base import Base, AuditMixin
from sqlalchemy.orm import relationship


class Invoice(Base, AuditMixin):
    __tablename__ = "invoice"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("lease.id"), nullable=False)
    category = Column(String, nullable=False)  # 'rent', 'electricity', 'penalty', 'deposit'
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    due_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String, nullable=False)  # 'unpaid', 'paid', 'partial', 'bad_debt', 'returned', 'canceled'

    # Relationships
    lease = relationship("Lease", back_populates="invoices")
    cash_flows = relationship("CashFlow", back_populates="invoice")

    __table_args__ = (
        CheckConstraint("category IN ('rent','electricity','penalty','deposit')", name="check_category"),
        CheckConstraint("status IN ('unpaid','paid','partial','bad_debt','returned','canceled')", name="check_status"),
        CheckConstraint("due_amount >= 0", name="check_due_amount_positive"),
        CheckConstraint("paid_amount >= 0", name="check_paid_amount_positive"),
        Index("idx_invoice_lease", "lease_id"),
        Index("uq_invoice_period_active", "lease_id", "category", "period_start", "period_end", unique=True, postgresql_where=text("deleted_at IS NULL")),
    )

