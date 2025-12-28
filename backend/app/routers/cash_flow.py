# app/routers/cash_flow.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.cash_flow import CashFlowCategory

router = APIRouter(prefix="/cash-flow", tags=["Cash Flow"])


@router.get("/categories", response_model=List[dict])
async def list_cash_flow_categories(db: AsyncSession = Depends(get_db)):
    """List all cash flow categories"""
    try:
        result = await db.execute(select(CashFlowCategory).order_by(CashFlowCategory.id))
        categories = result.scalars().all()
        
        return [
            {
                "id": c.id,
                "code": c.code,
                "name": c.name,
                "direction": c.direction,
                "description": c.description,
            }
            for c in categories
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching cash flow categories: {str(e)}"
        ) from e

