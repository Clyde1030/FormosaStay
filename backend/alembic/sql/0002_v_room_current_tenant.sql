
-- ============================================================
-- View 1: Room Current Tenant Information
-- ============================================================
-- Shows the current active tenant(s) for a room, including:
-- - Tenant details (name, contact info)
-- - Lease details (rent, deposit, dates, payment terms)
-- - Tenant role (primary/secondary)
-- 
-- IMPORTANT: This view includes ALL rooms, even vacant ones.
-- For vacant rooms, tenant-related columns (tenant_id, first_name, etc.)
-- and lease-related columns (lease_id, monthly_rent, etc.) will be NULL,
-- but room information (room_id, building_no, floor_no, room_no) will always be present.
-- 
-- Usage: Get current tenant for a room:
-- SELECT * FROM v_room_current_tenant WHERE room_id = 17;
-- 
-- Usage: Look up room_id by building_no, floor_no, room_no:
-- SELECT DISTINCT room_id FROM v_room_current_tenant 
-- WHERE building_no = 1 AND floor_no = 2 AND room_no = 'A';

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
