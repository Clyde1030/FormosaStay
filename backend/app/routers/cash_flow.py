# app/routers/cash_flow.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.models.cash_flow import CashFlowCategory, CashFlow, CashAccount
from app.schemas.cash_flow import (
    CashFlowCategoryResponse,
    CashFlowCreate,
    CashFlowUpdate,
    CashFlowResponse
)

router = APIRouter(prefix="/cash-flow", tags=["Cash Flow"])


@router.get("/categories", response_model=List[CashFlowCategoryResponse])
async def list_cash_flow_categories(
    category_group: Optional[str] = Query(None, description="Filter by category_group (e.g., 'tenant', 'operation')"),
    db: AsyncSession = Depends(get_db)
):
    """List all cash flow categories, optionally filtered by category_group"""
    try:
        query = select(CashFlowCategory).order_by(CashFlowCategory.id)
        
        if category_group:
            query = query.where(CashFlowCategory.category_group == category_group)
        
        result = await db.execute(query)
        categories = result.scalars().all()
        
        return [CashFlowCategoryResponse(
            id=c.id,
            code=c.code,
            chinese_name=c.chinese_name,
            direction=c.direction,
            category_group=c.category_group
        ) for c in categories]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching cash flow categories: {str(e)}"
        ) from e


@router.get("/", response_model=List[dict])
async def list_cash_flows(
    direction: Optional[str] = Query(None, description="Filter by direction ('in', 'out', 'transfer')"),
    db: AsyncSession = Depends(get_db)
):
    """List all cash flow entries, optionally filtered by direction"""
    try:
        query = (
            select(CashFlow, CashFlowCategory)
            .join(CashFlowCategory, CashFlow.category_id == CashFlowCategory.id)
        )
        
        if direction:
            query = query.where(CashFlowCategory.direction == direction)
        
        query = query.order_by(CashFlow.flow_date.desc())
        
        result = await db.execute(query)
        flows = result.all()
        
        return [
            {
                "id": flow.id,
                "category_id": flow.category_id,
                "cash_account_id": flow.cash_account_id,
                "lease_id": flow.lease_id,
                "building_id": flow.building_id,
                "room_id": flow.room_id,
                "flow_date": flow.flow_date.isoformat() if flow.flow_date else None,
                "amount": float(flow.amount),
                "payment_method": flow.payment_method,
                "note": flow.note,
                "category_name": category.chinese_name,
                "category_code": category.code,
                "category_direction": category.direction,
                "direction": category.direction
            }
            for flow, category in flows
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching cash flows: {str(e)}"
        ) from e


@router.post("/", response_model=CashFlowResponse)
async def create_cash_flow(
    cash_flow: CashFlowCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new cash flow entry"""
    try:
        # Verify category exists
        category_result = await db.execute(
            select(CashFlowCategory).where(CashFlowCategory.id == cash_flow.category_id)
        )
        category = category_result.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cash flow category with id {cash_flow.category_id} not found"
            )
        
        # Verify cash account exists
        account_result = await db.execute(
            select(CashAccount).where(CashAccount.id == cash_flow.cash_account_id)
        )
        account = account_result.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cash account with id {cash_flow.cash_account_id} not found"
            )
        
        # Create cash flow entry
        new_cash_flow = CashFlow(
            category_id=cash_flow.category_id,
            cash_account_id=cash_flow.cash_account_id,
            lease_id=cash_flow.lease_id,
            building_id=cash_flow.building_id,
            room_id=cash_flow.room_id,
            flow_date=cash_flow.flow_date,
            amount=cash_flow.amount,
            payment_method=cash_flow.payment_method,
            note=cash_flow.note
        )
        
        db.add(new_cash_flow)
        await db.commit()
        await db.refresh(new_cash_flow)
        
        return CashFlowResponse(
            id=new_cash_flow.id,
            category_id=new_cash_flow.category_id,
            cash_account_id=new_cash_flow.cash_account_id,
            lease_id=new_cash_flow.lease_id,
            building_id=new_cash_flow.building_id,
            room_id=new_cash_flow.room_id,
            flow_date=new_cash_flow.flow_date,
            amount=new_cash_flow.amount,
            payment_method=new_cash_flow.payment_method,
            note=new_cash_flow.note,
            category_name=category.chinese_name,
            category_code=category.code
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating cash flow: {str(e)}"
        ) from e


@router.put("/{cash_flow_id}", response_model=CashFlowResponse)
async def update_cash_flow(
    cash_flow_id: int,
    cash_flow_update: CashFlowUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a cash flow entry"""
    try:
        result = await db.execute(
            select(CashFlow).where(CashFlow.id == cash_flow_id)
        )
        cash_flow = result.scalar_one_or_none()
        
        if not cash_flow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cash flow with id {cash_flow_id} not found"
            )
        
        # Update fields if provided
        if cash_flow_update.category_id is not None:
            category_result = await db.execute(
                select(CashFlowCategory).where(CashFlowCategory.id == cash_flow_update.category_id)
            )
            if not category_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Cash flow category with id {cash_flow_update.category_id} not found"
                )
            cash_flow.category_id = cash_flow_update.category_id
        
        if cash_flow_update.cash_account_id is not None:
            account_result = await db.execute(
                select(CashAccount).where(CashAccount.id == cash_flow_update.cash_account_id)
            )
            if not account_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Cash account with id {cash_flow_update.cash_account_id} not found"
                )
            cash_flow.cash_account_id = cash_flow_update.cash_account_id
        
        if cash_flow_update.lease_id is not None:
            cash_flow.lease_id = cash_flow_update.lease_id
        if cash_flow_update.building_id is not None:
            cash_flow.building_id = cash_flow_update.building_id
        if cash_flow_update.room_id is not None:
            cash_flow.room_id = cash_flow_update.room_id
        if cash_flow_update.flow_date is not None:
            cash_flow.flow_date = cash_flow_update.flow_date
        if cash_flow_update.amount is not None:
            cash_flow.amount = cash_flow_update.amount
        if cash_flow_update.payment_method is not None:
            cash_flow.payment_method = cash_flow_update.payment_method
        if cash_flow_update.note is not None:
            cash_flow.note = cash_flow_update.note
        
        await db.commit()
        await db.refresh(cash_flow)
        
        # Get category for response
        category_result = await db.execute(
            select(CashFlowCategory).where(CashFlowCategory.id == cash_flow.category_id)
        )
        category = category_result.scalar_one()
        
        return CashFlowResponse(
            id=cash_flow.id,
            category_id=cash_flow.category_id,
            cash_account_id=cash_flow.cash_account_id,
            lease_id=cash_flow.lease_id,
            building_id=cash_flow.building_id,
            room_id=cash_flow.room_id,
            flow_date=cash_flow.flow_date,
            amount=cash_flow.amount,
            payment_method=cash_flow.payment_method,
            note=cash_flow.note,
            category_name=category.chinese_name,
            category_code=category.code
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating cash flow: {str(e)}"
        ) from e


@router.delete("/{cash_flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cash_flow(
    cash_flow_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a cash flow entry"""
    try:
        result = await db.execute(
            select(CashFlow).where(CashFlow.id == cash_flow_id)
        )
        cash_flow = result.scalar_one_or_none()
        
        if not cash_flow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cash flow with id {cash_flow_id} not found"
            )
        
        await db.delete(cash_flow)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting cash flow: {str(e)}"
        ) from e


@router.get("/accounts", response_model=List[dict])
async def list_cash_accounts(db: AsyncSession = Depends(get_db)):
    """List all cash accounts"""
    try:
        result = await db.execute(select(CashAccount).order_by(CashAccount.id))
        accounts = result.scalars().all()
        
        return [
            {
                "id": a.id,
                "name": a.chinese_name,
                "account_type": a.account_type,
                "note": a.note,
            }
            for a in accounts
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching cash accounts: {str(e)}"
        ) from e

