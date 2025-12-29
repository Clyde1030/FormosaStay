"""remove lease status column

Revision ID: 0002_remove_lease_status_column
Revises: 0001_initial_schema
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from db_tools.migration_utils import execute_sql_file

# revision identifiers, used by Alembic.
revision = '0002_remove_lease_status_column'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop the unique index that uses status column
    op.drop_index('uq_active_lease_per_room', table_name='lease')
    
    op.execute("DROP VIEW IF EXISTS v_lease_status CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_availability CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_lease CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_account CASCADE")

    op.drop_column('lease', 'status')

    execute_sql_file(op, "0002_v_lease_status.sql")
    execute_sql_file(op, "0002_v_room_availability.sql")
    execute_sql_file(op, "0002_v_room_current_tenant.sql")
    execute_sql_file(op, "0002_v_room_dashboard_summary.sql")
    execute_sql_file(op, "0002_v_room_electricity_history.sql")
    execute_sql_file(op, "0002_v_room_payment_history.sql")
    execute_sql_file(op, "0002_v_tenant_complete.sql")
    execute_sql_file(op, "0002_v_tenant_lease.sql")
    execute_sql_file(op, "0002_v_user_account.sql")


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

