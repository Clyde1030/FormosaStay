-- # Note: This view includes all tenant and lease columns,
-- with lease columns prefixed to avoid conflicts
-- Usage: Get tenant lease information:
-- SELECT * FROM v_tenant_lease WHERE tenant_id = 17;

CREATE OR REPLACE VIEW v_tenant_lease AS
SELECT 
    t.id AS tenant_id,
    t.first_name,
    t.last_name,
    t.gender,
    t.birthday,
    t.personal_id,
    t.phone,
    t.email,
    t.line_id,
    t.home_address AS address,
    t.created_by AS tenant_created_by,
    t.updated_by AS tenant_updated_by,
    t.created_at AS tenant_created_at,
    t.updated_at AS tenant_updated_at,
    t.deleted_at AS tenant_deleted_at,
    lt.tenant_role,
    lt.joined_at,
    l.id AS lease_id,
    l.room_id,
    l.start_date,
    l.end_date,
    l.early_termination_date,
    l.monthly_rent,
    l.deposit,
    l.pay_rent_on,
    l.payment_term,
    l.assets,
    l.vehicle_plate,
    l.created_by AS lease_created_by,
    l.updated_by AS lease_updated_by,
    l.created_at AS lease_created_at,
    l.updated_at AS lease_updated_at,
    l.deleted_at AS lease_deleted_at
FROM tenant t
LEFT JOIN lease_tenant lt ON lt.tenant_id = t.id
LEFT JOIN lease l ON l.id = lt.lease_id
