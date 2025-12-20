from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health():
    """Basic health check endpoint"""
    return {"status": "ok"}


@router.get("/health/db", tags=["Health"])
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """Database health check endpoint"""
    try:
        result = await db.execute(text("SELECT 1"))
        value = result.scalar()
        return {
            "status": "ok",
            "db": value
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )