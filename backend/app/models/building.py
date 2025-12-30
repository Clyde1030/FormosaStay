# app/models/building.py
from sqlalchemy import Column, BigInteger, Integer, Text
from sqlalchemy.orm import relationship
from app.models.base import Base, AuditMixin


class Building(Base, AuditMixin):
    __tablename__ = "building"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    building_no = Column(Integer, nullable=False, unique=True)
    address = Column(Text, nullable=False)
    landlord_name = Column(Text, nullable=True)
    landlord_address = Column(Text, nullable=True)

    # Relationships
    rooms = relationship("Room", back_populates="building", cascade="all, delete-orphan")
    cash_flows = relationship("CashFlow", back_populates="building")

