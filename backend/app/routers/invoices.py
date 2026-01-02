# app/routers/invoices.py
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import date

from app.db.session import get_db
from app.models.invoice import Invoice
from app.models.lease import Lease
from app.models.room import Room
from app.models.tenant import Tenant
from app.models.lease import LeaseTenant
from app.models.cash_flow import CashFlow, CashFlowCategory, CashAccount
from app.schemas.invoice import (
    RentCalculationRequest,
    RentCalculationResponse,
    PeriodEndCalculationRequest,
    PeriodEndCalculationResponse,
    RentNoteRequest,
    RentNoteResponse,
    InvoiceTransactionCreate,
    InvoiceTransactionUpdate,
    InvoiceTransactionResponse
)
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.post("/calculate-rent", response_model=RentCalculationResponse)
async def calculate_rent_amount(request: RentCalculationRequest):
    """
    Calculate total rent amount based on monthly rent, payment term, and discount.
    
    Business rules:
    - Total = (monthly_rent * payment_term_months) - discount
    - Final amount cannot be negative (returns 0 if discount exceeds total)
    """
    try:
        total_amount = InvoiceService.calculate_rent_amount(
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
        period_end = InvoiceService.calculate_period_end(
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
        formatted_note = InvoiceService.format_rent_note(
            base_note=request.base_note,
            discount=request.discount
        )
        
        return RentNoteResponse(formatted_note=formatted_note)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error formatting rent note: {str(e)}"
        ) from e


async def get_or_create_default_cash_account(db: AsyncSession) -> int:
    """Get or create a default cash account"""
    result = await db.execute(select(CashAccount).limit(1))
    account = result.scalar_one_or_none()
    
    if not account:
        # Create default account
        default_account = CashAccount(
            name="Default Account",
            account_type="bank"
        )
        db.add(default_account)
        await db.flush()
        return default_account.id
    
    return account.id


def map_category_to_invoice_category(category: str) -> str:
    """Map frontend category to invoice category"""
    mapping = {
        'Rent': 'rent',
        'Electricity': 'electricity',
        'Deposit': 'deposit',
        'Fee': 'penalty'
    }
    return mapping.get(category, 'rent')




@router.post("/", response_model=InvoiceTransactionResponse)
async def create_invoice_transaction(
    invoice: InvoiceTransactionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create an invoice transaction (rent, electricity, deposit, fee)"""
    try:
        # Get or infer lease_id
        lease_id = invoice.lease_id
        if not lease_id:
            # Get active lease for the room
            room_result = await db.execute(
                select(Room).where(Room.id == invoice.room_id)
            )
            room = room_result.scalar_one_or_none()
            if not room:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Room with id {invoice.room_id} not found"
                )
            
            # Get active lease for this room (submitted, not terminated, and within date range)
            lease_result = await db.execute(
                select(Lease).where(
                    and_(
                        Lease.room_id == invoice.room_id,
                        ~Lease.submitted_at.is_(None),
                        Lease.terminated_at.is_(None),
                        Lease.start_date <= func.current_date(),
                        Lease.end_date >= func.current_date()
                    )
                ).order_by(Lease.start_date.desc())
            )
            lease = lease_result.scalar_one_or_none()
            if not lease:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No active lease found for room {invoice.room_id}"
                )
            lease_id = lease.id
        
        # Verify lease exists
        lease_result = await db.execute(
            select(Lease).where(Lease.id == lease_id)
        )
        lease = lease_result.scalar_one_or_none()
        if not lease:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lease with id {lease_id} not found"
            )
        
        # Get tenant name
        tenant_result = await db.execute(
            select(Tenant, LeaseTenant)
            .join(LeaseTenant, Tenant.id == LeaseTenant.tenant_id)
            .where(
                LeaseTenant.lease_id == lease_id,
                LeaseTenant.tenant_role == 'primary'
            )
        )
        tenant_data = tenant_result.first()
        tenant_name = f"{tenant_data[0].last_name}{tenant_data[0].first_name}" if tenant_data else "Unknown"
        
        # Set period dates - use provided or default to due_date
        period_start = invoice.period_start or invoice.due_date
        period_end = invoice.period_end or invoice.due_date
        
        # Create invoice
        invoice_obj = Invoice(
            lease_id=lease_id,
            category=invoice.category,
            period_start=period_start,
            period_end=period_end,
            due_date=invoice.due_date,
            due_amount=invoice.amount,
            paid_amount=invoice.amount if invoice.status == "paid" else 0,
            status=invoice.status
        )
        
        db.add(invoice_obj)
        await db.flush()
        
        # Create cash flow entry
        # Map invoice category to cash flow category code
        invoice_to_cf_category_map = {
            'rent': 'rent',
            'electricity': 'tenant_electricity',
            'deposit': 'deposit_received',
            'penalty': 'misc'
        }
        category_code = invoice_to_cf_category_map.get(invoice.category, 'rent')
        category_result = await db.execute(
            select(CashFlowCategory).where(CashFlowCategory.code == category_code)
        )
        cash_flow_category = category_result.scalar_one_or_none()
        
        if not cash_flow_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cash flow category with code {category_code} not found"
            )
        
        # Get or create default cash account
        cash_account_id = invoice.cash_account_id or await get_or_create_default_cash_account(db)
        
        # Get room for building_id
        room_result = await db.execute(
            select(Room).where(Room.id == invoice.room_id)
        )
        room = room_result.scalar_one()
        
        # Map payment method
        payment_method_map = {
            'bank': 'bank',
            'Transfer': 'bank',
            'cash': 'cash',
            'Cash': 'cash',
            'LINE_Pay': 'LINE_Pay',
            'LINE Pay': 'LINE_Pay',
            'LinePay': 'LINE_Pay',
            'other': 'other',
            'Other': 'other'
        }
        backend_payment_method = payment_method_map.get(invoice.payment_method or "Transfer", 'bank')
        
        # Create cash flow
        cash_flow = CashFlow(
            category_id=cash_flow_category.id,
            cash_account_id=cash_account_id,
            lease_id=lease_id,
            building_id=room.building_id,
            room_id=invoice.room_id,
            invoice_id=invoice_obj.id,
            flow_date=invoice.paid_date or invoice.due_date,
            amount=invoice.amount,
            payment_method=backend_payment_method,
            note=invoice.note
        )
        
        db.add(cash_flow)
        await db.commit()
        await db.refresh(invoice_obj)
        
        return InvoiceTransactionResponse(
            id=invoice_obj.id,
            invoice_id=invoice_obj.id,
            room_id=invoice.room_id,
            lease_id=lease_id,
            tenant_name=tenant_name,
            category=invoice.category,
            amount=invoice.amount,
            due_date=invoice.due_date,
            period_start=period_start,
            period_end=period_end,
            status=invoice.status,
            paid_date=invoice.paid_date,
            payment_method=invoice.payment_method,
            note=invoice.note
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating invoice transaction: {str(e)}"
        ) from e


@router.get("/", response_model=List[InvoiceTransactionResponse])
async def list_invoice_transactions(
    db: AsyncSession = Depends(get_db)
):
    """List all invoice transactions"""
    try:
        result = await db.execute(
            select(Invoice, Lease, Room, Tenant, LeaseTenant)
            .join(Lease, Invoice.lease_id == Lease.id)
            .join(Room, Lease.room_id == Room.id)
            .join(LeaseTenant, Lease.id == LeaseTenant.lease_id)
            .join(Tenant, LeaseTenant.tenant_id == Tenant.id)
            .where(LeaseTenant.tenant_role == 'primary')
            .order_by(Invoice.due_date.desc())
        )
        transactions = result.all()
        
        return [
            InvoiceTransactionResponse(
                id=inv.id,
                invoice_id=inv.id,
                room_id=lease.room_id,
                lease_id=lease.id,
                tenant_name=f"{tenant.last_name}{tenant.first_name}",
                category=inv.category,
                amount=inv.due_amount,
                due_date=inv.due_date,
                period_start=inv.period_start,
                period_end=inv.period_end,
                status=inv.status,
                paid_date=inv.due_date if inv.status == "paid" else None,
                payment_method=None,
                note=None
            )
            for inv, lease, room, tenant, lt in transactions
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching invoice transactions: {str(e)}"
        ) from e


@router.put("/{invoice_id}", response_model=InvoiceTransactionResponse)
async def update_invoice_transaction(
    invoice_id: int,
    invoice_update: InvoiceTransactionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an invoice transaction"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice transaction with id {invoice_id} not found"
            )
        
        # Update invoice fields
        if invoice_update.category is not None:
            invoice.category = invoice_update.category
        if invoice_update.amount is not None:
            invoice.due_amount = invoice_update.amount
            if invoice.status == "paid":
                invoice.paid_amount = invoice_update.amount
        if invoice_update.due_date is not None:
            invoice.due_date = invoice_update.due_date
        if invoice_update.period_start is not None:
            invoice.period_start = invoice_update.period_start
        if invoice_update.period_end is not None:
            invoice.period_end = invoice_update.period_end
        if invoice_update.status is not None:
            invoice.status = invoice_update.status
            if invoice_update.status == "paid" and invoice_update.amount:
                invoice.paid_amount = invoice_update.amount
            elif invoice_update.status != "paid":
                invoice.paid_amount = 0
        
        await db.commit()
        await db.refresh(invoice)
        
        # Get related data for response
        lease_result = await db.execute(
            select(Lease).where(Lease.id == invoice.lease_id)
        )
        lease = lease_result.scalar_one()
        
        tenant_result = await db.execute(
            select(Tenant, LeaseTenant)
            .join(LeaseTenant, Tenant.id == LeaseTenant.tenant_id)
            .where(
                LeaseTenant.lease_id == invoice.lease_id,
                LeaseTenant.tenant_role == 'primary'
            )
        )
        tenant_data = tenant_result.first()
        tenant_name = f"{tenant_data[0].last_name}{tenant_data[0].first_name}" if tenant_data else "Unknown"
        
        return InvoiceTransactionResponse(
            id=invoice.id,
            invoice_id=invoice.id,
            room_id=lease.room_id,
            lease_id=lease.id,
            tenant_name=tenant_name,
            category=invoice.category,
            amount=invoice.due_amount,
            due_date=invoice.due_date,
            period_start=invoice.period_start,
            period_end=invoice.period_end,
            status=invoice.status,
            paid_date=invoice_update.paid_date,
            payment_method=invoice_update.payment_method,
            note=invoice_update.note
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating invoice transaction: {str(e)}"
        ) from e


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice_transaction(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an invoice transaction"""
    try:
        result = await db.execute(
            select(Invoice).where(Invoice.id == invoice_id)
        )
        invoice = result.scalar_one_or_none()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice transaction with id {invoice_id} not found"
            )
        
        await db.delete(invoice)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting invoice transaction: {str(e)}"
        ) from e

