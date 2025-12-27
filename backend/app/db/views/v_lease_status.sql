-- ============================================================
-- Lease Status View
-- ============================================================
-- This view calculates lease status based on business rules:
-- IF early_termination_date IS NOT NULL → 終止
-- ELSE IF end_date < CURRENT_DATE → 到期
-- ELSE → 有效
-- ============================================================

CREATE OR REPLACE VIEW v_lease_status AS
SELECT 
    l.id AS lease_id,
    CASE 
        WHEN l.early_termination_date IS NOT NULL THEN '終止'
        WHEN l.end_date < CURRENT_DATE THEN '到期'
        ELSE '有效'
    END AS status
FROM lease l
WHERE l.deleted_at IS NULL;

