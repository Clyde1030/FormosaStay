# app/models/base.py
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, BigInteger, DateTime, func
from datetime import datetime

Base = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuditMixin(TimestampMixin):
    """Mixin for audit fields (created_by, updated_by)"""
    created_by = Column(BigInteger, nullable=True)
    updated_by = Column(BigInteger, nullable=True)

