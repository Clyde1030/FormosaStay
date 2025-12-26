# app/models/cash_flow.py
from sqlalchemy import Column, BigInteger, String, Date, Numeric, ForeignKey, CheckConstraint, Index, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import relationship
from app.models.base import Base, AuditMixin

# Define ENUM types
cash_direction_type = ENUM('收入', '支出', '轉帳', name='cash_direction_type', create_type=False)
cash_account_type = ENUM('現金', '銀行', '第三方支付', name='cash_account_type', create_type=False)
payment_method_type = ENUM('現金', '銀行轉帳', 'LINE Pay', '其他', name='payment_method_type', create_type=False)


class CashFlowCategory(Base):
    __tablename__ = "cash_flow_category"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    direction = Column(cash_direction_type, nullable=False)  # '收入', '支出', '轉帳'
    description = Column(Text, nullable=True)

    # Relationships
    cash_flows = relationship("CashFlow", back_populates="category")


class CashAccount(Base):
    __tablename__ = "cash_account"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    account_type = Column(cash_account_type, nullable=False)  # '現金', '銀行', '第三方支付'
    note = Column(Text, nullable=True)

    # Relationships
    cash_flows = relationship("CashFlow", back_populates="cash_account")


class CashFlow(Base, AuditMixin):
    __tablename__ = "cash_flow"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_id = Column(BigInteger, ForeignKey("cash_flow_category.id"), nullable=False)
    cash_account_id = Column(BigInteger, ForeignKey("cash_account.id"), nullable=False)
    lease_id = Column(BigInteger, ForeignKey("lease.id"), nullable=True)
    building_id = Column(BigInteger, ForeignKey("building.id"), nullable=True)
    room_id = Column(BigInteger, ForeignKey("room.id"), nullable=True)
    invoice_id = Column(BigInteger, ForeignKey("invoice.id"), nullable=True)
    flow_date = Column(Date, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(payment_method_type, nullable=False)  # '現金', '銀行轉帳', 'LINE Pay', '其他'
    note = Column(Text, nullable=True)

    # Relationships
    category = relationship("CashFlowCategory", back_populates="cash_flows")
    cash_account = relationship("CashAccount", back_populates="cash_flows")
    lease = relationship("Lease", back_populates="cash_flows")
    building = relationship("Building", back_populates="cash_flows")
    room = relationship("Room", back_populates="cash_flows")
    invoice = relationship("Invoice", back_populates="cash_flows")
    attachments = relationship("CashFlowAttachment", back_populates="cash_flow", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_cf_amount"),
        CheckConstraint("(room_id IS NULL AND building_id IS NULL) OR (room_id IS NOT NULL AND building_id IS NOT NULL)", name="chk_cf_room_requires_building"),
        Index("idx_cf_date", "flow_date"),
        Index("idx_cf_category", "category_id"),
        Index("idx_cf_account", "cash_account_id"),
        Index("idx_cf_lease", "lease_id"),
    )


class CashFlowAttachment(Base, AuditMixin):
    __tablename__ = "cash_flow_attachment"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    cash_flow_id = Column(BigInteger, ForeignKey("cash_flow.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(String, nullable=False)

    # Relationships
    cash_flow = relationship("CashFlow", back_populates="attachments")

