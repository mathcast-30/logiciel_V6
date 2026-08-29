from __future__ import annotations
import os
import shutil
import sys
import json
import hashlib
import zipfile
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import TYPE_CHECKING

# Pas d'import de typing pour l'exécution, tout est natif en 3.9+ avec future annotations

class BackupManager:
    """
    Gestionnaire de Sauvegarde et Restauration "Grade Industriel"
    """

    db_path: Path
    documents_path: Path
    base_dir: Path
    backup_dir: Path
    temp_dir: Path

    def __init__(self) -> None:
        # Configuration des chemins robustes
        if getattr(sys, 'frozen', False):
            # Exécutable PyInstaller : données persistantes dans %APPDATA%
            appdata = Path(os.environ.get('APPDATA', str(Path.home() / 'AppData' / 'Roaming')))
            base_engine_dir = appdata / 'OptiCutPro'
        else:
            # Développement : trouver le dossier Moteur par traversal
            current_path = Path(__file__).resolve()
            try:
                moteur_index = current_path.parts.index('Moteur')
                base_engine_dir = Path(*current_path.parts[:moteur_index + 1])
            except ValueError:
                base_engine_dir = current_path.parent.parent.parent.parent.parent

            # En dév, les données sont dans Moteur/UserData
            base_engine_dir = base_engine_dir / 'UserData'

        self.base_dir = base_engine_dir
        self.db_path = self.base_dir / 'BaseDeDonnees' / 'opticut.db'
        self.documents_path = self.base_dir / 'Documents'
        self.backup_dir = self.base_dir / 'Sauvegardes' / 'Backups'
        self.temp_dir = self.backup_dir / '.temp'

        # Création des dossiers nécessaires
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
        self.temp_dir.mkdir(exist_ok=True)

    def _get_iso_timestamp(self) -> str:
        """Génère un timestamp ISO 8601 strict pour les noms de fichiers"""
        return datetime.now().strftime("%Y-%m-%d_%H-%M")

    def _parse_backup_date(self, filename: str) -> datetime | None:
        """Extrait la date depuis le nom de fichier ISO"""
        try:
            # Format attendu: backup_YYYY-MM-DD_HH-mm.zip
            date_part = filename.replace("backup_", "").replace(".zip", "")
            return datetime.strptime(date_part, "%Y-%m-%d_%H-%M")
        except ValueError:
            return None

    def create_metada(self, filename: str, is_auto: bool, notes: str = "") -> None:
        """Crée le fichier metadata.json pour une sauvegarde"""
        metadata: dict[str, object] = {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "type": "auto" if is_auto else "manual",
            "notes": notes,
            "original_filename": filename,
            "system_info": {
                "platform": os.name
            }
        }
        
        if self.db_path.exists():
            with open(self.db_path, "rb") as f:
                file_hash = hashlib.sha256()
                while chunk := f.read(8192):
                    file_hash.update(chunk)
                metadata["db_hash"] = file_hash.hexdigest()

        with open(self.temp_dir / "metadata.json", "w", encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

    def create_backup(self, is_auto: bool = False, notes: str = "") -> str:
        """
        Crée une sauvegarde complète (DB + Documents).
        """
        if not self.db_path.exists():
            raise FileNotFoundError(f"Base de données introuvable: {self.db_path}")

        staging_dir = self.temp_dir / "staging"
        try:
            timestamp = self._get_iso_timestamp()
            backup_filename = f"backup_{timestamp}.zip"
            backup_path = self.backup_dir / backup_filename
            
            if staging_dir.exists():
                shutil.rmtree(staging_dir)
            staging_dir.mkdir()

            # DB (Copie sécurisée via sqlite3 pour éviter le lock)
            import sqlite3
            dest_db = staging_dir / "opticut.db"
            try:
                uri_path = self.db_path.as_uri() + "?mode=ro"
                src = sqlite3.connect(uri_path, uri=True)
                dst = sqlite3.connect(dest_db)
                src.backup(dst)
                src.close()
                dst.close()
            except sqlite3.OperationalError:
                _ = shutil.copy2(self.db_path, dest_db)
            
            # Documents
            if self.documents_path.exists():
                docs_staging = staging_dir / "Documents"
                _ = shutil.copytree(self.documents_path, docs_staging)

            # Metadata
            self.create_metada(backup_filename, is_auto, notes)
            _ = shutil.copy2(self.temp_dir / "metadata.json", staging_dir / "metadata.json")

            # ZIP
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
                for root, _, files in os.walk(staging_dir):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(staging_dir)
                        zipf.write(file_path, arcname)

            shutil.rmtree(staging_dir)
            self._apply_retention_policy()

            return backup_filename

        except Exception as e:
            if staging_dir.exists():
                 shutil.rmtree(staging_dir)
            raise OSError(f"Erreur lors de la création de la sauvegarde: {str(e)}")

    def _apply_retention_policy(self) -> None:
        """
        Applique la politique de rétention "Grade Industriel"
        """
        all_backups = self.list_backups()
        if not all_backups:
            return

        all_backups.sort(key=lambda x: str(x["created_at"]), reverse=True)
        
        # 1. Garder les 5 plus récents
        keep_recent = {str(b["filename"]) for b in all_backups[:5]}
        
        # 2. Garder dernier du mois
        keep_monthly = set()
        # On utilise 'object' pour le type de valeur du dict, pour éviter 'Any'
        monthly_backups: dict[str, list[dict[str, object]]] = defaultdict(list) 
        
        for backup in all_backups:
            try:
                dt_str = str(backup["created_at"])
                if 'T' in dt_str:
                    dt = datetime.fromisoformat(dt_str)
                    month_key = dt.strftime("%Y-%m")
                    monthly_backups[month_key].append(backup)
            except (ValueError, TypeError):
                continue

        for _, backups_in_month in monthly_backups.items():
            if backups_in_month:
                keep_monthly.add(str(backups_in_month[0]["filename"]))
        
        files_to_keep = keep_recent | keep_monthly
        
        deleted_count = 0
        deleted_size = 0
        
        for backup in all_backups:
            filename = str(backup["filename"])
            if filename not in files_to_keep:
                file_path = self.backup_dir / filename
                try:
                    size = file_path.stat().st_size
                    file_path.unlink()
                    deleted_count += 1
                    deleted_size += size
                except OSError:
                    pass

        if deleted_count > 0:
            print(f"[RETENTION] OK {deleted_count} sauvegarde(s) supprimée(s), {self._format_size(deleted_size)} libéré(s)")

    def _format_size(self, size_bytes: int) -> str:
        """Formate la taille en unités lisibles"""
        params_size = float(size_bytes)
        for unit in ['o', 'Ko', 'Mo', 'Go']:
            if params_size < 1024.0:
                return f"{params_size:.1f} {unit}"
            params_size /= 1024.0
        return f"{params_size:.1f} To"

    def list_backups(self) -> list[dict[str, object]]: # 'object' au lieu de 'Any'
        """Retourne la liste de toutes les sauvegardes disponibles"""
        backups: list[dict[str, object]] = []
        
        # ZIP
        for zip_file in self.backup_dir.glob("backup_*.zip"):
            try:
                stat = zip_file.stat()
                backup_date = self._parse_backup_date(zip_file.name)
                
                # Metadata
                backup_type = "auto"
                try:
                    with zipfile.ZipFile(zip_file, 'r') as zf:
                        if 'metadata.json' in zf.namelist():
                            meta_content = zf.read('metadata.json')
                            metadata = json.loads(meta_content)
                            val = metadata.get("type", "auto")
                            if isinstance(val, str):
                                backup_type = val
                except (zipfile.BadZipFile, KeyError, json.JSONDecodeError):
                    pass
                
                final_date = backup_date.isoformat() if backup_date else datetime.fromtimestamp(stat.st_mtime).isoformat()
                
                backups.append({
                    "filename": zip_file.name,
                    "size_bytes": stat.st_size,
                    "created_at": final_date,
                    "type": backup_type,
                })
            except OSError:
                continue
        
        # BAK
        for bak_file in self.backup_dir.glob("*.bak"):
            try:
                stat = bak_file.stat()
                backups.append({
                    "filename": bak_file.name,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "legacy",
                })
            except OSError:
                continue
        
        return sorted(backups, key=lambda x: str(x['created_at']), reverse=True)


    def restore_backup(self, filename: str) -> None:
        """
        Restaure une sauvegarde spécifique.
        """
        backup_path = self.backup_dir / filename
        if not backup_path.exists():
            raise FileNotFoundError("Fichier de sauvegarde introuvable")

        print("[RESTORE] Création du point de sécurité...")
        _ = self.create_backup(is_auto=True, notes=f"Point de sécurité avant restauration de {filename}")

        extract_dir = self.temp_dir / "restore_staging"
        if extract_dir.exists():
            shutil.rmtree(extract_dir)
        extract_dir.mkdir()

        try:
            if filename.endswith('.zip'):
                with zipfile.ZipFile(backup_path, 'r') as zf:
                    zf.extractall(extract_dir)
            else:
                _ = shutil.copy2(backup_path, extract_dir / "opticut.db")

            source_db = extract_dir / "opticut.db"
            if source_db.exists():
                 _ = shutil.copy2(source_db, self.db_path)
            
            source_docs = extract_dir / "Documents"
            if source_docs.exists():
                if self.documents_path.exists():
                    shutil.rmtree(self.documents_path)
                _ = shutil.copytree(source_docs, self.documents_path)

            print(f"[RESTORE] Succès: {filename} restauré")

        except Exception as e:
            raise OSError(f"Erreur intégrité fichier backup: {str(e)}")
        finally:
             if extract_dir.exists():
                 shutil.rmtree(extract_dir)

    def delete_backup(self, filename: str) -> None:
        """Supprime définitivement un fichier de sauvegarde"""
        file_path = self.backup_dir / filename
        if not file_path.exists():
             raise FileNotFoundError("Fichier introuvable")
        
        file_path.unlink()

    def import_external_backup(self, file_path: Path) -> str:
        """Importe un fichier externe (.zip ou .bak)"""
        if not file_path.exists():
             raise FileNotFoundError("Fichier source introuvable")

        timestamp = self._get_iso_timestamp()
        new_filename = f"backup_{timestamp}{file_path.suffix}"
        dest_path = self.backup_dir / new_filename
        
        _ = shutil.copy2(file_path, dest_path)
        return new_filename

_manager_instance: BackupManager | None = None

def get_backup_manager() -> BackupManager:
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = BackupManager()
    return _manager_instance
