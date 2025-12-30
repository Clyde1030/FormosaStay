# app/models/electricity.py
from sqlalchemy import Column, BigInteger, Date, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, AuditMixin


class ElectricityRate(Base, AuditMixin):
    __tablename__ = "electricity_rate"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(BigInteger, ForeignKey("room.id"), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rate_per_kwh = Column(Numeric(10, 4), nullable=False)

    # Relationships
    room = relationship("Room", back_populates="electricity_rates")


class MeterReading(Base, AuditMixin):
    __tablename__ = "meter_reading"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(BigInteger, ForeignKey("room.id"), nullable=False)
    read_date = Column(Date, nullable=False)
    read_amount = Column(Numeric(10, 2), nullable=False)

    # Relationships
    room = relationship("Room", back_populates="meter_readings")

    __table_args__ = (
        Index("idx_meter_room_date", "room_id", "read_date"),
        Index("uq_meter_reading", "room_id", "read_date", unique=True),
    )

