-- ============================================================
-- Tenant Complete View
-- ============================================================
-- This view provides comprehensive tenant information including:
-- - Tenant basic information
-- - Emergency contacts (aggregated as JSON array)
-- - Current active lease (if exists)
-- - Lease assets (JSONB from lease table)
-- - Room and building information
-- ============================================================

CREATE OR REPLACE VIEW v_tenant_complete AS
SELECT 
    -- Tenant Basic Information
    t.id AS tenant_id,
    t.first_name,
    t.last_name,
    CONCAT(t.last_name, t.first_name) AS tenant_name,
    t.gender,
    t.birthday,
    t.personal_id,
    t.phone,
    t.email,
    t.line_id,
    t.address AS tenant_address,
    t.created_at AS tenant_created_at,
    t.updated_at AS tenant_updated_at,
    
    -- Emergency Contacts (aggregated as JSON array)
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ec.id,
                    'first_name', ec.first_name,
                    'last_name', ec.last_name,
                    'relationship', ec.relationship,
                    'phone', ec.phone
                )
                ORDER BY ec.id
            )
            FROM tenant_emergency_contact ec
            WHERE ec.tenant_id = t.id
        ),
        '[]'::jsonb
    ) AS emergency_contacts,
    
    -- Current Active Lease Information
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
    l.assets AS lease_assets,  -- JSONB array of assets: [{"type": "鑰匙", "quantity": 1}, ...]
    
    -- Asset quantities broken down by type
    COALESCE(
        (
            SELECT SUM((elem->>'quantity')::integer)
            FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
            WHERE elem->>'type' = '鑰匙'
        ),
        0
    ) AS asset_keys_quantity,  -- 鑰匙 quantity
    
    COALESCE(
        (
            SELECT SUM((elem->>'quantity')::integer)
            FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
            WHERE elem->>'type' = '磁扣'
        ),
        0
    ) AS asset_fob_quantity,  -- fob quantity
    
    COALESCE(
        (
            SELECT SUM((elem->>'quantity')::integer)
            FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
            WHERE elem->>'type' = '遙控器'
        ),
        0
    ) AS asset_remote_quantity,  -- 遙控器 quantity
    
    l.created_at AS lease_created_at,
    l.updated_at AS lease_updated_at,
    
    -- Lease-Tenant Relationship
    lt.tenant_role,
    lt.joined_at,
    
    -- Room Information
    r.id AS room_id,
    r.floor_no,
    r.room_no,
    CONCAT(r.floor_no, r.room_no) AS room_number,
    r.size_ping,
    r.is_rentable,
    
    -- Building Information
    b.id AS building_id,
    b.building_no,
    b.address AS building_address

FROM tenant t
LEFT JOIN lease_tenant lt ON lt.tenant_id = t.id
    AND lt.tenant_role = '主要'  -- Primary tenant only
LEFT JOIN lease l ON l.id = lt.lease_id
    -- Active lease only: no early_termination_date and end_date >= CURRENT_DATE
    AND l.early_termination_date IS NULL
    AND l.end_date >= CURRENT_DATE
    AND l.deleted_at IS NULL
LEFT JOIN room r ON r.id = l.room_id
    AND r.deleted_at IS NULL
LEFT JOIN building b ON b.id = r.building_id
    AND b.deleted_at IS NULL
WHERE t.deleted_at IS NULL
ORDER BY t.last_name, t.first_name;

-- ============================================================
-- Usage Examples:
-- ============================================================
-- 
-- 1. Get complete tenant information by ID:
--    SELECT * FROM v_tenant_complete WHERE tenant_id = 1;
--
-- 2. Get all tenants with their emergency contacts and leases:
--    SELECT * FROM v_tenant_complete;
--
-- 3. Get tenants with active leases:
--    SELECT * FROM v_tenant_complete WHERE lease_id IS NOT NULL;
--
-- 4. Get emergency contacts for a tenant (as JSON):
--    SELECT emergency_contacts FROM v_tenant_complete WHERE tenant_id = 1;
--
-- 5. Get asset breakdown for a tenant:
--    SELECT tenant_name, asset_keys_quantity, asset_fob_quantity, asset_remote_quantity 
--    FROM v_tenant_complete WHERE tenant_id = 1;
--
-- 6. Get all tenants with their asset breakdown:
--    SELECT tenant_name, lease_assets, asset_keys_quantity, asset_fob_quantity, asset_remote_quantity 
--    FROM v_tenant_complete WHERE lease_id IS NOT NULL;
-- ============================================================

