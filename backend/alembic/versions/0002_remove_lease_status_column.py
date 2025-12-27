"""remove lease status column

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the unique index that uses status column
    op.drop_index('uq_active_lease_per_room', table_name='lease')
    
    # Drop all views that depend on the status column BEFORE dropping the column
    # These views will be recreated with calculated status logic after dropping the column
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_availability CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_lease CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lease_status CASCADE")
    
    # Drop the status column from lease table
    op.drop_column('lease', 'status')
    
    # Note: We cannot recreate the unique index with CURRENT_DATE in the predicate
    # because CURRENT_DATE is not immutable (changes daily). PostgreSQL requires
    # index predicates to use only immutable functions.
    # The unique constraint will be enforced at the application level in lease_service.py
    # which checks for active leases before creating new ones.
    
    # Create/update views that reference lease status
    # Note: These views were created after 0001_initial_schema.py and need to be updated
    # to use calculated status instead of the status column
    
    # View: v_lease_status (new view)
    op.execute("""
        CREATE OR REPLACE VIEW v_lease_status AS
        SELECT 
            l.id AS lease_id,
            CASE 
                WHEN l.early_termination_date IS NOT NULL THEN '終止'
                WHEN l.end_date < CURRENT_DATE THEN '到期'
                ELSE '有效'
            END AS status
        FROM lease l
        WHERE l.deleted_at IS NULL
    """)
    
    # View: v_tenant_complete
    op.execute("""
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
            l.assets AS lease_assets,
            
            -- Asset quantities broken down by type
            COALESCE(
                (
                    SELECT SUM((elem->>'quantity')::integer)
                    FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
                    WHERE elem->>'type' = '鑰匙'
                ),
                0
            ) AS asset_keys_quantity,
            
            COALESCE(
                (
                    SELECT SUM((elem->>'quantity')::integer)
                    FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
                    WHERE elem->>'type' = '磁扣'
                ),
                0
            ) AS asset_fob_quantity,
            
            COALESCE(
                (
                    SELECT SUM((elem->>'quantity')::integer)
                    FROM jsonb_array_elements(COALESCE(l.assets, '[]'::jsonb)) AS elem
                    WHERE elem->>'type' = '遙控器'
                ),
                0
            ) AS asset_remote_quantity,
            
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
            AND lt.tenant_role = '主要'
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
        ORDER BY t.last_name, t.first_name
    """)
    
    # View: v_room_availability
    op.execute("""
        CREATE OR REPLACE VIEW v_room_availability AS
        SELECT r.*,
               (
                 r.is_rentable
                 AND NOT EXISTS (
                   SELECT 1
                   FROM lease l
                   WHERE l.room_id = r.id
                     AND l.early_termination_date IS NULL
                     AND l.end_date >= CURRENT_DATE
                     AND l.deleted_at IS NULL
                 )
               ) AS is_available
        FROM room r
        WHERE r.deleted_at IS NULL
    """)
    
    # View: v_room_current_tenant
    op.execute("""
        CREATE OR REPLACE VIEW v_room_current_tenant AS
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
            t.address AS tenant_address,
            
            -- Lease Information
            l.id AS lease_id,
            l.start_date AS lease_start_date,
            l.end_date AS lease_end_date,
            l.early_termination_date,
            l.monthly_rent,
            l.deposit,
            l.pay_rent_on,
            l.payment_term,
            -- Calculate lease status
            CASE 
                WHEN l.early_termination_date IS NOT NULL THEN '終止'
                WHEN l.end_date < CURRENT_DATE THEN '到期'
                ELSE '有效'
            END AS lease_status,
            l.vehicle_plate,
            l.assets,
            l.created_at AS lease_created_at,
            
            -- Lease-Tenant Relationship
            lt.tenant_role,
            lt.joined_at,
            
            -- Room Information
            r.size_ping,
            r.is_rentable
            
        FROM room r
        INNER JOIN building b ON b.id = r.building_id
        LEFT JOIN lease l ON l.room_id = r.id 
            -- Active lease only: no early_termination_date and end_date >= CURRENT_DATE
            AND l.early_termination_date IS NULL
            AND l.end_date >= CURRENT_DATE
            AND l.deleted_at IS NULL
        LEFT JOIN lease_tenant lt ON lt.lease_id = l.id
        LEFT JOIN tenant t ON t.id = lt.tenant_id 
            AND t.deleted_at IS NULL
        WHERE r.deleted_at IS NULL
        ORDER BY r.id, lt.tenant_role DESC
    """)
    
    # View: v_room_payment_history (no status column reference, but included for completeness)
    op.execute("""
        CREATE OR REPLACE VIEW v_room_payment_history AS
        SELECT 
            r.id AS room_id,
            CONCAT(r.floor_no, r.room_no) AS room_number,
            
            -- Invoice/Payment Information
            inv.id AS invoice_id,
            inv.category,
            inv.period_start,
            inv.period_end,
            inv.due_date,
            inv.due_amount,
            inv.paid_amount,
            inv.status AS payment_status,
            inv.created_at AS invoice_created_at,
            
            -- Lease Information
            l.id AS lease_id,
            l.start_date AS lease_start_date,
            l.end_date AS lease_end_date,
            
            -- Tenant Information (primary tenant)
            t.id AS tenant_id,
            CONCAT(t.last_name, t.first_name) AS tenant_name,
            
            -- Payment Status Details
            CASE 
                WHEN inv.status = '已交' THEN 'Paid'::TEXT
                WHEN inv.status = '未交' THEN 'Unpaid'::TEXT
                WHEN inv.status = '部分未交' THEN 'Partial'::TEXT
                WHEN inv.status = '呆帳' THEN 'Bad Debt'::TEXT
                WHEN inv.status = '歸還' THEN 'Returned'::TEXT
                WHEN inv.status = '取消' THEN 'Canceled'::TEXT
                ELSE inv.status::TEXT
            END AS payment_status_en,
            
            -- Calculate outstanding amount
            (inv.due_amount - inv.paid_amount) AS outstanding_amount,
            
            -- Period display
            CASE 
                WHEN inv.category = '房租' THEN 
                    (TO_CHAR(inv.period_start, 'YYYY-MM') || ' Rent')::TEXT
                WHEN inv.category = '電費' THEN 
                    (TO_CHAR(inv.period_start, 'YYYY-MM') || ' Electricity')::TEXT
                WHEN inv.category = '罰款' THEN 
                    ('Penalty: ' || TO_CHAR(inv.due_date, 'YYYY-MM-DD'))::TEXT
                WHEN inv.category = '押金' THEN 
                    'Deposit'::TEXT
                ELSE inv.category::TEXT
            END AS period_display

        FROM room r
        INNER JOIN lease l ON l.room_id = r.id
        LEFT JOIN invoice inv ON inv.lease_id = l.id 
            AND inv.deleted_at IS NULL
        LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
            AND lt.tenant_role = '主要'
        LEFT JOIN tenant t ON t.id = lt.tenant_id
        WHERE r.deleted_at IS NULL
            AND l.deleted_at IS NULL
        ORDER BY r.id, inv.due_date DESC, inv.created_at DESC
    """)
    
    # View: v_room_electricity_history (no status column reference, but included for completeness)
    op.execute("""
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
            
            -- Calculate cost if rate is available
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
        ORDER BY r.id, mr.read_date DESC
    """)
    
    # View: v_tenant_lease (explicitly select columns to avoid duplicate id column)
    # Note: This view includes all tenant and lease columns, with lease columns prefixed to avoid conflicts
    op.execute("""
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
            t.address,
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
    """)
    
    # View: v_room_dashboard_summary
    op.execute("""
        CREATE OR REPLACE VIEW v_room_dashboard_summary AS
        SELECT 
            -- Room Basic Info
            r.id AS room_id,
            r.building_id,
            CONCAT(r.floor_no, r.room_no) AS room_number,
            r.floor_no,
            r.room_no,
            r.size_ping,
            r.is_rentable,
            b.building_no,
            b.address AS building_address,
            
            -- Current Lease Status
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM lease l 
                    WHERE l.room_id = r.id 
                    AND l.early_termination_date IS NULL
                    AND l.end_date >= CURRENT_DATE
                    AND l.deleted_at IS NULL
                ) THEN true
                ELSE false
            END AS is_occupied,
            
            -- Current Tenant (Primary)
            t.id AS tenant_id,
            CONCAT(t.last_name, t.first_name) AS tenant_name,
            t.phone AS tenant_phone,
            t.email AS tenant_email,
            t.line_id AS tenant_line_id,
            
            -- Current Lease Details
            l.id AS lease_id,
            l.start_date AS lease_start_date,
            l.end_date AS lease_end_date,
            l.monthly_rent,
            l.deposit,
            l.pay_rent_on,
            l.payment_term,
            l.vehicle_plate,
            l.assets,
            
            -- Payment Statistics
            COALESCE(
                (SELECT COUNT(*) 
                 FROM invoice inv 
                 WHERE inv.lease_id = l.id 
                 AND inv.deleted_at IS NULL),
                0
            ) AS total_invoices,
            
            COALESCE(
                (SELECT COUNT(*) 
                 FROM invoice inv 
                 WHERE inv.lease_id = l.id 
                 AND inv.status = '未交'
                 AND inv.deleted_at IS NULL),
                0
            ) AS unpaid_invoices,
            
            COALESCE(
                (SELECT SUM(inv.due_amount - inv.paid_amount)
                 FROM invoice inv 
                 WHERE inv.lease_id = l.id 
                 AND inv.deleted_at IS NULL),
                0
            ) AS total_outstanding,
            
            -- Electricity Statistics
            COALESCE(
                (SELECT MAX(mr.read_amount)
                 FROM meter_reading mr
                 WHERE mr.room_id = r.id),
                0
            ) AS latest_meter_reading,
            
            COALESCE(
                (SELECT MAX(mr.read_date)
                 FROM meter_reading mr
                 WHERE mr.room_id = r.id),
                NULL
            ) AS latest_meter_reading_date,
            
            COALESCE(
                (SELECT SUM(inv.due_amount)
                 FROM invoice inv
                 WHERE inv.lease_id = l.id
                 AND inv.category = '電費'
                 AND inv.deleted_at IS NULL),
                0
            ) AS total_electricity_cost,
            
            COALESCE(
                (SELECT COUNT(*)
                 FROM invoice inv
                 WHERE inv.lease_id = l.id
                 AND inv.category = '電費'
                 AND inv.deleted_at IS NULL),
                0
            ) AS electricity_bill_count

        FROM room r
        INNER JOIN building b ON b.id = r.building_id
        LEFT JOIN lease l ON l.room_id = r.id 
            -- Active lease only: no early_termination_date and end_date >= CURRENT_DATE
            AND l.early_termination_date IS NULL
            AND l.end_date >= CURRENT_DATE
            AND l.deleted_at IS NULL
        LEFT JOIN lease_tenant lt ON lt.lease_id = l.id 
            AND lt.tenant_role = '主要'
        LEFT JOIN tenant t ON t.id = lt.tenant_id 
            AND t.deleted_at IS NULL
        WHERE r.deleted_at IS NULL
        ORDER BY r.building_id, r.floor_no, r.room_no
    """)


def downgrade() -> None:
    # Drop all views that were created/updated in upgrade
    # These views use calculated status logic and need to be dropped before re-adding status column
    op.execute("DROP VIEW IF EXISTS v_lease_status")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete")
    op.execute("DROP VIEW IF EXISTS v_tenant_lease")
    op.execute("DROP VIEW IF EXISTS v_room_availability")
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary")
    
    # Re-add the status column
    op.add_column('lease', 
        sa.Column('status', postgresql.ENUM('有效', '終止', '到期', name='lease_status', create_type=False), nullable=False, server_default='有效')
    )
    
    # Recreate the old unique index
    op.create_index('uq_active_lease_per_room', 'lease', ['room_id'], unique=True, 
                    postgresql_where=sa.text("status = '有效' AND deleted_at IS NULL"))
    
    # Note: Views will need to be recreated manually with old logic that uses status column

