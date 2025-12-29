# app/services/invoice_service.py
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional


class InvoiceService:
    """Service for invoice and rent calculations"""

    @staticmethod
    def calculate_rent_amount(
        monthly_rent: Decimal,
        payment_term_months: int,
        discount: Decimal = Decimal("0")
    ) -> Decimal:
        """
        Calculate total rent amount based on monthly rent, payment term, and discount.
        
        Args:
            monthly_rent: Monthly rent amount
            payment_term_months: Number of months in the payment term (1, 3, 6, or 12)
            discount: Discount amount to apply (default: 0)
        
        Returns:
            Total rent amount after discount
        """
        if payment_term_months < 1:
            raise ValueError("payment_term_months must be at least 1")
        
        if discount < 0:
            raise ValueError("discount cannot be negative")
        
        total_amount = monthly_rent * payment_term_months
        final_amount = total_amount - discount
        
        # Ensure final amount is not negative
        if final_amount < 0:
            return Decimal("0")
        
        return final_amount

    @staticmethod
    def calculate_period_end(
        period_start: date,
        payment_term_months: int
    ) -> date:
        """
        Calculate period end date based on period start and payment term.
        
        The period end is calculated by adding the payment term months to the start date,
        then subtracting 1 day (so if start is Jan 1 and term is 1 month, end is Jan 31).
        
        Examples:
        - Start: 2024-01-01, Term: 1 month → End: 2024-01-31
        - Start: 2024-01-15, Term: 1 month → End: 2024-02-14
        - Start: 2024-01-31, Term: 1 month → End: 2024-02-29 (or 28 in non-leap years)
        
        Args:
            period_start: Start date of the payment period
            payment_term_months: Number of months in the payment term (1, 3, 6, or 12)
        
        Returns:
            Period end date
        """
        if payment_term_months < 1:
            raise ValueError("payment_term_months must be at least 1")
        
        # Calculate new year and month
        new_year = period_start.year
        new_month = period_start.month + payment_term_months
        
        # Handle year rollover
        while new_month > 12:
            new_month -= 12
            new_year += 1
        
        # Try to create the date with the same day of month
        # If the day doesn't exist in the target month (e.g., Jan 31 -> Feb 31),
        # Python's date constructor will raise ValueError
        try:
            # Add months: same day in the new month
            period_end = date(new_year, new_month, period_start.day)
        except ValueError:
            # Day doesn't exist in target month (e.g., Jan 31 -> Feb 31)
            # Get the last day of the target month
            if new_month == 12:
                next_month = 1
                next_year = new_year + 1
            else:
                next_month = new_month + 1
                next_year = new_year
            first_of_next = date(next_year, next_month, 1)
            period_end = first_of_next - timedelta(days=1)
        
        # Subtract 1 day to get the period end
        period_end = period_end - timedelta(days=1)
        
        return period_end

    @staticmethod
    def format_rent_note(
        base_note: Optional[str],
        discount: Decimal
    ) -> str:
        """
        Format rent payment note with discount information if applicable.
        
        Args:
            base_note: Base note text (optional)
            discount: Discount amount applied
        
        Returns:
            Formatted note string with discount information if discount > 0
        """
        if discount > 0:
            discount_text = f" (Includes NT${discount:,.0f} discount)"
            if base_note:
                return f"{base_note}{discount_text}".strip()
            else:
                return discount_text.strip()
        else:
            return base_note or ""

