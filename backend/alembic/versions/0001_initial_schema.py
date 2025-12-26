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
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    op.create_table('role',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    op.create_table('user_role',
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('role_id', sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user_account.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['role.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
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
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('building_no')
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
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("room_no ~ '^[A-Z]$'", name='check_room_no'),
        sa.UniqueConstraint('building_id', 'floor_no', 'room_no', name='uq_room')
    )
    op.create_index('idx_room_building', 'room', ['building_id'], unique=False)
    
    # Tenant
    op.create_table('tenant',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('first_name', sa.Text(), nullable=False),
        sa.Column('last_name', sa.Text(), nullable=False),
        sa.Column('gender', sa.String(length=1), nullable=False),
        sa.Column('birthday', sa.Date(), nullable=False),
        sa.Column('personal_id', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=False),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('line_id', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('personal_id'),
        sa.CheckConstraint("gender IN ('M','F','O')", name='check_gender')
    )
    
    op.create_table('tenant_emergency_contact',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.BigInteger(), nullable=False),
        sa.Column('first_name', sa.Text(), nullable=False),
        sa.Column('last_name', sa.Text(), nullable=False),
        sa.Column('relationship', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Lease
    op.execute("CREATE TYPE lease_status AS ENUM ('active','terminated','expired')")
    
    op.create_table('lease',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('room_id', sa.BigInteger(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('early_termination_date', sa.Date(), nullable=True),
        sa.Column('monthly_rent', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('deposit', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('pay_rent_on', sa.SmallInteger(), nullable=False),
        sa.Column('payment_term', sa.String(), nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'terminated', 'expired', name='lease_status'), nullable=False),
        sa.Column('vehicle_plate', sa.String(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('end_date > start_date', name='check_end_after_start'),
        sa.CheckConstraint("early_termination_date IS NULL OR (early_termination_date >= start_date AND early_termination_date <= end_date)", name='check_early_termination_date'),
        sa.CheckConstraint('pay_rent_on BETWEEN 1 AND 31', name='check_pay_rent_on'),
        sa.CheckConstraint('monthly_rent >= 0', name='check_monthly_rent_positive'),
        sa.CheckConstraint('deposit >= 0', name='check_deposit_positive')
    )
    op.create_index('idx_lease_room', 'lease', ['room_id'], unique=False)
    op.create_index('uq_active_lease_per_room', 'lease', ['room_id'], unique=True, 
                    postgresql_where=sa.text("status = 'active' AND deleted_at IS NULL"))
    
    op.create_table('lease_tenant',
        sa.Column('lease_id', sa.BigInteger(), nullable=False),
        sa.Column('tenant_id', sa.BigInteger(), nullable=False),
        sa.Column('tenant_role', sa.String(), nullable=False),
        sa.Column('joined_at', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=True),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('lease_id', 'tenant_id'),
        sa.CheckConstraint("tenant_role IN ('primary','co_tenant')", name='check_tenant_role')
    )
    op.create_index('uq_primary_tenant', 'lease_tenant', ['lease_id'], unique=True, 
                    postgresql_where=sa.text("tenant_role = 'primary'"))
    
    op.create_table('lease_asset',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('lease_id', sa.BigInteger(), nullable=False),
        sa.Column('asset_type', sa.String(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("asset_type IN ('key', 'fob', 'controller')", name='check_asset_type')
    )
    
    # Invoice
    op.create_table('invoice',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('lease_id', sa.BigInteger(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('due_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('paid_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0')),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], name='fk_payment_lease'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("category IN ('rent','electricity','penalty','deposit')", name='check_category'),
        sa.CheckConstraint("status IN ('unpaid','paid','partial','bad_debt','returned','canceled')", name='check_status'),
        sa.CheckConstraint('due_amount >= 0', name='check_due_amount_positive'),
        sa.CheckConstraint('paid_amount >= 0', name='check_paid_amount_positive'),
        sa.UniqueConstraint('lease_id', 'category', 'period_start', 'period_end', name='uq_payment_period', deferrable=True, initially='IMMEDIATE')
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
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id')
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
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('room_id', 'read_date', name='uq_meter_reading')
    )
    op.create_index('idx_meter_room_date', 'meter_reading', ['room_id', 'read_date'], unique=False)
    
    # Cash Flow
    op.create_table('cash_flow_category',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('direction', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.CheckConstraint("direction IN ('in', 'out', 'transfer')", name='check_direction')
    )
    
    op.create_table('cash_account',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("account_type IN ('cash', 'bank', 'third_party')", name='check_account_type')
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
        sa.Column('payment_method', sa.String(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['cash_flow_category.id'], ),
        sa.ForeignKeyConstraint(['cash_account_id'], ['cash_account.id'], ),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], ),
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], ),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoice.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('amount >= 0', name='check_amount_positive'),
        sa.CheckConstraint("payment_method IN ('cash', 'bank_transfer', 'linepay', 'other')", name='check_payment_method'),
        sa.CheckConstraint("(room_id IS NULL AND building_id IS NULL) OR (room_id IS NOT NULL AND building_id IS NOT NULL)", name='check_cf_room_requires_building')
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
        sa.ForeignKeyConstraint(['cash_flow_id'], ['cash_flow.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['user_account.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['user_account.id'], ),
        sa.PrimaryKeyConstraint('id')
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
            IF TG_TABLE_NAME = 'invoice' THEN
                IF EXISTS (
                    SELECT 1 FROM lease
                    WHERE id = NEW.lease_id
                      AND deleted_at IS NOT NULL
                ) THEN
                    RAISE EXCEPTION 'Cannot create invoice for deleted lease %', NEW.lease_id;
                END IF;
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
        CREATE OR REPLACE FUNCTION soft_delete(
            p_table TEXT,
            p_id BIGINT
        ) RETURNS VOID AS $$
        BEGIN
            EXECUTE format(
                'UPDATE %I SET deleted_at = now() WHERE id = $1',
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
    
    # Insert default cash flow categories
    op.execute("""
        INSERT INTO cash_flow_category (code, name, direction) VALUES
        ('rent', '租金', 'in'),
        ('deposit_received', '押金', 'in'),
        ('deposit_returned', '退押金', 'out'),
        ('referral_fee', '介紹費', 'out'),
        ('tenant_electricity', '住戶電費', 'in'),
        ('manager_salary', '管理員薪水', 'out'),
        ('manager_bonus', '管理員獎金', 'out'),
        ('maintenance', '維修費', 'out'),
        ('new_equipment', '新設備', 'out'),
        ('building_electricity', '大樓電費支出', 'out'),
        ('water', '水費', 'out'),
        ('tax', '稅', 'out'),
        ('internet', '網路費', 'out'),
        ('stationery', '文具', 'out'),
        ('daily_supply', '日常用品', 'out'),
        ('misc', '其他', 'out'),
        ('bank_transfer', '匯馬玲帳戶', 'transfer'),
        ('bank_fee', '匯費', 'out')
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
    op.execute("DROP TRIGGER IF EXISTS trg_invoice_no_deleted_lease ON invoice")
    op.execute("DROP TRIGGER IF EXISTS trg_cf_lease_room_building ON cash_flow")
    op.execute("DROP TRIGGER IF EXISTS trg_cf_room_building ON cash_flow")
    op.execute("DROP FUNCTION IF EXISTS soft_delete")
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
    op.drop_table('lease_asset')
    op.drop_index('uq_primary_tenant', table_name='lease_tenant')
    op.drop_table('lease_tenant')
    op.drop_index('uq_active_lease_per_room', table_name='lease')
    op.drop_index('idx_lease_room', table_name='lease')
    op.drop_table('lease')
    op.execute("DROP TYPE IF EXISTS lease_status")
    op.drop_table('tenant_emergency_contact')
    op.drop_table('tenant')
    op.drop_index('idx_room_building', table_name='room')
    op.drop_table('room')
    op.drop_table('building')
    op.drop_table('user_role')
    op.drop_table('role')
    op.drop_table('user_account')

