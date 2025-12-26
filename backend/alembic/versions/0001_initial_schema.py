"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema matching FormosaStaySchema.sql"""
    
    # Security & Roles
    op.create_table('user_account',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_user_account'),
        sa.UniqueConstraint('email', name='uq_user_account_email')
    )
    
    op.create_table('role',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_role'),
        sa.UniqueConstraint('code', name='uq_role_code')
    )
    
    op.create_table('user_role',
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('role_id', sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user_account.id'], ondelete='CASCADE', name='fk_user_role_user'),
        sa.ForeignKeyConstraint(['role_id'], ['role.id'], ondelete='CASCADE', name='fk_user_role_role'),
        sa.PrimaryKeyConstraint('user_id', 'role_id', name='pk_user_role')
    )
    
    # Buildings & Room
    op.create_table('building',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('building_no', sa.Integer(), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_building_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_building_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_building'),
        sa.UniqueConstraint('building_no', name='uq_building_no')
    )
    
    op.create_table('room',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('building_id', sa.BigInteger(), nullable=False),
        sa.Column('floor_no', sa.Integer(), nullable=False),
        sa.Column('room_no', sa.String(length=1), nullable=False),
        sa.Column('size_ping', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('is_rentable', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], ondelete='RESTRICT', name='fk_room_building'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_room_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_room_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_room'),
        sa.UniqueConstraint('building_id', 'floor_no', 'room_no', name='uq_room'),
        sa.CheckConstraint("room_no ~ '^[A-Z]$'", name='chk_room_no_format')
    )
    op.create_index('idx_room_building', 'room', ['building_id'], unique=False)
    
    # Tenant
    op.execute("CREATE TYPE gender_type AS ENUM ('男','女','其他')")
    
    op.create_table('tenant',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('first_name', sa.Text(), nullable=False),
        sa.Column('last_name', sa.Text(), nullable=False),
        sa.Column('gender', postgresql.ENUM('男', '女', '其他', name='gender_type'), nullable=False),
        sa.Column('birthday', sa.Date(), nullable=False),
        sa.Column('personal_id', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=False),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('line_id', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ondelete='RESTRICT', name='fk_tenant_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ondelete='RESTRICT', name='fk_tenant_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_tenant'),
        sa.UniqueConstraint('personal_id', name='uq_tenant_personal_id')
    )
    
    op.create_table('tenant_emergency_contact',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.BigInteger(), nullable=False),
        sa.Column('first_name', sa.Text(), nullable=False),
        sa.Column('last_name', sa.Text(), nullable=False),
        sa.Column('relationship', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE', name='fk_ec_tenant'),
        sa.PrimaryKeyConstraint('id', name='pk_tenant_emergency_contact')
    )
    
    # Lease
    op.execute("CREATE TYPE lease_status AS ENUM ('有效','終止','到期')")
    op.execute("CREATE TYPE payment_term_type AS ENUM ('年繳','半年繳','季繳','月繳')")
    
    op.create_table('lease',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('room_id', sa.BigInteger(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('early_termination_date', sa.Date(), nullable=True),
        sa.Column('monthly_rent', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('deposit', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('pay_rent_on', sa.SmallInteger(), nullable=False),
        sa.Column('payment_term', postgresql.ENUM('年繳', '半年繳', '季繳', '月繳', name='payment_term_type'), nullable=False),
        sa.Column('status', postgresql.ENUM('有效', '終止', '到期', name='lease_status'), nullable=False),
        sa.Column('assets', postgresql.JSONB, nullable=True),
        sa.Column('vehicle_plate', sa.String(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], name='fk_lease_room'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_lease_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_lease_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_lease'),
        sa.CheckConstraint('end_date > start_date', name='chk_lease_dates'),
        sa.CheckConstraint("early_termination_date IS NULL OR (early_termination_date >= start_date AND early_termination_date <= end_date)", name='chk_early_termination'),
        sa.CheckConstraint('monthly_rent >= 0', name='chk_monthly_rent'),
        sa.CheckConstraint('deposit >= 0', name='chk_deposit'),
        sa.CheckConstraint('pay_rent_on BETWEEN 1 AND 31', name='chk_pay_rent_on'),
        sa.CheckConstraint("assets IS NULL OR (jsonb_typeof(assets) = 'array' AND (SELECT bool_and(elem->>'type' IN ('鑰匙', '磁扣', '遙控器') AND (elem->>'quantity')::integer >= 1) FROM jsonb_array_elements(assets) AS elem))", name='chk_lease_assets_structure')
    )
    op.create_index('idx_lease_room', 'lease', ['room_id'], unique=False)
    op.create_index('uq_active_lease_per_room', 'lease', ['room_id'], unique=True, 
                    postgresql_where=sa.text("status = '有效' AND deleted_at IS NULL"))
    
    op.execute("CREATE TYPE tenant_role_type AS ENUM ('主要','次要')")
    
    op.create_table('lease_tenant',
        sa.Column('lease_id', sa.BigInteger(), nullable=False),
        sa.Column('tenant_id', sa.BigInteger(), nullable=False),
        sa.Column('tenant_role', postgresql.ENUM('主要', '次要', name='tenant_role_type'), nullable=False),
        sa.Column('joined_at', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=True),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], ondelete='CASCADE', name='fk_lt_lease'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='RESTRICT', name='fk_lt_tenant'),
        sa.PrimaryKeyConstraint('lease_id', 'tenant_id', name='pk_lease_tenant')
    )
    op.create_index('uq_primary_tenant', 'lease_tenant', ['lease_id'], unique=True, 
                    postgresql_where=sa.text("tenant_role = '主要'"))
    
    # Invoice
    op.execute("CREATE TYPE payment_status AS ENUM ('未交','已交','部分未交','呆帳','歸還','取消')")
    op.execute("CREATE TYPE invoice_category AS ENUM ('房租','電費', '罰款', '押金')")
    
    op.create_table('invoice',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('lease_id', sa.BigInteger(), nullable=False),
        sa.Column('category', postgresql.ENUM('房租', '電費', '罰款', '押金', name='invoice_category'), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('due_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('paid_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0')),
        sa.Column('status', postgresql.ENUM('未交', '已交', '部分未交', '呆帳', '歸還', '取消', name='payment_status'), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], ondelete='RESTRICT', name='fk_invoice_lease'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_invoice_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_invoice_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_invoice'),
        sa.CheckConstraint('due_amount >= 0', name='chk_invoice_due_amount'),
        sa.CheckConstraint('paid_amount >= 0', name='chk_invoice_paid_amount'),
        sa.UniqueConstraint('lease_id', 'category', 'period_start', 'period_end', name='uq_invoice_period', deferrable=True, initially='IMMEDIATE')
    )
    op.create_index('idx_invoice_lease', 'invoice', ['lease_id'], unique=False)
    op.create_index('uq_invoice_period_active', 'invoice', ['lease_id', 'category', 'period_start', 'period_end'], 
                    unique=True, postgresql_where=sa.text('deleted_at IS NULL'))
    
    # Electricity
    op.create_table('electricity_rate',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('building_id', sa.BigInteger(), nullable=False),
        sa.Column('room_id', sa.BigInteger(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('rate_per_kwh', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], name='fk_rate_building'),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], name='fk_rate_room'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_rate_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_rate_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_electricity_rate')
    )
    
    op.create_table('meter_reading',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('room_id', sa.BigInteger(), nullable=False),
        sa.Column('read_date', sa.Date(), nullable=False),
        sa.Column('read_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], name='fk_meter_room'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_meter_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_meter_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_meter_reading'),
        sa.UniqueConstraint('room_id', 'read_date', name='uq_meter_reading')
    )
    op.create_index('idx_meter_room_date', 'meter_reading', ['room_id', 'read_date'], unique=False)
    
    # Cash Flow
    op.execute("CREATE TYPE cash_direction_type AS ENUM ('收入','支出','轉帳')")
    op.execute("CREATE TYPE cash_account_type AS ENUM ('現金','銀行','第三方支付')")
    op.execute("CREATE TYPE payment_method_type AS ENUM ('現金','銀行轉帳','LINE Pay','其他')")
    
    op.create_table('cash_flow_category',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('direction', postgresql.ENUM('收入', '支出', '轉帳', name='cash_direction_type'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_cash_flow_category'),
        sa.UniqueConstraint('code', name='uq_cash_flow_category_code')
    )
    
    op.create_table('cash_account',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('account_type', postgresql.ENUM('現金', '銀行', '第三方支付', name='cash_account_type'), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_cash_account')
    )
    
    op.create_table('cash_flow',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('category_id', sa.BigInteger(), nullable=False),
        sa.Column('cash_account_id', sa.BigInteger(), nullable=False),
        sa.Column('lease_id', sa.BigInteger(), nullable=True),
        sa.Column('building_id', sa.BigInteger(), nullable=True),
        sa.Column('room_id', sa.BigInteger(), nullable=True),
        sa.Column('invoice_id', sa.BigInteger(), nullable=True),
        sa.Column('flow_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_method', postgresql.ENUM('現金', '銀行轉帳', 'LINE Pay', '其他', name='payment_method_type'), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['cash_flow_category.id'], name='fk_cf_category'),
        sa.ForeignKeyConstraint(['cash_account_id'], ['cash_account.id'], name='fk_cf_account'),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], name='fk_cf_lease'),
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], name='fk_cf_building'),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], name='fk_cf_room'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoice.id'], name='fk_cf_invoice'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id', name='pk_cash_flow'),
        sa.CheckConstraint('amount >= 0', name='chk_cf_amount'),
        sa.CheckConstraint("(room_id IS NULL AND building_id IS NULL) OR (room_id IS NOT NULL AND building_id IS NOT NULL)", name='chk_cf_room_requires_building')
    )
    op.create_index('idx_cf_date', 'cash_flow', ['flow_date'], unique=False)
    op.create_index('idx_cf_category', 'cash_flow', ['category_id'], unique=False)
    op.create_index('idx_cf_account', 'cash_flow', ['cash_account_id'], unique=False)
    op.create_index('idx_cf_lease', 'cash_flow', ['lease_id'], unique=False)
    
    op.create_table('cash_flow_attachment',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('cash_flow_id', sa.BigInteger(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['cash_flow_id'], ['cash_flow.id'], ondelete='CASCADE', name='fk_attachment_cf'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], name='fk_attachment_created_by'),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], name='fk_attachment_updated_by'),
        sa.PrimaryKeyConstraint('id', name='pk_cash_flow_attachment')
    )
    
    # Create triggers and functions
    op.execute("""
        CREATE OR REPLACE FUNCTION enforce_room_building_match()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.room_id IS NOT NULL AND NEW.building_id IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1
                    FROM room r
                    WHERE r.id = NEW.room_id
                      AND r.building_id = NEW.building_id
                ) THEN
                    RAISE EXCEPTION
                        'room_id % does not belong to building_id %',
                        NEW.room_id, NEW.building_id;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION enforce_lease_room_building_match()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.lease_id IS NOT NULL THEN
                -- Validate lease <-> room
                IF NEW.room_id IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM lease l
                    WHERE l.id = NEW.lease_id AND l.room_id = NEW.room_id
                ) THEN
                    RAISE EXCEPTION
                        'lease_id % does not belong to room_id %',
                        NEW.lease_id, NEW.room_id;
                END IF;

                -- Validate lease <-> building
                IF NEW.building_id IS NOT NULL AND NOT EXISTS (
                    SELECT 1 
                    FROM lease l
                    JOIN room r ON r.id = l.room_id
                    WHERE l.id = NEW.lease_id AND r.building_id = NEW.building_id
                ) THEN
                    RAISE EXCEPTION
                        'lease_id % does not belong to building_id %',
                        NEW.lease_id, NEW.building_id;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_deleted_parent()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.lease_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM lease
                WHERE id = NEW.lease_id AND deleted_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION 'Referenced lease % is deleted', NEW.lease_id;
            END IF;

            IF NEW.room_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM room
                WHERE id = NEW.room_id AND deleted_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION 'Referenced room % is deleted', NEW.room_id;
            END IF;

            IF NEW.building_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM building
                WHERE id = NEW.building_id AND deleted_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION 'Referenced building % is deleted', NEW.building_id;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_deleted_room()
        RETURNS trigger AS $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM room
                WHERE id = NEW.room_id
                  AND deleted_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION
                    'Cannot create lease for deleted room %',
                    NEW.room_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_deleted_tenant()
        RETURNS trigger AS $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM tenant
                WHERE id = NEW.tenant_id
                  AND deleted_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION
                    'Cannot assign deleted tenant % to lease',
                    NEW.tenant_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trg_cf_room_building
        BEFORE INSERT OR UPDATE ON cash_flow
        FOR EACH ROW
        EXECUTE FUNCTION enforce_room_building_match();
    """)
    
    op.execute("""
        CREATE TRIGGER trg_cf_lease_room_building
        BEFORE INSERT OR UPDATE ON cash_flow
        FOR EACH ROW
        EXECUTE FUNCTION enforce_lease_room_building_match();
    """)
    
    op.execute("""
        CREATE TRIGGER trg_invoice_no_deleted_lease
        BEFORE INSERT OR UPDATE ON invoice
        FOR EACH ROW
        EXECUTE FUNCTION prevent_deleted_parent();
    """)
    
    op.execute("""
        CREATE TRIGGER trg_lease_no_deleted_room
        BEFORE INSERT OR UPDATE ON lease
        FOR EACH ROW
        EXECUTE FUNCTION prevent_deleted_room();
    """)
    
    op.execute("""
        CREATE TRIGGER trg_lease_tenant_no_deleted_tenant
        BEFORE INSERT OR UPDATE ON lease_tenant
        FOR EACH ROW
        EXECUTE FUNCTION prevent_deleted_tenant();
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION soft_delete(
            p_table TEXT,
            p_id BIGINT
        ) RETURNS VOID AS $$
        BEGIN
            IF p_table NOT IN (
                'building',
                'room',
                'tenant',
                'lease',
                'invoice',
                'cash_flow'
            ) THEN
                RAISE EXCEPTION 'Soft delete not allowed on table %', p_table;
            END IF;

            EXECUTE format(
                'UPDATE %I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
                p_table
            ) USING p_id;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Insert initial data
    # Insert default roles
    op.execute("""
        INSERT INTO role (code, description) VALUES
        ('admin', 'System administrator'),
        ('manager', 'Property manager'),
        ('engineer', 'System engineer / developer')
    """)
    
    # Insert default cash flow categories (using Chinese direction values)
    op.execute("""
        INSERT INTO cash_flow_category (code, name, direction) VALUES
        ('rent', '租金', '收入'),
        ('deposit_received', '押金', '收入'),
        ('deposit_returned', '退押金', '支出'),
        ('referral_fee', '介紹費', '支出'),
        ('tenant_electricity', '住戶電費', '收入'),
        ('manager_salary', '管理員薪水', '支出'),
        ('manager_bonus', '管理員獎金', '支出'),
        ('maintenance', '維修費', '支出'),
        ('new_equipment', '新設備', '支出'),
        ('building_electricity', '大樓電費支出', '支出'),
        ('water', '水費', '支出'),
        ('tax', '稅', '支出'),
        ('internet', '網路費', '支出'),
        ('stationery', '文具', '支出'),
        ('daily_supply', '日常用品', '支出'),
        ('misc', '其他', '支出'),
        ('bank_transfer', '匯馬玲帳戶', '轉帳'),
        ('bank_fee', '匯費', '支出')
    """)
    
    # Insert user accounts
    op.execute("""
        INSERT INTO user_account (email, password_hash)
        VALUES
            ('bboy80345@gmail.com', 'admin1030'),
            ('ys.yang884532@gmail.com', 'manager884532')
    """)
    
    # Assign roles to users
    op.execute("""
        INSERT INTO user_role (user_id, role_id)
        SELECT u.id, r.id
        FROM user_account u
        JOIN role r ON r.code = 'admin'
        WHERE u.email = 'bboy80345@gmail.com'
    """)
    
    op.execute("""
        INSERT INTO user_role (user_id, role_id)
        SELECT u.id, r.id
        FROM user_account u
        JOIN role r ON r.code = 'manager'
        WHERE u.email = 'ys.yang884532@gmail.com'
    """)
    
    # Insert buildings
    op.execute("""
        INSERT INTO building (building_no, address, created_by)
        SELECT 2, '台南市鹽水區和平路65巷9弄2號', id
        FROM user_account
        WHERE email = 'bboy80345@gmail.com'
    """)
    
    op.execute("""
        INSERT INTO building (building_no, address, created_by)
        SELECT 6, '台南市鹽水區和平路65巷9弄6號', id
        FROM user_account
        WHERE email = 'bboy80345@gmail.com'
    """)
    
    op.execute("""
        INSERT INTO building (building_no, address, created_by)
        SELECT 147, '台南市鹽水區朝琴路147號', id
        FROM user_account
        WHERE email = 'bboy80345@gmail.com'
    """)
    
    op.execute("""
        INSERT INTO building (building_no, address, created_by)
        SELECT 149, '台南市鹽水區朝琴路149號', id
        FROM user_account
        WHERE email = 'bboy80345@gmail.com'
    """)
    
    # Insert rooms for all buildings
    # Building 147: 2A, 3A, 3B, 4A, 4B, 5A, 5B
    op.execute("""
        INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
        SELECT b.id, v.floor_no, v.room_no, u.id, u.id
        FROM building b, user_account u, (VALUES
            (2, 'A'),
            (3, 'A'),
            (3, 'B'),
            (4, 'A'),
            (4, 'B'),
            (5, 'A'),
            (5, 'B')
        ) AS v(floor_no, room_no)
        WHERE b.building_no = 147 AND u.email = 'bboy80345@gmail.com'
    """)
    
    # Building 149: 2A, 2B, 2C, 3A, 3B, 4A, 4B, 5A, 5B
    op.execute("""
        INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
        SELECT b.id, v.floor_no, v.room_no, u.id, u.id
        FROM building b, user_account u, (VALUES
            (2, 'A'), (2, 'B'), (2, 'C'),
            (3, 'A'), (3, 'B'),
            (4, 'A'), (4, 'B'),
            (5, 'A'), (5, 'B')
        ) AS v(floor_no, room_no)
        WHERE b.building_no = 149 AND u.email = 'bboy80345@gmail.com'
    """)
    
    # Building 2: 1A, 1C, 1D, 2A, 2B, 2C, 2D, 2E, 3A, 3B, 3C, 3D, 3E, 4A, 4B, 4C, 4D, 4E, 5A, 5B, 5C, 5D, 5E
    op.execute("""
        INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
        SELECT b.id, v.floor_no, v.room_no, u.id, u.id
        FROM building b, user_account u, (VALUES
            (1, 'A'), (1, 'C'), (1, 'D'),
            (2, 'A'), (2, 'B'), (2, 'C'), (2, 'D'), (2, 'E'),
            (3, 'A'), (3, 'B'), (3, 'C'), (3, 'D'), (3, 'E'),
            (4, 'A'), (4, 'B'), (4, 'C'), (4, 'D'), (4, 'E'),
            (5, 'A'), (5, 'B'), (5, 'C'), (5, 'D'), (5, 'E')
        ) AS v(floor_no, room_no)
        WHERE b.building_no = 2 AND u.email = 'bboy80345@gmail.com'
    """)
    
    # Building 6: 1A, 1B, 1C, 1D, 1E, 2A, 2B, 2C, 2D, 2E, 2F, 3A, 3B, 3C, 3D, 3E, 3F, 4A, 4B, 4C, 4D, 4E, 4F, 5A, 5B, 5C, 5D, 5E, 5F
    op.execute("""
        INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
        SELECT b.id, v.floor_no, v.room_no, u.id, u.id
        FROM building b, user_account u, (VALUES
            (1, 'A'), (1, 'B'), (1, 'C'), (1, 'D'), (1, 'E'),
            (2, 'A'), (2, 'B'), (2, 'C'), (2, 'D'), (2, 'E'), (2, 'F'),
            (3, 'A'), (3, 'B'), (3, 'C'), (3, 'D'), (3, 'E'), (3, 'F'),
            (4, 'A'), (4, 'B'), (4, 'C'), (4, 'D'), (4, 'E'), (4, 'F'),
            (5, 'A'), (5, 'B'), (5, 'C'), (5, 'D'), (5, 'E'), (5, 'F')
        ) AS v(floor_no, room_no)
        WHERE b.building_no = 6 AND u.email = 'bboy80345@gmail.com'
    """)


def downgrade() -> None:
    """Drop all tables and functions"""
    op.execute("DROP TRIGGER IF EXISTS trg_lease_tenant_no_deleted_tenant ON lease_tenant")
    op.execute("DROP TRIGGER IF EXISTS trg_lease_no_deleted_room ON lease")
    op.execute("DROP TRIGGER IF EXISTS trg_invoice_no_deleted_lease ON invoice")
    op.execute("DROP TRIGGER IF EXISTS trg_cf_lease_room_building ON cash_flow")
    op.execute("DROP TRIGGER IF EXISTS trg_cf_room_building ON cash_flow")
    op.execute("DROP FUNCTION IF EXISTS soft_delete")
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
