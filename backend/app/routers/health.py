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
    """Database health check endpoint with detailed diagnostics"""
    try:
        # Test basic connection
        result = await db.execute(text("SELECT 1 as test"))
        test_value = result.scalar()
        
        # Get database version
        version_result = await db.execute(text("SELECT version()"))
        db_version = version_result.scalar()
        
        # Count tables
        tables_result = await db.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        table_count = tables_result.scalar()
        
        return {
            "status": "ok",
            "database": "connected",
            "test_query": test_value,
            "postgresql_version": db_version.split(',')[0] if db_version else "unknown",
            "tables_count": table_count
        }
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_trace = traceback.format_exc()
        print(f"Database connection error: {error_detail}")
        print(f"Traceback: {error_trace}")
        
        # Provide helpful error message
        error_message = f"Database connection failed: {error_detail}"
        if "connection refused" in error_detail.lower() or "could not connect" in error_detail.lower():
            error_message += " (Is PostgreSQL running?)"
        elif "authentication failed" in error_detail.lower():
            error_message += " (Check DATABASE_USER and DATABASE_PASSWORD in .env)"
        elif "does not exist" in error_detail.lower():
            error_message += " (Database doesn't exist. Create it with: createdb formosastay)"
        
        raise HTTPException(
            status_code=500,
            detail=error_message
        )