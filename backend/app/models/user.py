# app/models/user.py
from sqlalchemy import Column, BigInteger, String, Boolean, ForeignKey, SmallInteger
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class UserAccount(Base, TimestampMixin):
    __tablename__ = "user_account"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "role"

    id = Column(SmallInteger, primary_key=True, autoincrement=True)
    code = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)

    # Relationships
    users = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_role"

    user_id = Column(BigInteger, ForeignKey("user_account.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(SmallInteger, ForeignKey("role.id", ondelete="CASCADE"), primary_key=True)

    # Relationships
    user = relationship("UserAccount", back_populates="roles")
    role = relationship("Role", back_populates="users")

