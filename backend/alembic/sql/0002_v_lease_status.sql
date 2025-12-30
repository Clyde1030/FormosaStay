-- ============================================================
-- Lease Status View
-- ============================================================
-- This view calculates lease status based on business rules:
-- IF terminated_at IS NOT NULL → terminated
-- ELSE IF CURRENT_DATE < start_date → pending
-- ELSE IF CURRENT_DATE BETWEEN start_date AND end_date → active
-- ELSE → expired
-- ============================================================

CREATE OR REPLACE VIEW v_lease_status AS
SELECT 
    l.id AS lease_id,
    CASE 
        WHEN l.terminated_at IS NOT NULL THEN 'terminated'
        WHEN CURRENT_DATE < l.start_date THEN 'pending'
        WHEN CURRENT_DATE BETWEEN l.start_date AND l.end_date THEN 'active'
        ELSE 'expired'
    END AS status
FROM lease l
WHERE l.deleted_at IS NULL;
