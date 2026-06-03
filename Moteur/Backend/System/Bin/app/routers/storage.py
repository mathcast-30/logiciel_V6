import os
import stat
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

router = APIRouter()

# Setup root directory for clients (Storage root)
base_engine_path = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
CLIENTS_ROOT = base_engine_path / "clients"

# Ensure root exists
CLIENTS_ROOT.mkdir(parents=True, exist_ok=True)

def lock_file_readonly(file_path: Union[str, Path]):
    """
    Lock a critical file in read-only mode to prevent accidental deletion or modification.
    Useful for finalized devis or locked optimization matrices.
    """
    path = Path(file_path)
    if path.exists() and path.is_file():
        os.chmod(path, stat.S_IREAD)

def build_tree(dir_path: Path, root_path: Path) -> List[Dict[str, Any]]:
    """Recursively build the tree structure for the virtual explorer."""
    tree = []
    try:
        # Sort directories first, then files
        entries = sorted(os.scandir(dir_path), key=lambda e: (not e.is_dir(), e.name.lower()))
        for entry in entries:
            entry_path = Path(entry.path)
            # Relative path used as unique ID
            rel_path = str(entry_path.relative_to(root_path)).replace('\\', '/')
            
            node = {
                "id": rel_path,
                "name": entry.name,
            }
            
            if entry.is_dir():
                node["type"] = "directory"
                node["children"] = build_tree(entry_path, root_path)
            else:
                node["type"] = "file"
                node["extension"] = entry_path.suffix.lower().lstrip('.')
                node["size"] = entry.stat().st_size
                node["children"] = []
                
            tree.append(node)
    except PermissionError:
        pass # Skip unreadable directories
    return tree

@router.get("/explore")
def explore_storage():
    """
    Parcourt récursivement /clients/ pour générer l'arbre JSON complet.
    """
    tree = build_tree(CLIENTS_ROOT, CLIENTS_ROOT)
    return {"tree": tree}

@router.get("/file")
def get_file(
    path: str = Query(..., description="Chemin relatif du fichier depuis la racine /clients"),
    download: bool = Query(False, description="Si True, force le téléchargement sous forme de pièce jointe")
):
    """
    Récupère un fichier physique sous forme de flux (FileResponse).
    Sécurisé avec un sandboxing strict pour interdire la traversée de répertoires.
    """
    # Reject directory traversal attempts immediately
    if ".." in path or "~" in path:
        raise HTTPException(status_code=403, detail="Path traversal detected")
        
    requested_path = (CLIENTS_ROOT / path).resolve()
    
    # Strict validation: The resolved path MUST be inside CLIENTS_ROOT
    try:
        requested_path.relative_to(CLIENTS_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied: Path outside sandbox")
        
    if not requested_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    if not requested_path.is_file():
        raise HTTPException(status_code=400, detail="Requested path is not a file")
        
    # Optional: lock specific critical files as requested
    if requested_path.suffix.lower() == '.pdf' and 'devis' in str(requested_path).lower():
        lock_file_readonly(requested_path)
        
    if download:
        return FileResponse(
            path=str(requested_path),
            filename=requested_path.name
        )
        
    # Render inline (PDF, images, etc.) for preview
    return FileResponse(
        path=str(requested_path)
    )
