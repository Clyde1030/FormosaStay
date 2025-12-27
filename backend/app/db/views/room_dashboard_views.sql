-- ============================================================
-- Room Dashboard Views
-- ============================================================
-- These views provide comprehensive information for the Room Dashboard:
-- 1. Current tenant information
-- 2. Payment history (rent, electricity, fees, deposits)
-- 3. Electricity usage & cost history
-- ============================================================

-- ============================================================
-- View 1: Room Current Tenant Information
-- ============================================================
-- Shows the current active tenant(s) for a room, including:
-- - Tenant details (name, contact info)
-- - Lease details (rent, deposit, dates, payment terms)
-- - Tenant role (primary/secondary)
CREATE OR REPLACE VIEW v_room_current_tenant AS
SELECT 
    r.id AS room_id,
    r.building_id,
    r.floor_no,
    r.room_no,
    CONCAT(r.floor_no, r.room_no) AS room_number,
    b.building_no,
    b.address AS building_address,
    
    -- Tenant Information
    t.id AS tenant_id,
    t.first_name,
    t.last_name,
    CONCAT(t.last_name, t.first_name) AS tenant_name,
    t.gender,
    t.personal_id,
    t.phone,
    t.email,
    t.line_id,
    t.address AS tenant_address,
    
    -- Lease Information
    l.id AS lease_id,
    l.start_date AS lease_start_date,
    l.end_date AS lease_end_date,
    l.early_termination_date,
    l.monthly_rent,
    l.deposit,
    l.pay_rent_on,
    l.payment_term,
    -- Calculate lease status: IF early_termination_date IS NOT NULL → 終止, ELSE IF end_date < CURRENT_DATE → 到期, ELSE → 有效
    CASE 
        WHEN l.early_termination_date IS NOT NULL THEN '終止'
        WHEN l.end_date < CURRENT_DATE THEN '到期'
        ELSE '有效'
    END AS lease_status,
    l.vehicle_plate,
    l.assets,
    l.created_at AS lease_created_at,
    
    -- Lease-Tenant Relationship
    lt.tenant_role,
    lt.joined_at,
    
    -- Room Information
    r.size_ping,
    r.is_rentable
    
FROM room r
INNER JOIN building b ON b.id = r.building_id
LEFT JOIN lease l ON l.room_id = r.id 
    -- Active lease only: no early_termination_date and end_date >= CURRENT_DATE
    AND l.early_termination_date IS NULL
    AND l.end_date >= CURRENT_DATE
    AND l.deleted_at IS NULL
LEFT JOIN lease_tenant lt ON lt.lease_id = l.id
LEFT JOIN tenant t ON t.id = lt.tenant_id 
    AND t.deleted_at IS NULL
WHERE r.deleted_at IS NULL
ORDER BY r.id, lt.tenant_role DESC; -- Primary tenant first


-- ============================================================
-- View 2: Room Payment History
-- ============================================================
-- Shows all payment/invoice records for a room, including:
-- - Rent payments
-- - Electricity bills
-- - Penalties/fees
-- - Deposit transactions
CREATE OR REPLACE VIEW v_room_payment_history AS
SELECT 
    r.id AS room_id,
    CONCAT(r.floor_no, r.room_no) AS room_number,
    
    -- Invoice/Payment Information
    inv.id AS invoice_id,
    inv.category,
    inv.period_start,
    inv.period_end,
    inv.due_date,
    inv.due_amount,
    inv.paid_amount,
    inv.status AS payment_status,
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
        WHEN inv.status = '已交' THEN 'Paid'::TEXT
        WHEN inv.status = '未交' THEN 'Unpaid'::TEXT
        WHEN inv.status = '部分未交' THEN 'Partial'::TEXT
        WHEN inv.status = '呆帳' THEN 'Bad Debt'::TEXT
        WHEN inv.status = '歸還' THEN 'Returned'::TEXT
        WHEN inv.status = '取消' THEN 'Canceled'::TEXT
        ELSE inv.status::TEXT
    END AS payment_status_en,
    
    -- Calculate outstanding amount
    (inv.due_amount - inv.paid_amount) AS outstanding_amount,
    
    -- Period display (cast to TEXT to avoid enum conflict)
    CASE 
        WHEN inv.category = '房租' THEN 
            (TO_CHAR(inv.period_start, 'YYYY-MM') || ' Rent')::TEXT
        WHEN inv.category = '電費' THEN 
            (TO_CHAR(inv.period_start, 'YYYY-MM') || ' Electricity')::TEXT
        WHEN inv.category = '罰款' THEN 
            ('Penalty: ' || TO_CHAR(inv.due_date, 'YYYY-MM-DD'))::TEXT
        WHEN inv.category = '押金' THEN 
            'Deposit'::TEXT
        ELSE inv.category::TEXT
    END AS period_display

FROM room r
INNER JOIN lease l ON l.room_id = r.id
LEFT JOIN invoice inv ON inv.lease_id = l.id 
    AND inv.deleted_at IS NULL
LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
    AND lt.tenant_role = '主要'  -- Primary tenant only
LEFT JOIN tenant t ON t.id = lt.tenant_id
WHERE r.deleted_at IS NULL
    AND l.deleted_at IS NULL
ORDER BY r.id, inv.due_date DESC, inv.created_at DESC;


-- ============================================================
-- View 3: Room Electricity Usage & Cost
-- ============================================================
-- Shows electricity meter readings and calculated costs for a room
CREATE OR REPLACE VIEW v_room_electricity_history AS
SELECT 
    r.id AS room_id,
    CONCAT(r.floor_no, r.room_no) AS room_number,
    
    -- Meter Reading Information
    mr.id AS meter_reading_id,
    mr.read_date,
    mr.read_amount AS current_reading,
    
    -- Previous reading for calculation
    LAG(mr.read_amount) OVER (
        PARTITION BY r.id 
        ORDER BY mr.read_date
    ) AS previous_reading,
    
    -- Calculate usage (kWh)
    COALESCE(
        mr.read_amount - LAG(mr.read_amount) OVER (
            PARTITION BY r.id 
            ORDER BY mr.read_date
        ),
        0
    ) AS usage_kwh,
    
    -- Invoice Information (if exists)
    inv.id AS invoice_id,
    inv.period_start,
    inv.period_end,
    inv.due_date,
    inv.due_amount AS electricity_cost,
    inv.paid_amount,
    inv.status AS payment_status,
    
    -- Electricity Rate Information
    er.rate_per_kwh,
    er.start_date AS rate_start_date,
    er.end_date AS rate_end_date,
    
    -- Calculate cost if rate is available (for display purposes)
    CASE 
        WHEN er.rate_per_kwh IS NOT NULL THEN
            COALESCE(
                (mr.read_amount - LAG(mr.read_amount) OVER (
                    PARTITION BY r.id 
                    ORDER BY mr.read_date
                )) * er.rate_per_kwh,
                0
            )
        ELSE NULL
    END AS calculated_cost,
    
    -- Lease Information
    l.id AS lease_id,
    l.start_date AS lease_start_date,
    l.end_date AS lease_end_date,
    
    -- Tenant Information
    t.id AS tenant_id,
    CONCAT(t.last_name, t.first_name) AS tenant_name

FROM room r
INNER JOIN meter_reading mr ON mr.room_id = r.id
LEFT JOIN lease l ON l.room_id = r.id
    AND mr.read_date BETWEEN l.start_date AND COALESCE(l.early_termination_date, l.end_date)
LEFT JOIN invoice inv ON inv.lease_id = l.id 
    AND inv.category = '電費'
    AND mr.read_date BETWEEN inv.period_start AND inv.period_end
    AND inv.deleted_at IS NULL
LEFT JOIN electricity_rate er ON er.room_id = r.id
    AND mr.read_date BETWEEN er.start_date AND er.end_date
LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
    AND lt.tenant_role = '主要'
LEFT JOIN tenant t ON t.id = lt.tenant_id
WHERE r.deleted_at IS NULL
ORDER BY r.id, mr.read_date DESC;


-- ============================================================
-- View 4: Room Dashboard Summary (All-in-One)
-- ============================================================
-- Comprehensive view combining all room dashboard information
-- This can be used as a single endpoint to get all room data
CREATE OR REPLACE VIEW v_room_dashboard_summary AS
SELECT 
    -- Room Basic Info
    r.id AS room_id,
    r.building_id,
    CONCAT(r.floor_no, r.room_no) AS room_number,
    r.floor_no,
    r.room_no,
    r.size_ping,
    r.is_rentable,
    b.building_no,
    b.address AS building_address,
    
    -- Current Lease Status
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM lease l 
            WHERE l.room_id = r.id 
            AND l.early_termination_date IS NULL
            AND l.end_date >= CURRENT_DATE
            AND l.deleted_at IS NULL
        ) THEN true
        ELSE false
    END AS is_occupied,
    
    -- Current Tenant (Primary)
    t.id AS tenant_id,
    CONCAT(t.last_name, t.first_name) AS tenant_name,
    t.phone AS tenant_phone,
    t.email AS tenant_email,
    t.line_id AS tenant_line_id,
    
    -- Current Lease Details
    l.id AS lease_id,
    l.start_date AS lease_start_date,
    l.end_date AS lease_end_date,
    l.monthly_rent,
    l.deposit,
    l.pay_rent_on,
    l.payment_term,
    l.vehicle_plate,
    l.assets,
    
    -- Payment Statistics
    COALESCE(
        (SELECT COUNT(*) 
         FROM invoice inv 
         WHERE inv.lease_id = l.id 
         AND inv.deleted_at IS NULL),
        0
    ) AS total_invoices,
    
    COALESCE(
        (SELECT COUNT(*) 
         FROM invoice inv 
         WHERE inv.lease_id = l.id 
         AND inv.status = '未交'
         AND inv.deleted_at IS NULL),
        0
    ) AS unpaid_invoices,
    
    COALESCE(
        (SELECT SUM(inv.due_amount - inv.paid_amount)
         FROM invoice inv 
         WHERE inv.lease_id = l.id 
         AND inv.deleted_at IS NULL),
        0
    ) AS total_outstanding,
    
    -- Electricity Statistics
    COALESCE(
        (SELECT MAX(mr.read_amount)
         FROM meter_reading mr
         WHERE mr.room_id = r.id),
        0
    ) AS latest_meter_reading,
    
    COALESCE(
        (SELECT MAX(mr.read_date)
         FROM meter_reading mr
         WHERE mr.room_id = r.id),
        NULL
    ) AS latest_meter_reading_date,
    
    COALESCE(
        (SELECT SUM(inv.due_amount)
         FROM invoice inv
         WHERE inv.lease_id = l.id
         AND inv.category = '電費'
         AND inv.deleted_at IS NULL),
        0
    ) AS total_electricity_cost,
    
    COALESCE(
        (SELECT COUNT(*)
         FROM invoice inv
         WHERE inv.lease_id = l.id
         AND inv.category = '電費'
         AND inv.deleted_at IS NULL),
        0
    ) AS electricity_bill_count

FROM room r
INNER JOIN building b ON b.id = r.building_id
LEFT JOIN lease l ON l.room_id = r.id 
    -- Active lease only: no early_termination_date and end_date >= CURRENT_DATE
    AND l.early_termination_date IS NULL
    AND l.end_date >= CURRENT_DATE
    AND l.deleted_at IS NULL
LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
    AND lt.tenant_role = '主要'
LEFT JOIN tenant t ON t.id = lt.tenant_id 
    AND t.deleted_at IS NULL
WHERE r.deleted_at IS NULL
ORDER BY r.building_id, r.floor_no, r.room_no;


-- ============================================================
-- Usage Examples:
-- ============================================================
-- 
-- 1. Get current tenant for a room:
--    SELECT * FROM v_room_current_tenant WHERE room_id = 17;
--
-- 2. Get payment history for a room:
--    SELECT * FROM v_room_payment_history WHERE room_id = 17 ORDER BY due_date DESC;
--
-- 3. Get electricity history for a room:
--    SELECT * FROM v_room_electricity_history WHERE room_id = 17 ORDER BY read_date DESC;
--
-- 4. Get complete dashboard summary for a room:
--    SELECT * FROM v_room_dashboard_summary WHERE room_id = 17;
--
-- 5. Get all occupied rooms with tenant info:
--    SELECT * FROM v_room_dashboard_summary WHERE is_occupied = true;
-- ============================================================

