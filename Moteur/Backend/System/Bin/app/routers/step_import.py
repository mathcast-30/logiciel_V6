"""
STEP Import API Router - Handles STEP file upload, parsing, and auto-extraction
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models import Material, Part, Project, StepModel

# Import OCC availability flags alongside the extractor
from IA_Engine.step_parser import OCC_AVAILABLE, OCC_IMPORT_ERROR, OCC_VERSION, StepExtractor

logger = logging.getLogger(__name__)
router = APIRouter()

# Storage directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "UserData" / "StepFiles"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ExtractedPartData(BaseModel):
    """Internal schema for validating part data extracted from STEP."""
    name: str
    thickness: float
    width: float
    length: float
    quantity: int = 1
    material_id: Optional[int] = None
    original_dimensions: Dict[str, float] = {"x": 0.0, "y": 0.0, "z": 0.0}
    is_modified: bool = False
    volume_mm3: float = 0.0
    volume_accuracy: float = 0.0
    obb_center: List[float] = [0.0, 0.0, 0.0]
    extraction_method: str = "Unknown"
    original_name: str = ""


class StepImportResponse(BaseModel):
    step_model_id: int
    filename: str
    parts: List[ExtractedPartData]
    metadata: Dict
    warnings: List[str] = []


class MaterialAssignment(BaseModel):
    thickness: float
    material_id: int


class BulkMaterialAssignment(BaseModel):
    assignments: List[MaterialAssignment]


class OccStatusResponse(BaseModel):
    occ_available: bool
    occ_version: str
    python_executable: str
    import_error: Optional[str] = None
    install_command: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

_INSTALL_CMD = "conda install -c conda-forge pythonocc-core=7.8.1"


def _raise_occ_unavailable() -> None:
    """Return a clear 503 response when pythonOCC is missing in the runtime env."""
    raise HTTPException(
        status_code=503,
        detail={
            "error": "occ_not_available",
            "message": (
                "La bibliothèque pythonOCC n'est pas disponible dans l'environnement Python "
                "courant. L'import STEP est désactivé."
            ),
            "python_executable": sys.executable,
            "import_error": OCC_IMPORT_ERROR or "Module OCC non trouvé",
            "install_command": _INSTALL_CMD,
            "tip": (
                "Assurez-vous que le backend tourne avec le bon env conda : "
                "conda activate opticut_pro"
            ),
        },
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/system/occ-status", response_model=OccStatusResponse)
async def get_occ_status():
    """
    Diagnostic endpoint — returns pythonOCC availability without requiring a file upload.
    Useful to verify the runtime environment before attempting imports.
    """
    return OccStatusResponse(
        occ_available=OCC_AVAILABLE,
        occ_version=OCC_VERSION,
        python_executable=sys.executable,
        import_error=OCC_IMPORT_ERROR if not OCC_AVAILABLE else None,
        install_command=_INSTALL_CMD if not OCC_AVAILABLE else None,
    )


@router.post("/projects/{project_id}/import-step", response_model=StepImportResponse)
async def import_step_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import a STEP file and return extracted parts for manual validation."""

    # Fast-fail with a clear 503 if OCC is not in the current Python runtime
    if not OCC_AVAILABLE:
        _raise_occ_unavailable()

    if not file.filename.lower().endswith(('.stp', '.step')):
        raise HTTPException(400, "Le fichier doit avoir l'extension .stp ou .step")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, f"Projet {project_id} introuvable")

    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()

    existing = (
        db.query(StepModel)
        .filter(StepModel.project_id == project_id, StepModel.file_hash == file_hash)
        .first()
    )
    if existing:
        logger.info("Overwriting existing STEP import %s for project %s", existing.id, project_id)
        if existing.filepath and Path(existing.filepath).exists():
            try:
                Path(existing.filepath).unlink()
            except Exception:
                pass
        db.delete(existing)
        db.commit()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = UPLOAD_DIR / f"{project_id}_{timestamp}_{file.filename}"
    filepath.write_bytes(file_content)

    import_warnings = []

    try:
        result = StepExtractor(str(filepath)).parse()
        import_warnings.extend(result.get('warnings', []))
    except RuntimeError as e:
        logger.error("OCC unavailable at parse time (env issue): %s", e)
        filepath.unlink(missing_ok=True)
        raise HTTPException(
            status_code=503,
            detail={
                "error": "occ_not_available",
                "message": str(e),
                "install_command": _INSTALL_CMD,
            },
        )
    except (ValueError, FileNotFoundError) as e:
        logger.warning("STEP parse error for project %s: %s", project_id, e)
        filepath.unlink(missing_ok=True)
        raise HTTPException(400, f"Erreur parsing STEP : {e}")
    except Exception as e:
        logger.exception("Erreur critique lors de l'extraction STEP")
        filepath.unlink(missing_ok=True)
        raise HTTPException(500, f"Erreur interne lors du parsing STEP : {e}")

    step_model = StepModel(
        project_id=project_id,
        filename=file.filename,
        filepath=str(filepath),
        file_hash=file_hash,
        file_metadata=json.dumps(result['metadata']),
    )
    db.add(step_model)
    db.flush()

    # Group identical parts using standard extraction keys
    extracted_parts_list: List[ExtractedPartData] = []
    
    # Standardizing naming and sorting logic
    # The parser already sorted t < w < l, but we group them here for UI efficiency
    grouped: Dict[tuple, Dict] = {}
    for p in result['parts']:
        try:
            t = p.get('epaisseur', 0.0)
            w = p.get('largeur', 0.0)
            l = p.get('longueur', 0.0)
            raw_name = p.get('nom', 'Untitled')
            cleaned_name = re.sub(r'[\d_]+$', '', raw_name).strip() or raw_name
            
            key = (t, w, l, cleaned_name)
            
            if key not in grouped:
                grouped[key] = {
                    'name': cleaned_name,
                    'thickness': t,
                    'width': w,
                    'length': l,
                    'quantity': 1,
                    'original_dimensions': p.get('original_dimensions', {"x": t, "y": w, "z": l}),
                    'is_modified': False,
                    'volume_mm3': p.get('volume_mm3', 0.0),
                    'volume_accuracy': p.get('volume_accuracy_percent', 0.0),
                    'obb_center': p.get('obb_center', [0.0, 0.0, 0.0]),
                    'extraction_method': p.get('extraction_method', 'OBB-XDE'),
                    'original_name': raw_name
                }
            else:
                grouped[key]['quantity'] += 1
        except Exception as e:
            import_warnings.append(f"Erreur groupement : {e}")

    for raw_data in sorted(grouped.values(), key=lambda x: x['thickness']):
        extracted_parts_list.append(ExtractedPartData(**raw_data))

    db.commit() # Save the StepModel record

    return StepImportResponse(
        step_model_id=step_model.id,
        filename=file.filename,
        parts=extracted_parts_list,
        metadata=result['metadata'],
        warnings=import_warnings,
    )


@router.post("/step-models/{step_model_id}/confirm")
async def confirm_import(
    step_model_id: int,
    parts: List[ExtractedPartData],
    db: Session = Depends(get_db),
):
    """Save manually validated parts to the database."""
    step_model = db.query(StepModel).filter(StepModel.id == step_model_id).first()
    if not step_model:
        raise HTTPException(404, "Modèle STEP introuvable")

    created_parts = []
    for p in parts:
        part = Part(
            project_id=step_model.project_id,
            step_model_id=step_model_id,
            name=p.name,
            width=p.width,
            height=p.length, # length is height in DB (legacy mapping)
            quantity=p.quantity,
            material_id=p.material_id,
            auto_extracted=True,
            allow_rotation=True,
            grain_direction=0,
            extraction_metadata=json.dumps({
                'thickness': p.thickness,
                'is_modified': p.is_modified,
                'original_dimensions': p.original_dimensions,
                'volume_mm3': p.volume_mm3,
                'obb_center': p.obb_center,
                'original_name': p.original_name,
            }),
        )
        db.add(part)
        created_parts.append(part)

    db.commit()
    return {"message": f"{len(created_parts)} pièces ajoutées au projet", "count": len(created_parts)}




@router.get("/projects/{project_id}/step-models")
async def get_step_models(project_id: int, db: Session = Depends(get_db)):
    models = (
        db.query(StepModel)
        .filter(StepModel.project_id == project_id)
        .options(joinedload(StepModel.extracted_parts))
        .all()
    )
    return [
        {
            "id": m.id,
            "filename": m.filename,
            "import_date": m.import_date,
            "parts_count": len(m.extracted_parts),
            "metadata": json.loads(m.file_metadata) if m.file_metadata else {},
        }
        for m in models
    ]


@router.post("/step-models/{step_model_id}/assign-materials")
async def assign_materials_bulk(
    step_model_id: int,
    data: BulkMaterialAssignment,
    db: Session = Depends(get_db),
):
    parts = db.query(Part).filter(Part.step_model_id == step_model_id).all()
    if not parts:
        raise HTTPException(404, "Aucune pièce trouvée")

    thickness_map = {a.thickness: a.material_id for a in data.assignments}
    updated = 0
    for part in parts:
        if part.extraction_metadata:
            meta = json.loads(part.extraction_metadata)
            if meta.get('thickness') in thickness_map:
                part.material_id = thickness_map[meta['thickness']]
                updated += 1

    db.commit()
    return {"message": f"{updated} pièces mises à jour", "updated_count": updated}


@router.delete("/step-models/{step_model_id}")
async def delete_step_model(step_model_id: int, db: Session = Depends(get_db)):
    step_model = db.query(StepModel).filter(StepModel.id == step_model_id).first()
    if not step_model:
        raise HTTPException(404, "Modèle introuvable")
    Path(step_model.filepath).unlink(missing_ok=True)
    db.delete(step_model)
    db.commit()
    return {"message": "Supprimé avec succès"}
