-- ============================================================
-- View 2: Room Payment History
-- ============================================================
-- Shows all payment/invoice records for a room, including:
-- - Rent payments
-- - Electricity bills
-- - Penalties/fees
-- - Deposit transactions
-- Usage: Get payment history for a room:
-- SELECT * FROM v_room_payment_history WHERE room_id = 17;
CREATE OR REPLACE VIEW v_room_payment_history AS
SELECT 
    r.id AS room_id,
    CONCAT(r.floor_no, r.room_no) AS room_number,
    
    -- Invoice/Payment Information
    inv.id AS invoice_id,
    inv.category,
    inv.period_start,
    inv.period_end,
    inv.period_end AS due_date,  -- Use period_end as due_date (invoice table doesn't have separate due_date)
    inv.due_amount,
    inv.paid_amount,
    inv.payment_status AS payment_status,
    inv.created_at AS invoice_created_at,
    
    -- Lease Information
    l.id AS lease_id,
    l.start_date AS lease_start_date,
    l.end_date AS lease_end_date,
    
    -- Tenant Information (primary tenant)
    t.id AS tenant_id,
    CONCAT(t.last_name, t.first_name) AS tenant_name,
    
    -- Payment Status Details (cast to TEXT to avoid enum conflict)
    CASE 
        WHEN inv.payment_status = 'paid' THEN 'Paid'::TEXT
        WHEN inv.payment_status = 'overdue' THEN 'Overdue'::TEXT
        WHEN inv.payment_status = 'partial' THEN 'Partial'::TEXT
        WHEN inv.payment_status = 'uncollectable' THEN 'Bad Debt'::TEXT
        WHEN inv.payment_status = 'returned' THEN 'Returned'::TEXT
        WHEN inv.payment_status = 'canceled' THEN 'Canceled'::TEXT
        ELSE inv.payment_status::TEXT
    END AS payment_status_en,
    
    -- Transaction Type for frontend (map category to Transaction type)
    CASE 
        WHEN inv.category = 'rent' THEN 'Rent'::TEXT
        WHEN inv.category = 'electricity' THEN 'Electricity'::TEXT
        WHEN inv.category = 'penalty' THEN 'Fee'::TEXT
        WHEN inv.category = 'deposit' THEN 'Deposit'::TEXT
        ELSE 'Rent'::TEXT
    END AS transaction_type,
    
    -- Transaction Status for frontend (map payment status, treating Partial as Overdue)
    CASE 
        WHEN inv.payment_status = 'paid' THEN 'Paid'::TEXT
        WHEN inv.payment_status = 'overdue' THEN 'Overdue'::TEXT
        WHEN inv.payment_status = 'partial' THEN 'Overdue'::TEXT  -- Partial treated as Overdue
        WHEN inv.payment_status = 'uncollectable' THEN 'Bad Debt'::TEXT
        WHEN inv.payment_status = 'returned' THEN 'Returned'::TEXT
        WHEN inv.payment_status = 'canceled' THEN 'Canceled'::TEXT
        ELSE 'Overdue'::TEXT
    END AS transaction_status,
    
    -- Calculate outstanding amount
    (inv.due_amount - inv.paid_amount) AS outstanding_amount,
    
    -- Period display (cast to TEXT to avoid enum conflict)
    CASE 
        WHEN inv.category = 'rent' THEN 
            (TO_CHAR(inv.period_start, 'YYYY-MM') || ' Rent')::TEXT
        WHEN inv.category = 'electricity' THEN 
            (TO_CHAR(inv.period_start, 'YYYY-MM') || ' Electricity')::TEXT
        WHEN inv.category = 'deposit' THEN 
            'Deposit'::TEXT
        ELSE inv.category::TEXT
    END AS period_display

FROM room r
INNER JOIN lease l ON l.room_id = r.id
LEFT JOIN invoice inv ON inv.lease_id = l.id 
    AND inv.deleted_at IS NULL
LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
    AND lt.tenant_role = 'primary'  -- Primary tenant only
LEFT JOIN tenant t ON t.id = lt.tenant_id
WHERE r.deleted_at IS NULL
    AND l.deleted_at IS NULL
ORDER BY r.id, inv.created_at DESC;
