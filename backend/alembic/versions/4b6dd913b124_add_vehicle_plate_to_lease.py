"""add vehicle_plate to lease table

Revision ID: 4b6dd913b124
Revises: e240941618b9
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b6dd913b124'
down_revision: Union[str, None] = 'e240941618b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add vehicle_plate column to lease table."""
    op.add_column('lease', sa.Column('vehicle_plate', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove vehicle_plate column from lease table."""
    op.drop_column('lease', 'vehicle_plate')

