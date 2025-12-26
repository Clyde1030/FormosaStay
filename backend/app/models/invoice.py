# app/models/invoice.py
from sqlalchemy import Column, BigInteger, Date, Numeric, ForeignKey, Index, CheckConstraint, text
from sqlalchemy.dialects.postgresql import ENUM
from app.models.base import Base, AuditMixin
from sqlalchemy.orm import relationship

# Define ENUM types
invoice_category_type = ENUM('房租', '電費', '罰款', '押金', name='invoice_category', create_type=False)
payment_status_type = ENUM('未交', '已交', '部分未交', '呆帳', '歸還', '取消', name='payment_status', create_type=False)


class Invoice(Base, AuditMixin):
    __tablename__ = "invoice"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("lease.id", ondelete="RESTRICT"), nullable=False)
    category = Column(invoice_category_type, nullable=False)  # '房租', '電費', '罰款', '押金'
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    due_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(payment_status_type, nullable=False)  # '未交', '已交', '部分未交', '呆帳', '歸還', '取消'

    # Relationships
    lease = relationship("Lease", back_populates="invoices")
    cash_flows = relationship("CashFlow", back_populates="invoice")

    __table_args__ = (
        CheckConstraint("due_amount >= 0", name="chk_invoice_due_amount"),
        CheckConstraint("paid_amount >= 0", name="chk_invoice_paid_amount"),
        Index("idx_invoice_lease", "lease_id"),
        Index("uq_invoice_period_active", "lease_id", "category", "period_start", "period_end", unique=True, postgresql_where=text("deleted_at IS NULL")),
    )

