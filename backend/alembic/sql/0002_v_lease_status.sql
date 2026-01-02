-- ============================================================
-- Lease Status View
-- ============================================================
-- This view calculates lease status based on business rules:
-- IF terminated_at IS NOT NULL → terminated
-- ELSE IF CURRENT_DATE > end_date → expired
-- ELSE IF submitted_at IS NULL → draft (tenant in queue, waiting for customer sign back)
-- ELSE IF CURRENT_DATE < start_date → pending (customer signed back, manager submitted, waiting for effective date)
-- ELSE → active (locked for modifications, change via amendment/renew/terminate)
-- ============================================================

CREATE OR REPLACE VIEW v_lease_status AS
SELECT 
    l.id AS lease_id,
    CASE 
        WHEN l.terminated_at IS NOT NULL THEN 'terminated'
        WHEN CURRENT_DATE > l.end_date THEN 'expired'
        WHEN l.submitted_at IS NULL THEN 'draft'
        WHEN CURRENT_DATE < l.start_date THEN 'pending'
        ELSE 'active'
    END AS status
FROM lease l
WHERE l.deleted_at IS NULL;
