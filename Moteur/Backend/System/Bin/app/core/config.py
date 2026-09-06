"""
OptiCut Pro — Configuration centralisée & chemins persistants.
Toutes les données utilisateur sont stockées localement dans %APPDATA% (Windows)
ou ~/.config (Linux/Mac) ou via OPTICUT_DATA_DIR.
"""
from __future__ import annotations
import os
import sys
import secrets
from pathlib import Path


def get_data_dir() -> Path:
    """
    Retourne le répertoire de données persistantes de l'application.
    TOUJOURS isolé par utilisateur.
    """
    # 1. Chemin personnalisé via variable d'environnement (pour tests ou NAS)
    custom_path = os.getenv("OPTICUT_DATA_DIR")
    if custom_path:
        data_dir = Path(custom_path).resolve()
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir

    # 2. Déterminer le dossier de données selon l'OS
    if sys.platform == "win32":
        # Windows: %APPDATA%\OptiCutPro
        appdata = Path(os.environ.get('APPDATA', str(Path.home() / 'AppData' / 'Roaming')))
    elif sys.platform == "darwin":
        # Mac: ~/Library/Application Support/OptiCutPro
        appdata = Path.home() / 'Library' / 'Application Support'
    else:
        # Linux: ~/.config/OptiCutPro
        appdata = Path.home() / '.config'

    data_dir = appdata / 'OptiCutPro'
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def ensure_data_structure() -> Path:
    """
    Crée la structure de données nécessaire au premier lancement.
    Retourne le chemin du dossier UserData / OptiCutPro.
    """
    data_dir = get_data_dir()

    # Créer les sous-dossiers
    (data_dir / 'BaseDeDonnees').mkdir(parents=True, exist_ok=True)
    (data_dir / 'Optimisations').mkdir(parents=True, exist_ok=True)
    (data_dir / 'Exports').mkdir(parents=True, exist_ok=True)
    (data_dir / 'Sauvegardes').mkdir(parents=True, exist_ok=True)
    (data_dir / 'Imports').mkdir(parents=True, exist_ok=True)
    (data_dir / 'StepFiles').mkdir(parents=True, exist_ok=True)

    # Créer un .env avec une clé JWT unique s'il n'existe pas
    env_path = data_dir / '.env'
    if not env_path.exists():
        db_path = data_dir / 'BaseDeDonnees' / 'opticut.db'
        secret = secrets.token_hex(32)
        env_path.write_text(
            f"# OptiCut Pro — Généré automatiquement au premier lancement\n"
            f"JWT_SECRET_KEY={secret}\n"
            f"DB_PATH={db_path}\n",
            encoding='utf-8',
        )
        print(f"[CONFIG] Premier lancement : .env créé dans {env_path}")

    return data_dir


def ensure_env_file() -> Path:
    """Garantit l'existence de l'environnement et retourne le chemin vers .env."""
    data_dir = ensure_data_structure()
    return data_dir / '.env'
