from logging.config import fileConfig
import sys
from pathlib import Path
from sqlalchemy import create_engine, pool
from alembic import context

# Ensure bin directory is in sys.path
bin_dir = Path(__file__).resolve().parent.parent
if str(bin_dir) not in sys.path:
    sys.path.insert(0, str(bin_dir))

from app.db.database import Base, SQLALCHEMY_DATABASE_URL
import app.models  # Ensures all models are registered in Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = SQLALCHEMY_DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True  # Essential for SQLite ALTER TABLE support
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    
    Uses a dedicated NullPool engine (one connection per operation, immediately
    closed) to avoid sharing connections with the FastAPI app engine — which
    would cause SQLite to deadlock when upgrade() is called at startup.
    """
    # Dedicated engine for Alembic: NullPool = no persistent connections
    url = config.get_main_option("sqlalchemy.url") or SQLALCHEMY_DATABASE_URL
    connectable = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True  # Essential for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
