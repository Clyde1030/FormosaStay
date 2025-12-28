# app/routers/payments.py
from fastapi import APIRouter, HTTPException, status

from app.schemas.payment import (
    RentCalculationRequest,
    RentCalculationResponse,
    PeriodEndCalculationRequest,
    PeriodEndCalculationResponse,
    RentNoteRequest,
    RentNoteResponse
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/calculate-rent", response_model=RentCalculationResponse)
async def calculate_rent_amount(request: RentCalculationRequest):
    """
    Calculate total rent amount based on monthly rent, payment term, and discount.
    
    Business rules:
    - Total = (monthly_rent * payment_term_months) - discount
    - Final amount cannot be negative (returns 0 if discount exceeds total)
    """
    try:
        total_amount = PaymentService.calculate_rent_amount(
            monthly_rent=request.monthly_rent,
            payment_term_months=request.payment_term_months,
            discount=request.discount
        )
        
        base_amount = request.monthly_rent * request.payment_term_months
        
        return RentCalculationResponse(
            total_amount=total_amount,
            base_amount=base_amount,
            discount=request.discount
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating rent amount: {str(e)}"
        ) from e


@router.post("/calculate-period-end", response_model=PeriodEndCalculationResponse)
async def calculate_period_end(request: PeriodEndCalculationRequest):
    """
    Calculate period end date based on period start and payment term.
    
    Business rules:
    - Period end = period_start + payment_term_months - 1 day
    - Example: If start is 2024-01-01 and term is 1 month, end is 2024-01-31
    """
    try:
        period_end = PaymentService.calculate_period_end(
            period_start=request.period_start,
            payment_term_months=request.payment_term_months
        )
        
        return PeriodEndCalculationResponse(period_end=period_end)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating period end: {str(e)}"
        ) from e


@router.post("/format-rent-note", response_model=RentNoteResponse)
async def format_rent_note(request: RentNoteRequest):
    """
    Format rent payment note with discount information if applicable.
    
    Business rules:
    - If discount > 0, appends discount information to note
    - Format: "{base_note} (Includes NT${discount} discount)" if base_note exists
    - Format: "(Includes NT${discount} discount)" if base_note is empty
    - Returns base_note as-is if discount is 0
    """
    try:
        formatted_note = PaymentService.format_rent_note(
            base_note=request.base_note,
            discount=request.discount
        )
        
        return RentNoteResponse(formatted_note=formatted_note)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error formatting rent note: {str(e)}"
        ) from e

