-- v_contract

CREATE OR REPLACE VIEW public.v_contract AS
SELECT
    r.id AS room_id,
    l.id AS lease_id,
    t.id AS tenant_id,
    concat(b.address, r.floor_no) || '樓' || r.room_no || '室' AS room_full_name,
    /* =====================================================
       Contract duration: _年_個月
       ===================================================== */
	(
	    (
	        ROUND((l.end_date - l.start_date) / 30.4375)::int / 12
	    ) || '年' ||
	    (
	        ROUND((l.end_date - l.start_date) / 30.4375)::int % 12
	    ) || '個月'
	) AS contract_duration,

    /* =====================================================
       Lease dates (ROC format)
       民國_年_月_日
       ===================================================== */
    (
        (EXTRACT(YEAR FROM l.start_date)::int - 1911) || '年' ||
        EXTRACT(MONTH FROM l.start_date)::int || '月' ||
        EXTRACT(DAY FROM l.start_date)::int || '日'
    ) AS lease_start_date_roc,

    (
        (EXTRACT(YEAR FROM l.end_date)::int - 1911) || '年' ||
        EXTRACT(MONTH FROM l.end_date)::int || '月' ||
        EXTRACT(DAY FROM l.end_date)::int || '日'
    ) AS lease_end_date_roc,

    /* =====================================================
       Financials
       ===================================================== */
    l.start_date,
    l.end_date,
    l.monthly_rent,
    l.deposit,
    l.payment_term,
    l.pay_rent_on,
    l.vehicle_plate,
    l.assets,
	er.rate_per_kwh,
    /* =====================================================
       Lease assets (JSONB → 中文)
       Example: 鑰匙1支 磁扣1個 遙控器1個
       ===================================================== */
    (
        SELECT string_agg(
            CASE a.elem->>'type'
                WHEN 'key' THEN '鑰匙'
                WHEN 'fob' THEN '磁扣'
                WHEN 'controller' THEN '遙控器'
                ELSE a.elem->>'type'
            END
            || (a.elem->>'quantity') ||
            CASE a.elem->>'type'
                WHEN 'key' THEN '支'
                WHEN 'fob' THEN '個'
                WHEN 'controller' THEN '個'
                ELSE ''
            END,
            ' '
        )
        FROM jsonb_array_elements(l.assets) AS a(elem)
    ) AS lease_assets_description,
    /* =====================================================
       Parties
       ===================================================== */
    b.landlord_name,
    b.landlord_address,
    concat(t.last_name, t.first_name) AS tenant_name,
    t.phone AS tenant_phone,
    t.personal_id,
    t.birthday,
    t.home_address,
    concat(tec.last_name, tec.first_name) AS emergency_contact_name,
    tec.phone AS emergency_contact_phone,
    /* =====================================================
       Contract date (submission)
       ===================================================== */
    l.submitted_at AS contract_date,
    (
        (EXTRACT(YEAR FROM COALESCE(l.submitted_at, l.start_date))::int - 1911) || '年' ||
        EXTRACT(MONTH FROM COALESCE(l.submitted_at, l.start_date))::int || '月' ||
        EXTRACT(DAY FROM COALESCE(l.submitted_at, l.start_date))::int || '日'
    ) AS contract_date_roc,
    /* =====================================================
       Additional fields for compatibility
       ===================================================== */
    r.floor_no,
    r.room_no,
    b.address AS building_address
FROM room r
INNER JOIN building b
    ON b.id = r.building_id
LEFT JOIN lease l
    ON l.room_id = r.id
--    AND l.submitted_at IS NOT NULL
   AND l.terminated_at IS NULL
--    AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
   AND l.deleted_at IS NULL
LEFT JOIN lease_tenant lt
    ON lt.lease_id = l.id
   AND lt.tenant_role = 'primary'::tenant_role_type
LEFT JOIN tenant t
    ON t.id = lt.tenant_id
   AND t.deleted_at IS NULL
LEFT JOIN tenant_emergency_contact tec
    ON tec.tenant_id = t.id    
LEFT JOIN LATERAL (
    SELECT er.*
    FROM electricity_rate er
    WHERE er.room_id = r.id
      AND er.start_date <= l.end_date
      AND (er.end_date IS NULL OR er.end_date >= l.start_date)
    ORDER BY er.start_date DESC
    LIMIT 1
) er ON TRUE
WHERE r.deleted_at IS NULL
  AND t.id IS NOT NULL
ORDER BY r.id, l.start_date desc;
