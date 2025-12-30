-- ============================================================
-- View 4: Room Dashboard Summary (All-in-One)
-- ============================================================
-- Comprehensive view combining all room dashboard information
-- This can be used as a single endpoint to get all room data
-- Usage: Get complete dashboard summary for a room:
-- SELECT * FROM v_room_dashboard_summary WHERE room_id = 17;
-- Usage: Get all occupied rooms with tenant info:
-- SELECT * FROM v_room_dashboard_summary WHERE is_occupied = true;

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
    
    -- Current Lease Status (active leases only)
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM lease l 
            WHERE l.room_id = r.id 
            AND l.early_termination_date IS NULL
            AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
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
         AND inv.payment_status = 'overdue'
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
         AND inv.category = 'electricity'
         AND inv.deleted_at IS NULL),
        0
    ) AS total_electricity_cost,
    
    COALESCE(
        (SELECT COUNT(*)
         FROM invoice inv
         WHERE inv.lease_id = l.id
         AND inv.category = 'electricity'
         AND inv.deleted_at IS NULL),
        0
    ) AS electricity_bill_count

FROM room r
INNER JOIN building b ON b.id = r.building_id
LEFT JOIN lease l ON l.room_id = r.id 
    -- Active lease only: no early_termination_date and CURRENT_DATE BETWEEN start_date AND end_date
    AND l.early_termination_date IS NULL
    AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
    AND l.deleted_at IS NULL
LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
    AND lt.tenant_role = 'primary'
LEFT JOIN tenant t ON t.id = lt.tenant_id 
    AND t.deleted_at IS NULL
WHERE r.deleted_at IS NULL
ORDER BY r.building_id, r.floor_no, r.room_no;



