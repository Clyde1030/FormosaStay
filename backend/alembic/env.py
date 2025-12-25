from alembic import context
from sqlalchemy import engine_from_config, pool

import logging

from app.config import settings
from app.models.base import Base
from app.models import *

logger = logging.getLogger(__name__)

config = context.config
config.set_main_option(
    "sqlalchemy.url",
    settings.sync_database_url
)

target_metadata = Base.metadata



def run_migrations_online():
    connectable = engine_from_config(
        {"sqlalchemy.url": settings.sync_database_url},
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema="public",
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    raise RuntimeError("Offline migrations not supported")
else:
    run_migrations_online()

