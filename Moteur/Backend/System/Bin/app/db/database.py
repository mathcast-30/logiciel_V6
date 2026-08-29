"""
Initialisation SQLAlchemy — OptiCut Pro.

Utilise get_data_dir() (app/core/config.py) pour tous les chemins persistants,
ce qui garantit le bon fonctionnement en mode développement ET en mode .exe PyInstaller.
"""
from __future__ import annotations
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# --- 1. Charger la configuration persistante en PREMIER ---
# Cela doit se faire avant toute utilisation de os.getenv() liée à l'app.
from ..core.config import ensure_env_file, get_data_dir

env_path = ensure_env_file()
load_dotenv(dotenv_path=env_path)

# --- 2. Résoudre les chemins de données ---
data_dir = get_data_dir()

db_dir    = data_dir / 'BaseDeDonnees'
optim_dir = data_dir / 'Optimisations'
db_dir.mkdir(parents=True, exist_ok=True)
optim_dir.mkdir(parents=True, exist_ok=True)

# DB_PATH dans .env prend le dessus (cas migrations manuelles / tests)
db_path_env = os.getenv('DB_PATH')
if db_path_env:
    db_path = Path(db_path_env).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
else:
    db_path = db_dir / 'opticut.db'

OPTIMIZATIONS_DIR = optim_dir

# --- 3. Initialiser SQLAlchemy ---
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


# --- 4. Dépendance FastAPI ---
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
