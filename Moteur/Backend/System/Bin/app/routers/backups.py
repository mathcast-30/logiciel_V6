from __future__ import annotations
import shutil
from pathlib import Path

# On ignore les erreurs d'import pour l'IDE, mais on garde les imports réels
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Depends # type: ignore
from fastapi.responses import FileResponse, JSONResponse # type: ignore
import asyncio
import traceback

from IA_Engine.backup import BackupManager, get_backup_manager
from ..monitoring_client import log_error

# Note: Le préfixe est géré par main.py (/api/backups)
router = APIRouter(
    tags=["backups"],
    responses={404: {"description": "Non trouvé"}},
)

@router.post("")
async def create_backup(background_tasks: BackgroundTasks, manager=Depends(get_backup_manager)): # type: ignore
    """Déclenche une sauvegarde manuelle"""
    try:
        loop = asyncio.get_event_loop()
        # On utilise run_in_executor pour ne pas bloquer FastAPI avec la copie SQLite/ZIP
        filename = await loop.run_in_executor(None, manager.create_backup, False, "Sauvegarde manuelle via API")
        return {
            "filename": filename,
            "status": "success", 
            "message": "Sauvegarde créée avec succès"
        }
    except Exception as e:
        error_details = traceback.format_exc()
        log_error("API", "POST /api/backups", f"Erreur lors de la sauvegarde manuelle: {str(e)}\n{error_details}", e)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erreur interne lors de la sauvegarde: {str(e)}"}
        )

@router.get("")
async def list_backups(manager=Depends(get_backup_manager)): # type: ignore
    """Liste toutes les sauvegardes disponibles"""
    return manager.list_backups()

@router.get("/stats")
async def get_backup_stats(manager=Depends(get_backup_manager)): # type: ignore
    """Retourne des statistiques sur les sauvegardes"""
    backups = manager.list_backups()
    
    total_size = sum(int(b.get("size_bytes", 0)) for b in backups)
    auto_count = sum(1 for b in backups if b.get("type") == "auto")
    manual_count = sum(1 for b in backups if b.get("type") == "manual")
    
    # Gestion des listes vides pour éviter IndexError
    newest = backups[0]["created_at"] if backups else None
    oldest = backups[-1]["created_at"] if backups else None

    return {
        "total_backups": len(backups),
        "total_size_bytes": total_size,
        "oldest_backup": oldest,
        "newest_backup": newest,
        "auto_count": auto_count,
        "manual_count": manual_count
    }

@router.post("/{filename}/restore")
async def restore_backup(filename: str, background_tasks: BackgroundTasks, manager=Depends(get_backup_manager)): # type: ignore
    """Restaure une sauvegarde spécifique"""
    try:
        manager.restore_backup(filename)
        return {
            "status": "success",
            "message": "Système restauré avec succès. Un point de sauvegarde de sécurité a été créé.",
            "warning": "Redémarrez l'application pour appliquer les changements."
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier de sauvegarde introuvable") # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) # type: ignore

@router.delete("/{filename}")
async def delete_backup(filename: str, manager=Depends(get_backup_manager)): # type: ignore
    """Supprime une sauvegarde"""
    try:
        manager.delete_backup(filename)
        return {"status": "success", "message": f"Sauvegarde {filename} supprimée"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier introuvable") # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) # type: ignore

@router.get("/{filename}/download")
async def download_backup(filename: str, manager=Depends(get_backup_manager)): # type: ignore
    """Télécharge un fichier de sauvegarde"""
    file_path = manager.backup_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable") # type: ignore
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/zip'
    )

@router.post("/upload")
async def upload_backup(file: UploadFile = File(...), manager=Depends(get_backup_manager)): # type: ignore
    """Importe un fichier de sauvegarde externe (.zip ou .bak)"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide") # type: ignore

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.zip') or filename_lower.endswith('.bak')):
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez .zip ou .bak") # type: ignore
    
    # Sauvegarder dans temp
    temp_path = manager.temp_dir / file.filename
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        new_filename = manager.import_external_backup(temp_path)
        
        # Nettoyage du fichier temporaire uploadé
        if temp_path.exists():
            temp_path.unlink()
            
        return {
            "filename": new_filename,
            "status": "uploaded",
            "message": f"Fichier importé et renommé en {new_filename}"
        }
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}") # type: ignore
