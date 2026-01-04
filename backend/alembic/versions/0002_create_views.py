"""create database views

Revision ID: 0002_create_views
Revises: 0001_initial_schema
Create Date: 2024-01-01 12:00:00.000000

This migration:
- Creates all database views for the FormosaStay application
- Views provide calculated/computed data based on the base tables
"""
from alembic import op

from db_tools.migration_utils import execute_sql_file

# revision identifiers, used by Alembic.
revision = '0002_create_views'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None
 
def upgrade() -> None:
    """Create all database views"""
    # Drop all views before recreating them (in case they exist)
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_contracts CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_role CASCADE")

    # Create all views
    execute_sql_file(op, "0002_v_room_current_tenant.sql")
    execute_sql_file(op, "0002_v_room_dashboard_summary.sql")
    execute_sql_file(op, "0002_v_room_electricity_history.sql")
    execute_sql_file(op, "0002_v_room_payment_history.sql")
    execute_sql_file(op, "0002_v_tenant_complete.sql")
    execute_sql_file(op, "0002_v_contracts.sql")
    execute_sql_file(op, "0002_v_user_role.sql")



def downgrade() -> None:
    """Drop all database views"""
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_contracts CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_role CASCADE")

