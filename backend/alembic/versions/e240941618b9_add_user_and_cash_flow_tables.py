"""add user and cash flow tables

Revision ID: e240941618b9
Revises: f45c1ef96b82
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e240941618b9'
down_revision: Union[str, None] = 'f45c1ef96b82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add user account, role, and cash flow tables."""
    # Create user_account table
    op.create_table('user_account',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    # Create role table
    op.create_table('role',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    # Create user_role junction table
    op.create_table('user_role',
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('role_id', sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user_account.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['role.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )
    
    # Create cash_flow_category table
    op.create_table('cash_flow_category',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('direction', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.CheckConstraint("direction IN ('in', 'out', 'transfer')", name='check_direction'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    
    # Create cash_account table
    op.create_table('cash_account',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.CheckConstraint("account_type IN ('cash', 'bank', 'third_party')", name='check_account_type'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create cash_flow table
    op.create_table('cash_flow',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('category_id', sa.BigInteger(), nullable=False),
        sa.Column('cash_account_id', sa.BigInteger(), nullable=False),
        sa.Column('lease_id', sa.BigInteger(), nullable=True),
        sa.Column('building_id', sa.BigInteger(), nullable=True),
        sa.Column('room_id', sa.BigInteger(), nullable=True),
        sa.Column('flow_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('amount >= 0', name='check_amount_positive'),
        sa.CheckConstraint("payment_method IN ('cash', 'bank_transfer', 'linepay', 'other')", name='check_payment_method'),
        sa.ForeignKeyConstraint(['category_id'], ['cash_flow_category.id'], ),
        sa.ForeignKeyConstraint(['cash_account_id'], ['cash_account.id'], ),
        sa.ForeignKeyConstraint(['lease_id'], ['lease.id'], ),
        sa.ForeignKeyConstraint(['building_id'], ['building.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['room.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for cash_flow
    op.create_index('idx_cf_date', 'cash_flow', ['flow_date'], unique=False)
    op.create_index('idx_cf_category', 'cash_flow', ['category_id'], unique=False)
    op.create_index('idx_cf_account', 'cash_flow', ['cash_account_id'], unique=False)
    op.create_index('idx_cf_lease', 'cash_flow', ['lease_id'], unique=False)
    
    # Create cash_flow_attachment table
    op.create_table('cash_flow_attachment',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('cash_flow_id', sa.BigInteger(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=False),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['cash_flow_id'], ['cash_flow.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
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
    
    # Insert default roles
    op.execute("""
        INSERT INTO role (code, description) VALUES
        ('admin', 'System administrator'),
        ('manager', 'Property manager'),
        ('engineer', 'System engineer / developer')
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
        SELECT 147, '台南市鹽水區朝琴路149號', id
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
    """Remove user account, role, and cash flow tables."""
    op.drop_table('cash_flow_attachment')
    op.drop_index('idx_cf_lease', table_name='cash_flow')
    op.drop_index('idx_cf_account', table_name='cash_flow')
    op.drop_index('idx_cf_category', table_name='cash_flow')
    op.drop_index('idx_cf_date', table_name='cash_flow')
    op.drop_table('cash_flow')
    op.drop_table('cash_account')
    op.drop_table('cash_flow_category')
    op.drop_table('user_role')
    op.drop_table('role')
    op.drop_table('user_account')

