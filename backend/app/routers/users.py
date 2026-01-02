# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/manager", response_model=dict)
async def get_manager(db: AsyncSession = Depends(get_db)):
    """Get manager information from v_user_role where role = 'manager'"""
    try:
        result = await db.execute(
            text("""
                SELECT employee_name, employee_phone 
                FROM v_user_role 
                WHERE role = 'manager' AND is_active = true
                LIMIT 1
            """)
        )
        row = result.mappings().first()
        
        if not row:
            # Return default values if no manager found
            return {
                "name": None,
                "phone": None
            }
        
        return {
            "name": row['employee_name'],
            "phone": row['employee_phone']
        }
    except Exception as e:
        # If view doesn't exist or other error, return default values
        return {
            "name": None,
            "phone": None
        }

