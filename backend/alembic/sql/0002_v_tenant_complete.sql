-- ============================================================
-- Tenant Complete View
-- ============================================================
-- This view provides comprehensive tenant information including:
-- - Tenant basic information
-- - Emergency contacts (aggregated as JSON array)
-- - Current lease (if exists, may be active or inactive)
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
    t.home_address AS tenant_address,
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
    
    -- Lease Information (may be active or inactive)
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
    l.assets AS lease_assets,  -- JSONB array of assets: [{"type": "鑰匙", "quantity": 1}, ...]
    
    -- Asset quantities broken down by type
    COALESCE(
        (
            SELECT SUM((elem->>'quantity')::integer)
            FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
            WHERE elem->>'type' = 'key'
        ),
        0
    ) AS asset_keys_quantity,  -- key quantity
    
    COALESCE(
        (
            SELECT SUM((elem->>'quantity')::integer)
            FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
            WHERE elem->>'type' = 'fob'
        ),
        0
    ) AS asset_fob_quantity,  -- fob quantity
    
    COALESCE(
        (
            SELECT SUM((elem->>'quantity')::integer)
            FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
            WHERE elem->>'type' = 'controller'
        ),
        0
    ) AS asset_remote_quantity,  -- controller quantity
    
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
    AND lt.tenant_role = 'primary'  -- Primary tenant only
-- Include all leases (active and inactive) - previously filtered: AND l.terminated_at IS NULL AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
LEFT JOIN lease l ON l.id = lt.lease_id
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
-- 3. Get tenants with leases (active or inactive):
--    SELECT * FROM v_tenant_complete WHERE lease_id IS NOT NULL;
--    
-- 3a. Get tenants with active leases only:
--    SELECT * FROM v_tenant_complete WHERE lease_status = 'active';
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

