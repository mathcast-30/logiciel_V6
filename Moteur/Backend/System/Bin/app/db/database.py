"""
Initialisation SQLAlchemy — OptiCut Pro.
Utilise ensure_data_structure() pour garantir que UserData existe.
"""
from __future__ import annotations
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# --- 1. S'assurer que la structure de données existe ---
from ..core.config import ensure_data_structure, get_data_dir

data_dir = ensure_data_structure()

# --- 2. Charger la configuration ---
env_path = data_dir / '.env'
load_dotenv(dotenv_path=env_path)

# --- 3. Résoudre les chemins ---
db_dir = data_dir / 'BaseDeDonnees'
optim_dir = data_dir / 'Optimisations'
db_dir.mkdir(parents=True, exist_ok=True)
optim_dir.mkdir(parents=True, exist_ok=True)

db_path_env = os.getenv('DB_PATH')
if db_path_env:
    db_path = Path(db_path_env).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
else:
    db_path = db_dir / 'opticut.db'

OPTIMIZATIONS_DIR = optim_dir

# --- 4. Initialiser SQLAlchemy ---
print(f"[DATABASE] Fichier utilisé : {db_path}")
print(f"[STORAGE]  Optimisations  : {OPTIMIZATIONS_DIR}")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Classe de base pour tous les modèles SQLAlchemy."""
    pass


# --- 5. Dépendance FastAPI ---
logger = logging.getLogger(__name__)


def get_db():
    """
    Fournit une session DB pour chaque requête (pattern FastAPI standard).
    La session est automatiquement fermée en fin de requête.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
