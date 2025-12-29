CREATE OR REPLACE VIEW v_room_availability AS
SELECT r.*,
        (
            r.is_rentable
            AND NOT EXISTS (
            SELECT 1
            FROM lease l
            WHERE l.room_id = r.id
                AND l.early_termination_date IS NULL
                AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
                AND l.deleted_at IS NULL
            )
        ) AS is_available
FROM room r
WHERE r.deleted_at IS NULL
