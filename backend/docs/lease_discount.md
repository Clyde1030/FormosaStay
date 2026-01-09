GOAL
Add backend functionality to support creating a new lease contract with invoice-level discounts
(using invoice_discount), without modifying lease financial terms or creating lease amendments.

SCOPE
- Backend only
- PostgreSQL
- Existing tables: lease, lease_tenant, invoice, invoice_discount
- Discount applies at invoice level, not lease or amendment level

BUSINESS RULES (DO NOT VIOLATE)
1. lease.monthly_rent is the legal rent and MUST NOT be modified for discounts
2. lease_amendment MUST NOT be created for promotional or billing discounts
3. Discounts ONLY reduce invoice payable amount
4. Discounts must be auditable, explicit, and reversible
5. One lease can have multiple invoices; one invoice can have multiple discounts

SUPPORTED DISCOUNT SCENARIO (INITIAL)
- Annual upfront payment
- First month rent waived
- Discount equals lease.monthly_rent
- Discount applies to the first rent invoice only

--------------------------------------------------
DATABASE WORK
--------------------------------------------------

1. Ensure invoice_discount table exists with the following minimum columns:

invoice_discount
- id BIGINT PK
- invoice_id BIGINT FK -> invoice(id)
- discount_type TEXT NOT NULL
- amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0)
- reason TEXT NOT NULL
- created_at TIMESTAMPTZ DEFAULT now()
- deleted_at TIMESTAMPTZ

2. Add FK constraint:
invoice_discount.invoice_id REFERENCES invoice(id) ON DELETE CASCADE

3. DO NOT add discount fields to lease or invoice tables

--------------------------------------------------
API / SERVICE LOGIC
--------------------------------------------------

Create a new service function:
create_discounted_lease_contract(input)

INPUT STRUCTURE (example)
{
  room_id,
  tenants[],
  start_date,
  end_date,
  monthly_rent,
  deposit,
  pay_rent_on,
  payment_term,        // e.g. 'annual'
  discount: {
    type: 'first_month_free',
    reason: 'Annual upfront payment incentive'
  }
}

--------------------------------------------------
IMPLEMENTATION STEPS
--------------------------------------------------

STEP 1: Create Lease
- Insert into lease table normally
- monthly_rent is the FULL legal rent
- payment_term may be 'annual'
- status remains draft or pending depending on existing logic
- DO NOT calculate discounts here

STEP 2: Attach Tenants
- Insert rows into lease_tenant
- No discount logic involved

STEP 3: Generate Initial Rent Invoice
- Create ONE rent invoice for the full billing period
- period_start = lease.start_date
- period_end = lease.start_date + billing_term - 1 day
- due_amount = monthly_rent × number_of_months
- payment_status = 'unpaid' or equivalent

STEP 4: Apply Discount (IF PROVIDED)
- If input.discount exists:
    - Calculate discount_amount
        - For first_month_free:
            discount_amount = lease.monthly_rent
    - Insert into invoice_discount:
        invoice_id = created invoice.id
        discount_type = input.discount.type
        amount = discount_amount
        reason = input.discount.reason

STEP 5: Derived Invoice Net Amount
- Do NOT store net payable in invoice table
- When querying invoice totals:
    net_payable = invoice.due_amount - SUM(invoice_discount.amount)

--------------------------------------------------
QUERY / READ MODEL UPDATE
--------------------------------------------------

Update invoice read logic to include:
- total_discount
- net_payable

Example SQL pattern:

SELECT
    i.*,
    COALESCE(SUM(d.amount), 0) AS total_discount,
    i.due_amount - COALESCE(SUM(d.amount), 0) AS net_payable
FROM invoice i
LEFT JOIN invoice_discount d
    ON d.invoice_id = i.id
    AND d.deleted_at IS NULL
GROUP BY i.id;

--------------------------------------------------
GUARDS & VALIDATIONS
--------------------------------------------------

- Prevent discount.amount > invoice.due_amount
- Prevent discounts on non-rent invoices (unless explicitly allowed later)
- Prevent discount creation if invoice is already fully paid
- Soft-delete discounts instead of hard delete

--------------------------------------------------
WHAT NOT TO DO
--------------------------------------------------

- DO NOT modify lease.monthly_rent
- DO NOT create lease_amendment for discounts
- DO NOT store negative invoice lines
- DO NOT hard-code discount logic into invoice table

--------------------------------------------------
EXPECTED OUTCOME
--------------------------------------------------

- Lease remains legally correct
- Invoice reflects billed amount
- invoice_discount explains why tenant pays less
- Accounting and audit trail are preserved
- System supports future discount types without schema changes
