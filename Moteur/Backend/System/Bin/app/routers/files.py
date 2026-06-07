"""File Explorer API router — Browse client files, optimizations and exports."""
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import os
import json
import io
import zipfile
import logging
from pathlib import Path
from datetime import datetime

from app.db.database import get_db, OPTIMIZATIONS_DIR
from app.models import (
    Client as ClientModel,
    Project as ProjectModel,
    OptimizationResult as OptimizationResultModel,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Path discovery ---
base_engine_path = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
user_data_root = base_engine_path / "UserData"
optimizations_dir = user_data_root / "Optimisations"
exports_dir = user_data_root / "Exports"


def _sanitize(name: str) -> str:
    """Sanitize a name for safe filesystem usage."""
    if not name:
        return "Sans_Nom"
    clean = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_", "é", "è", "ê", "ë", "à", "â", "ù", "û", "ô", "î", "ï", "ç", "ö", "ü", "ä", "Ï", "Ë", "Ä", "Ö", "Ü")).strip()
    return clean or "Sans_Nom"


def _format_size(size_bytes: int) -> str:
    """Human readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f}KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f}MB"


def _get_file_type(filename: str) -> str:
    """Get file type from extension."""
    ext = Path(filename).suffix.lower()
    type_map = {
        ".pdf": "pdf", ".png": "png", ".jpg": "image", ".jpeg": "image",
        ".dxf": "dxf", ".json": "json", ".csv": "csv", ".xlsx": "excel",
        ".svg": "svg",
    }
    return type_map.get(ext, "other")


def _scan_directory_files(dir_path: Path) -> list[dict]:
    """Scan a directory for files and return their metadata."""
    files: list[dict] = []
    if not dir_path.exists():
        return files
    for item in dir_path.iterdir():
        if item.is_file():
            try:
                stat = item.stat()
                rel_path = str(item.relative_to(user_data_root)).replace("\\", "/")
                files.append({
                    "name": item.name,
                    "type": _get_file_type(item.name),
                    "size": _format_size(stat.st_size),
                    "size_bytes": stat.st_size,
                    "path": rel_path,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
            except (OSError, ValueError):
                continue
    return sorted(files, key=lambda f: f["name"])


def _find_project_files_on_disk(client_name: str, project_name: str) -> list[dict]:
    """Find all files for a project across Optimisations and Exports directories."""
    all_files: list[dict] = []
    sanitized_client = _sanitize(client_name)
    sanitized_project = _sanitize(project_name)

    # Search in Optimisations/Clients/{Client}/{Project}/Optimisations/
    optim_path = optimizations_dir / "Clients" / sanitized_client / sanitized_project / "Optimisations"
    all_files.extend(_scan_directory_files(optim_path))

    # Search in Optimisations/Clients/{Client}/{Project}/Autres/
    autres_path = optimizations_dir / "Clients" / sanitized_client / sanitized_project / "Autres"
    all_files.extend(_scan_directory_files(autres_path))

    # Search in Optimisations/{Client}/{Project}/ (legacy structure)
    legacy_optim = optimizations_dir / sanitized_client / sanitized_project
    if legacy_optim.exists() and legacy_optim != optim_path.parent:
        all_files.extend(_scan_directory_files(legacy_optim))
        # Also scan subdirectories (date-stamped folders)
        for sub in legacy_optim.iterdir():
            if sub.is_dir():
                all_files.extend(_scan_directory_files(sub))

    # Search in Exports/{Client}/{Project}/
    export_path = exports_dir / sanitized_client / sanitized_project
    if export_path.exists():
        all_files.extend(_scan_directory_files(export_path))
        for sub in export_path.iterdir():
            if sub.is_dir():
                all_files.extend(_scan_directory_files(sub))

    # Deduplicate by path
    seen: set[str] = set()
    unique: list[dict] = []
    for f in all_files:
        if f["path"] not in seen:
            seen.add(f["path"])
            unique.append(f)
    return unique


@router.get("/tree")
def get_file_tree(db: Session = Depends(get_db)):
    """
    Returns the complete file tree organized by Client → Project → Optimizations.
    Combines database metadata with actual files on disk.
    """
    try:
        clients = (
            db.query(ClientModel)
            .options(
                joinedload(ClientModel.projects)
                .joinedload(ProjectModel.optimizations)
            )
            .all()
        )
    except Exception as e:
        logger.error(f"Error querying clients: {e}")
        clients = []

    result: list[dict] = []

    for client in clients:
        client_data: dict = {
            "id": client.id,
            "name": client.name,
            "projects": [],
        }

        for project in client.projects:
            # Get optimization records from DB
            optim_list: list[dict] = []
            for opt in project.optimizations:
                efficiency = round(100.0 - (opt.waste_percentage or 0), 1) if opt.waste_percentage is not None else None

                # Collect files for this specific optimization
                opt_files: list[dict] = []
                if opt.file_path:
                    # file_path is relative to UserData
                    full_path = user_data_root / opt.file_path.replace("/", os.sep)
                    if full_path.exists() and full_path.is_file():
                        try:
                            stat = full_path.stat()
                            opt_files.append({
                                "name": full_path.name,
                                "type": _get_file_type(full_path.name),
                                "size": _format_size(stat.st_size),
                                "size_bytes": stat.st_size,
                                "path": opt.file_path,
                                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            })
                        except OSError:
                            pass

                    # Look for sibling files (same name prefix, different extensions)
                    parent_dir = full_path.parent
                    stem = full_path.stem
                    # Remove trailing _panel_N to get the base prefix
                    base_stem = stem
                    if parent_dir.exists():
                        for sibling in parent_dir.iterdir():
                            if sibling.is_file() and sibling.name != full_path.name and sibling.stem.startswith(base_stem.rsplit("_panel", 1)[0]):
                                try:
                                    s_stat = sibling.stat()
                                    rel = str(sibling.relative_to(user_data_root)).replace("\\", "/")
                                    if not any(f["path"] == rel for f in opt_files):
                                        opt_files.append({
                                            "name": sibling.name,
                                            "type": _get_file_type(sibling.name),
                                            "size": _format_size(s_stat.st_size),
                                            "size_bytes": s_stat.st_size,
                                            "path": rel,
                                            "modified": datetime.fromtimestamp(s_stat.st_mtime).isoformat(),
                                        })
                                except (OSError, ValueError):
                                    continue

                optim_list.append({
                    "id": opt.id,
                    "date": opt.created_at.isoformat() if opt.created_at else None,
                    "efficiency": efficiency,
                    "waste_percentage": opt.waste_percentage,
                    "total_panels": opt.total_panels_used,
                    "total_cost": opt.total_cost,
                    "is_validated": opt.is_validated,
                    "files": sorted(opt_files, key=lambda f: f["name"]),
                })

            # Also find any loose files on disk for this project
            disk_files = _find_project_files_on_disk(client.name, project.name)

            # Remove files already associated with an optimization
            known_paths = set()
            for o in optim_list:
                for f in o["files"]:
                    known_paths.add(f["path"])
            orphan_files = [f for f in disk_files if f["path"] not in known_paths]

            project_data: dict = {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "optimizations": sorted(optim_list, key=lambda o: o["date"] or "", reverse=True),
                "orphan_files": orphan_files,
                "total_files": sum(len(o["files"]) for o in optim_list) + len(orphan_files),
            }
            client_data["projects"].append(project_data)

        # Add client even if no projects (for completeness)
        result.append(client_data)

    # Also add projects without a client
    try:
        orphan_projects = (
            db.query(ProjectModel)
            .filter(ProjectModel.client_id.is_(None))
            .options(joinedload(ProjectModel.optimizations))
            .all()
        )
    except Exception:
        orphan_projects = []

    if orphan_projects:
        general_client: dict = {
            "id": 0,
            "name": "Sans Client",
            "projects": [],
        }
        for project in orphan_projects:
            optim_list = []
            for opt in project.optimizations:
                efficiency = round(100.0 - (opt.waste_percentage or 0), 1) if opt.waste_percentage is not None else None
                opt_files = []
                if opt.file_path:
                    full_path = user_data_root / opt.file_path.replace("/", os.sep)
                    if full_path.exists() and full_path.is_file():
                        try:
                            stat = full_path.stat()
                            opt_files.append({
                                "name": full_path.name,
                                "type": _get_file_type(full_path.name),
                                "size": _format_size(stat.st_size),
                                "size_bytes": stat.st_size,
                                "path": opt.file_path,
                                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            })
                        except OSError:
                            pass
                optim_list.append({
                    "id": opt.id,
                    "date": opt.created_at.isoformat() if opt.created_at else None,
                    "efficiency": efficiency,
                    "waste_percentage": opt.waste_percentage,
                    "total_panels": opt.total_panels_used,
                    "total_cost": opt.total_cost,
                    "is_validated": opt.is_validated,
                    "files": opt_files,
                })

            disk_files = _find_project_files_on_disk("Général", project.name)
            known_paths = set()
            for o in optim_list:
                for f in o["files"]:
                    known_paths.add(f["path"])
            orphan_files = [f for f in disk_files if f["path"] not in known_paths]

            general_client["projects"].append({
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "optimizations": sorted(optim_list, key=lambda o: o["date"] or "", reverse=True),
                "orphan_files": orphan_files,
                "total_files": sum(len(o["files"]) for o in optim_list) + len(orphan_files),
            })
        result.append(general_client)

    return {"clients": result}


@router.get("/download/{subpath:path}")
def download_file(subpath: str):
    """Download a file from UserData by its relative path."""
    normalized = os.path.normpath(subpath)
    if normalized.startswith("..") or os.path.isabs(normalized):
        raise HTTPException(status_code=400, detail="Chemin invalide")

    file_path = os.path.normpath(os.path.join(str(user_data_root), subpath))

    if not os.path.abspath(file_path).startswith(os.path.abspath(str(user_data_root))):
        raise HTTPException(status_code=403, detail="Accès refusé")

    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    return FileResponse(
        file_path,
        filename=os.path.basename(file_path),
        media_type="application/octet-stream",
    )


@router.get("/preview/{optimization_id}")
def preview_optimization(optimization_id: int, db: Session = Depends(get_db)):
    """Return the JSON data of an optimization result for SVG preview."""
    opt = db.query(OptimizationResultModel).filter(
        OptimizationResultModel.id == optimization_id
    ).first()

    if not opt:
        raise HTTPException(status_code=404, detail="Optimisation non trouvée")

    result_data = {}
    if opt.result_data:
        try:
            result_data = json.loads(opt.result_data)
        except json.JSONDecodeError:
            result_data = {}

    return {
        "id": opt.id,
        "project_id": opt.project_id,
        "efficiency": round(100.0 - (opt.waste_percentage or 0), 1) if opt.waste_percentage is not None else None,
        "waste_percentage": opt.waste_percentage,
        "total_panels": opt.total_panels_used,
        "total_cost": opt.total_cost,
        "kerf": opt.kerf,
        "created_at": opt.created_at.isoformat() if opt.created_at else None,
        "result_data": result_data,
    }


@router.post("/open-folder")
def open_folder(path: str = Body(..., embed=True)):
    """Open a folder in Windows Explorer."""
    if not path:
        raise HTTPException(status_code=400, detail="Chemin vide")

    normalized = os.path.normpath(path)
    if normalized.startswith("..") or os.path.isabs(normalized):
        # If it's an absolute path already inside UserData, allow it
        if not os.path.abspath(normalized).startswith(os.path.abspath(str(user_data_root))):
            raise HTTPException(status_code=403, detail="Accès refusé")
        folder_path = normalized
    else:
        folder_path = os.path.normpath(os.path.join(str(user_data_root), path))

    if not os.path.abspath(folder_path).startswith(os.path.abspath(str(user_data_root))):
        raise HTTPException(status_code=403, detail="Accès refusé")

    # If it's a file, open its parent directory
    if os.path.isfile(folder_path):
        folder_path = os.path.dirname(folder_path)

    if not os.path.exists(folder_path):
        os.makedirs(folder_path, exist_ok=True)

    try:
        os.startfile(folder_path)
        return {"success": True, "path": folder_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossible d'ouvrir le dossier: {str(e)}")


@router.post("/download-zip")
def download_zip(paths: list[str] = Body(...)):
    """Download multiple files as a ZIP archive."""
    if not paths:
        raise HTTPException(status_code=400, detail="Aucun fichier sélectionné")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel_path in paths:
            normalized = os.path.normpath(rel_path)
            if normalized.startswith("..") or os.path.isabs(normalized):
                continue
            full_path = os.path.normpath(os.path.join(str(user_data_root), rel_path))
            if not os.path.abspath(full_path).startswith(os.path.abspath(str(user_data_root))):
                continue
            if os.path.exists(full_path) and os.path.isfile(full_path):
                zf.write(full_path, arcname=os.path.basename(full_path))

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=opticut_export.zip"},
    )
