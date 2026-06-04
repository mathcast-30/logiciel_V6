from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path

from dotenv import load_dotenv
import os

# Professional Data Pathing - ENGINE 
current_path = Path(__file__).resolve()
# Robustly find 'Moteur' anchor
try:
    moteur_index = current_path.parts.index("Moteur")
    base_engine_dir = Path(*current_path.parts[:moteur_index+1])
except ValueError:
    # Fallback if folder structure is weird
    base_engine_dir = current_path.parent.parent.parent.parent.parent.parent 

# Load .env at the project root (parent of Moteur)
project_root = base_engine_dir.parent
env_path = project_root / ".env"
load_dotenv(dotenv_path=env_path)

db_dir = base_engine_dir / "UserData" / "BaseDeDonnees"
optim_dir = base_engine_dir / "UserData" / "Optimisations"
db_dir.mkdir(parents=True, exist_ok=True)
optim_dir.mkdir(parents=True, exist_ok=True)

# Determine DB path: env variable DB_PATH takes precedence
db_path_env = os.getenv("DB_PATH")
if db_path_env:
    db_path = Path(db_path_env).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
else:
    db_path = db_dir / "opticut.db"

OPTIMIZATIONS_DIR = optim_dir

# SQLite database file
print(f"[DATABASE] Using file: {db_path}")
print(f"[STORAGE] Optimizations directory: {OPTIMIZATIONS_DIR}")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass

# Dependency for getting database session
import logging

logger = logging.getLogger(__name__)

def get_db():
    """
    Yields a database session (standard FastAPI pattern).
    The session is automatically closed when the request ends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

