# app/models/room.py
from sqlalchemy import Column, BigInteger, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, AuditMixin


class Room(Base, AuditMixin):
    __tablename__ = "room"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    building_id = Column(BigInteger, ForeignKey("building.id", ondelete="CASCADE"), nullable=False)
    floor_no = Column(Integer, nullable=False)
    room_no = Column(String(1), nullable=False)
    size_ping = Column(Numeric(6, 2), nullable=True)

    # Relationships
    building = relationship("Building", back_populates="rooms")
    leases = relationship("Lease", back_populates="room")
    electricity_rates = relationship("ElectricityRate", back_populates="room", cascade="all, delete-orphan")
    meter_readings = relationship("MeterReading", back_populates="room", cascade="all, delete-orphan")
    cash_flows = relationship("CashFlow", back_populates="room")

