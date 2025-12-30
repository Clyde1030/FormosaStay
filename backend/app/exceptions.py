# app/exceptions.py
"""Domain exceptions for business logic violations"""

from fastapi import HTTPException, status


class DomainError(HTTPException):
    """Base class for domain errors"""
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class LeaseNotEditableError(DomainError):
    """Raised when attempting to edit a lease that cannot be edited"""
    def __init__(self, detail: str):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)


class LeaseAmendmentError(DomainError):
    """Raised when lease amendment rules are violated"""
    def __init__(self, detail: str):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)

