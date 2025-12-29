"""remove lease status column and create views

Revision ID: 0002_remove_lease_status_column
Revises: 0001_initial_schema
Create Date: 2024-01-01 12:00:00.000000

This migration:
- Removes the lease.status column if it exists (for backward compatibility with older schemas)
- Creates/updates all database views that use calculated lease status
- The initial schema (0001) doesn't have a status column, so this migration is primarily
  for creating the views and ensuring compatibility if migrating from an older version
"""
from alembic import op
import sqlalchemy as sa

from db_tools.migration_utils import execute_sql_file

# revision identifiers, used by Alembic.
revision = '0002_remove_lease_status_column'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop the unique index that uses status column (if it exists)
    # Note: This index doesn't exist in the initial schema, but may exist in older versions
    op.execute("DROP INDEX IF EXISTS uq_active_lease_per_room")
    
    # Drop all views before recreating them with updated logic
    op.execute("DROP VIEW IF EXISTS v_lease_status CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_availability CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_lease CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_account CASCADE")

    # Drop status column if it exists (for backward compatibility)
    op.execute("""
        DO $$ 
        BEGIN 
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'lease' AND column_name = 'status'
            ) THEN
                ALTER TABLE lease DROP COLUMN status;
            END IF;
        END $$;
    """)

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
    op.execute("DROP VIEW IF EXISTS v_lease_status CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_complete CASCADE")
    op.execute("DROP VIEW IF EXISTS v_tenant_lease CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_availability CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_current_tenant CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_payment_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_electricity_history CASCADE")
    op.execute("DROP VIEW IF EXISTS v_room_dashboard_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_account CASCADE")
    
    # Create the lease_status ENUM type if it doesn't exist
    op.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lease_status') THEN
                CREATE TYPE lease_status AS ENUM ('pending', 'active', 'terminated', 'expired');
            END IF;
        END $$;
    """)
    
    # Re-add the status column only if it doesn't exist
    op.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'lease' AND column_name = 'status'
            ) THEN
                ALTER TABLE lease ADD COLUMN status lease_status NOT NULL DEFAULT 'active';
            END IF;
        END $$;
    """)
    
    # Recreate the old unique index
    op.create_index('uq_active_lease_per_room', 'lease', ['room_id'], unique=True, 
                    postgresql_where=sa.text("status = 'active' AND deleted_at IS NULL"))
    
    # Note: Views will need to be recreated manually with old logic that uses status column

