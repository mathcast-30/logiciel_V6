"""
OptiCut Pro — Configuration centralisée & chemins persistants.

Règle absolue : toutes les données utilisateur DOIVENT passer par get_data_dir().
Ne jamais utiliser Path(__file__) pour localiser UserData dans un router ou service.
"""
from __future__ import annotations
import os
import sys
import secrets
from pathlib import Path


def get_data_dir() -> Path:
    """
    Retourne le répertoire de données persistantes de l'application.

    Logique :
    - Mode .exe (sys.frozen == True) → %APPDATA%\\OptiCutPro\\
    - Mode développement              → Moteur/UserData/

    Le dossier est créé automatiquement s'il n'existe pas.
    """
    if getattr(sys, 'frozen', False):
        # Exécutable PyInstaller : données persistantes dans le profil utilisateur
        appdata = Path(os.environ.get('APPDATA', str(Path.home() / 'AppData' / 'Roaming')))
        data_dir = appdata / 'OptiCutPro'
    else:
        # Développement : remonter jusqu'à Moteur, puis UserData/
        current = Path(__file__).resolve()
        try:
            moteur_index = current.parts.index('Moteur')
            moteur_dir = Path(*current.parts[:moteur_index + 1])
        except ValueError:
            # Fallback sécurisé si la structure de dossiers diffère
            moteur_dir = current.parent.parent.parent.parent.parent.parent
        data_dir = moteur_dir / 'UserData'

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def ensure_env_file() -> Path:
    """
    Garantit qu'un fichier .env existe dans DATA_DIR.

    - Génère un JWT_SECRET_KEY cryptographiquement sûr au premier lancement.
    - Ne remplace JAMAIS un .env existant (idempotent).

    Retourne le chemin du .env utilisé.
    """
    data_dir = get_data_dir()
    env_path = data_dir / '.env'

    if not env_path.exists():
        db_path = data_dir / 'BaseDeDonnees' / 'opticut.db'
        secret = secrets.token_hex(32)
        env_path.write_text(
            f"# OptiCut Pro — généré automatiquement au premier lancement\n"
            f"JWT_SECRET_KEY={secret}\n"
            f"DB_PATH={db_path}\n",
            encoding='utf-8',
        )
        print(f"[CONFIG] Premier lancement : .env créé dans {env_path}")

    return env_path
