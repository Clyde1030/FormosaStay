# app/models/payment.py
from sqlalchemy import Column, BigInteger, Date, Numeric, String, ForeignKey, Index, CheckConstraint
from app.models.base import Base, AuditMixin
from sqlalchemy.orm import relationship


class Payment(Base, AuditMixin):
    __tablename__ = "payment"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lease_id = Column(BigInteger, ForeignKey("lease.id"), nullable=False)
    category = Column(String, nullable=False)  # 'rent', 'electricity', 'penalty'
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    due_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String, nullable=False)  # 'unpaid', 'paid', 'partial', 'bad_debt'

    # Relationships
    lease = relationship("Lease", back_populates="payments")

    __table_args__ = (
        CheckConstraint("category IN ('rent','electricity','penalty')", name="check_category"),
        CheckConstraint("status IN ('unpaid','paid','partial','bad_debt')", name="check_status"),
        Index("idx_payment_lease", "lease_id"),
        Index("uq_payment_period", "lease_id", "category", "period_start", "period_end", unique=True),
    )

