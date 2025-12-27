-- ============================================================
-- View 3: Room Electricity Usage & Cost
-- ============================================================
-- Shows electricity meter readings and calculated costs for a room
-- Usage: Get electricity history for a room:
-- SELECT * FROM v_room_electricity_history WHERE room_id = 17 ORDER BY read_date DESC;

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


