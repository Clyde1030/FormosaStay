GOAL
====
Allow applying a rent discount during lease creation WITHOUT breaking existing
lease status rules, immutability rules, or financial history integrity.

Core principle:
- Discounts are modeled as lease amendments, NOT direct rent mutations.
- Active leases remain immutable unless through amendments.
- Draft/pending flexibility is preserved.
- No status rules are weakened.


BACKGROUND
==========
- Lease.status is derived, not stored.
- Lease.monthly_rent represents the BASE rent.
- All rent changes after activation must go through LeaseAmendment.
- Amendments already model auditability, effective dates, and rent history.

A discount at creation time is conceptually:
- a scheduled rent amendment created together with the lease
- NOT a modification of the lease itself


BACKEND CHANGES
===============

1) Update LeaseCreate schema
----------------------------
Add OPTIONAL fields to LeaseCreate:

- discount_amount?: Decimal
- discount_type, allowed values are ('free_months','fixed_amount','percentage') like we specified in our database
- discount_reason?: string, corresponding to lease_amendment_type ('rent_change', 'discount', 'other') like our database
- discount_effective_date?: date

Validation rules:
- discount_amount > 0
- discount_amount < monthly_rent
- discount_effective_date >= start_date
- if discount_amount is provided, discount_reason is required
- if discount_effective_date is omitted, default to lease.start_date


2) Update create_lease()
------------------------
After:
- Lease is created
- db.flush() is called (lease.id exists)

BUT BEFORE:
- db.commit()

Add logic:

IF discount_amount is provided:
- Create a LeaseAmendment record directly (do NOT call create_amendment())
- keep the original lease_id, and the new lease amendment will amend the existing lease during the discounted lease is created.
- amendment_type = "discount"
- effective_date = discount_effective_date
- old_monthly_rent = new_lease.monthly_rent
- new_monthly_rent = new_lease.monthly_rent - discount_amount
- reason = discount_reason
- created_by = created_by

IMPORTANT:
- DO NOT modify lease.monthly_rent
- DO NOT bypass or weaken lease status logic
- This is a controlled internal amendment allowed only during creation


Add a comment explaining intent:

"Amendments created during lease creation are allowed because the lease is not
yet active and has no financial history. After activation, all rent changes
MUST go through create_amendment()."


3) Status & immutability rules (DO NOT CHANGE)
----------------------------------------------
DO NOT:
- Modify determine_lease_status
- Modify assert_lease_editable
- Allow editing monthly_rent after submission
- Allow amendments on non-active leases outside create_lease

Active leases remain immutable.


4) Invoice / rent resolution logic
----------------------------------
Ensure that invoice generation and rent calculation always resolve rent as:

- Base lease.monthly_rent
- PLUS the latest effective LeaseAmendment as of the invoice period

Discounts must NOT be baked into the lease record or invoices directly unless
already designed that way.


FRONTEND CHANGES
================

5) Lease creation UI
--------------------
Add an OPTIONAL "Apply Discount" section:

- Discount amount
- Effective date (default = lease start_date)
- Reason (required if discount is applied)

Rules:
- Only shown during lease creation
- Hidden for submit / renew / edit flows
- Validate discount < monthly rent


6) Lease detail display
----------------------
Display rent clearly as:

- Base Rent
- Active Discount(s) (from amendments)
- Effective Rent

Label discounts explicitly as:
"Applied via amendment"

This avoids accounting ambiguity.


GUARDRAILS (CRITICAL)
====================
DO NOT:
- Make active leases editable
- Change lease status rules
- Store discounted rent directly on Lease
- Reuse create_amendment() inside create_lease
- Introduce special cases that bypass amendments


EXPECTED RESULT
===============
- Lease creation supports discounts cleanly
- Status rules remain intact
- Rent history remains auditable
- Future discounts still require create_amendment()
- No financial data integrity is compromised

