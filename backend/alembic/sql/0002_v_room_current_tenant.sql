
-- ============================================================
-- View 1: Room Current Tenant Information
-- ============================================================
-- Shows the current active tenant(s) for a room, including:
-- - Tenant details (name, contact info)
-- - Lease details (rent, deposit, dates, payment terms)
-- - Tenant role (primary/secondary)
-- 
-- IMPORTANT: This view includes ALL rooms, with at least one record per room.
-- Priority order for lease selection:
-- 1. Active leases (submitted, not terminated, and CURRENT_DATE BETWEEN start_date AND end_date)
-- 2. If no active lease exists, the most recent lease (by created_at DESC) regardless of status
-- 
-- For rooms with no leases at all, tenant-related columns (tenant_id, first_name, etc.)
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
WITH room_lease_priority AS (
    -- For each room, select the best lease:
    -- Priority 1: Active leases (submitted, not terminated, within date range)
    -- Priority 2: Most recent lease (by created_at DESC) if no active lease exists
    SELECT DISTINCT ON (room_id)
        l.id AS lease_id,
        l.room_id,
        -- Priority: 1 for active leases, 2 for others (ordered by created_at DESC)
        CASE 
            WHEN l.submitted_at IS NOT NULL 
                AND l.terminated_at IS NULL 
                AND CURRENT_DATE BETWEEN l.start_date AND l.end_date 
                AND l.deleted_at IS NULL
            THEN 1
            ELSE 2
        END AS priority,
        l.created_at
    FROM lease l
    WHERE l.deleted_at IS NULL
    ORDER BY 
        l.room_id,
        -- Active leases first
        CASE 
            WHEN l.submitted_at IS NOT NULL 
                AND l.terminated_at IS NULL 
                AND CURRENT_DATE BETWEEN l.start_date AND l.end_date 
                AND l.deleted_at IS NULL
            THEN 1
            ELSE 2
        END,
        -- Then by most recent (created_at DESC)
        l.created_at DESC
),
room_tenant_data AS (
    -- Get all room-lease-tenant combinations, then select one per room
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
        t.home_address AS tenant_address,
        
        -- Lease Information
        l.id AS lease_id,
        l.start_date AS lease_start_date,
        l.end_date AS lease_end_date,
        l.terminated_at,
        l.monthly_rent,
        l.deposit,
        l.pay_rent_on,
        l.payment_term,
        -- Calculate lease status: IF terminated_at IS NOT NULL → terminated, ELSE IF CURRENT_DATE > end_date → expired, ELSE IF submitted_at IS NULL → draft, ELSE IF CURRENT_DATE < start_date → pending, ELSE → active
        CASE 
            WHEN l.terminated_at IS NOT NULL THEN 'terminated'
            WHEN CURRENT_DATE > l.end_date THEN 'expired'
            WHEN l.submitted_at IS NULL THEN 'draft'
            WHEN CURRENT_DATE < l.start_date THEN 'pending'
            ELSE 'active'
        END AS lease_status,
        l.vehicle_plate,
        l.assets,
        l.created_at AS lease_created_at,
        
        -- Lease-Tenant Relationship
        lt.tenant_role,
        lt.joined_at,
        
        -- Room Information
        r.size_ping,
        r.is_rentable,
        
        -- Priority for tenant selection: primary tenant first, then by tenant_id
        CASE WHEN lt.tenant_role = 'primary' THEN 0 ELSE 1 END AS tenant_priority
        
    FROM room r
    INNER JOIN building b ON b.id = r.building_id
    LEFT JOIN room_lease_priority rlp ON rlp.room_id = r.id
    LEFT JOIN lease l ON l.id = rlp.lease_id
    LEFT JOIN lease_tenant lt ON lt.lease_id = l.id
    LEFT JOIN tenant t ON t.id = lt.tenant_id 
        AND t.deleted_at IS NULL
    WHERE r.deleted_at IS NULL
)
SELECT DISTINCT ON (room_id)
    room_id,
    building_id,
    floor_no,
    room_no,
    room_number,
    building_no,
    building_address,
    tenant_id,
    first_name,
    last_name,
    tenant_name,
    gender,
    personal_id,
    phone,
    email,
    line_id,
    tenant_address,
    lease_id,
    lease_start_date,
    lease_end_date,
    terminated_at,
    monthly_rent,
    deposit,
    pay_rent_on,
    payment_term,
    lease_status,
    vehicle_plate,
    assets,
    lease_created_at,
    tenant_role,
    joined_at,
    size_ping,
    is_rentable
FROM room_tenant_data
ORDER BY 
    room_id,
    tenant_priority,  -- Primary tenant first
    tenant_id  -- Then by tenant_id for consistency
