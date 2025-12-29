"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union
from alembic import op

from db_tools.migration_utils import execute_sql_file

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Create initial schema matching FormosaStaySchema.sql"""
    execute_sql_file(op, "0000_schema.sql")
    
    # Insert initial data
    execute_sql_file(op, "0001_seed.sql")

def downgrade() -> None:
    """Drop all tables and functions"""
    op.execute("DROP TRIGGER IF EXISTS trg_lease_tenant_no_deleted_tenant ON lease_tenant")
    op.execute("DROP TRIGGER IF EXISTS trg_lease_validate_assets ON lease")
    op.execute("DROP TRIGGER IF EXISTS trg_lease_no_deleted_room ON lease")
    op.execute("DROP TRIGGER IF EXISTS trg_invoice_no_deleted_lease ON invoice")
    op.execute("DROP TRIGGER IF EXISTS trg_cf_lease_room_building ON cash_flow")
    op.execute("DROP TRIGGER IF EXISTS trg_cf_room_building ON cash_flow")
    op.execute("DROP FUNCTION IF EXISTS soft_delete")
    op.execute("DROP FUNCTION IF EXISTS validate_lease_assets")
    op.execute("DROP FUNCTION IF EXISTS prevent_deleted_tenant")
    op.execute("DROP FUNCTION IF EXISTS prevent_deleted_room")
    op.execute("DROP FUNCTION IF EXISTS prevent_deleted_parent")
    op.execute("DROP FUNCTION IF EXISTS enforce_lease_room_building_match")
    op.execute("DROP FUNCTION IF EXISTS enforce_room_building_match")
    
    op.drop_table('cash_flow_attachment')
    op.drop_index('idx_cf_lease', table_name='cash_flow')
    op.drop_index('idx_cf_account', table_name='cash_flow')
    op.drop_index('idx_cf_category', table_name='cash_flow')
    op.drop_index('idx_cf_date', table_name='cash_flow')
    op.drop_table('cash_flow')
    op.drop_table('cash_account')
    op.drop_table('cash_flow_category')
    op.drop_index('idx_meter_room_date', table_name='meter_reading')
    op.drop_table('meter_reading')
    op.drop_table('electricity_rate')
    op.drop_index('uq_invoice_period_active', table_name='invoice')
    op.drop_index('idx_invoice_lease', table_name='invoice')
    op.drop_table('invoice')
    op.drop_index('uq_primary_tenant', table_name='lease_tenant')
    op.drop_table('lease_tenant')
    op.drop_index('uq_active_lease_per_room', table_name='lease')
    op.drop_index('idx_lease_room', table_name='lease')
    op.drop_table('lease')
    op.execute("DROP TYPE IF EXISTS payment_method_type")
    op.execute("DROP TYPE IF EXISTS cash_account_type")
    op.execute("DROP TYPE IF EXISTS cash_direction_type")
    op.execute("DROP TYPE IF EXISTS invoice_category")
    op.execute("DROP TYPE IF EXISTS payment_status")
    op.execute("DROP TYPE IF EXISTS tenant_role_type")
    op.execute("DROP TYPE IF EXISTS payment_term_type")
    op.execute("DROP TYPE IF EXISTS lease_status")
    op.drop_table('tenant_emergency_contact')
    op.drop_table('tenant')
    op.execute("DROP TYPE IF EXISTS gender_type")
    op.drop_index('idx_room_building', table_name='room')
    op.drop_table('room')
    op.drop_table('building')
    op.drop_table('user_role')
    op.drop_table('role')
    op.drop_table('user_account')
