"""
Module de vérification d'intégrité de la base de données SQLite pour OptiCut Pro.
"""
from __future__ import annotations
import sqlite3
from pathlib import Path


def check_database_integrity(db_path: Path) -> tuple[bool, str]:
    """
    Vérifie l'intégrité de la base de données SQLite.
    Retourne (True, 'ok') si tout va bien, ou (False, message_erreur) si corrompue.
    """
    if not db_path.exists():
        # Pas encore de fichier DB -> Rien de corrompu
        return True, "ok"

    try:
        # Connexion en mode lecture seule pour la vérification
        uri_path = f"{db_path.as_uri()}?mode=ro"
        conn = sqlite3.connect(uri_path, uri=True, timeout=5.0)
        cursor = conn.cursor()
        
        _ = cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchall()
        conn.close()

        if result and len(result) == 1 and result[0][0] == "ok":
            return True, "ok"
        
        messages = [str(row[0]) for row in result]
        return False, "; ".join(messages)

    except sqlite3.Error as e:
        return False, f"Erreur SQLite lors du contrôle d'intégrité: {str(e)}"
    except Exception as e:
        return False, f"Erreur inattendue: {str(e)}"

