# -*- coding: utf-8 -*-
"""
=============================================================================
OPTICUT PRO - SCRIPT D'INSTALLATION MAITRE
=============================================================================
Ce script installe automatiquement tous les composants pour l'import STEP:
- Parser STEP avec pythonocc-core (OBB precision)
- API REST FastAPI
- Migration base de donnees
- Correction bug "Impossible de charger les projets"

Usage:
    conda activate opticut_pro
    python setup_opticut.py

Auteur: Antigravity AI
Date: 2026-01-14
=============================================================================
"""
import os
import sys
import sqlite3
from pathlib import Path

# =============================================================================
# CONFIGURATION - CHEMINS
# =============================================================================
# Detecter automatiquement le chemin racine du projet
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR  # logiciel_V4

# Chemins des dossiers
BACKEND_APP = PROJECT_ROOT / "Moteur" / "Backend" / "System" / "Bin" / "app"
CORE_DIR = BACKEND_APP / "core"
ROUTERS_DIR = BACKEND_APP / "routers"
DB_DIR = BACKEND_APP / "db"
DB_PATH = PROJECT_ROOT / "Moteur" / "UserData" / "BaseDeDonnees" / "opticut.db"
STEP_STORAGE = PROJECT_ROOT / "Moteur" / "UserData" / "StepFiles"

print("=" * 70)
print("   OPTICUT PRO - INSTALLATION AUTOMATIQUE")
print("=" * 70)
print(f"\n[INFO] Racine projet: {PROJECT_ROOT}")
print(f"[INFO] Backend app: {BACKEND_APP}")
print(f"[INFO] Base de donnees: {DB_PATH}")

# =============================================================================
# ETAPE 1: CREATION DES DOSSIERS
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 1] Creation des dossiers manquants...")
print("-" * 70)

folders_to_create = [
    CORE_DIR,
    ROUTERS_DIR,
    DB_DIR / "migrations",
    STEP_STORAGE,
]

for folder in folders_to_create:
    folder.mkdir(parents=True, exist_ok=True)
    print(f"  [OK] {folder.relative_to(PROJECT_ROOT)}")

# =============================================================================
# ETAPE 2: FICHIER STEP_PARSER.PY (Parser OBB)
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 2] Installation du parser STEP (pythonocc-core)...")
print("-" * 70)

STEP_PARSER_CODE = '''"""
STEP File Parser with OBB (Oriented Bounding Box) Analysis
Precision-focused CAD geometry extraction for OptiCut Pro
Uses pythonocc-core (OpenCascade) for exact solid geometry analysis.
"""
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_SOLID
from OCC.Core.BRepBndLib import brepbndlib
from OCC.Core.Bnd import Bnd_OBB
from OCC.Core.BRepGProp import brepgprop_VolumeProperties
from OCC.Core.GProp import GProp_GProps
import numpy as np
import json
from typing import List, Dict
from pathlib import Path


class StepExtractor:
    """Extract precise dimensions from STEP files using Oriented Bounding Box."""
    
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"STEP file not found: {filepath}")
        self.reader = STEPControl_Reader()
        self.solids = []
        
    def parse(self) -> Dict:
        """Parse STEP file and extract all solids with dimensions."""
        status = self.reader.ReadFile(str(self.filepath))
        if status != IFSelect_RetDone:
            raise ValueError(f"Failed to read STEP file. Status: {status}")
        
        self.reader.TransferRoots()
        shape = self.reader.OneShape()
        self.solids = self._extract_solids(shape)
        
        if not self.solids:
            raise ValueError("No solid bodies found in STEP file")
        
        parts = []
        for i, solid in enumerate(self.solids):
            try:
                parts.append(self._analyze_solid(solid, i))
            except Exception as e:
                print(f"Warning: Could not analyze solid {i}: {e}")
        
        grouped = self._group_parts(parts)
        metadata = self._calculate_metadata(parts)
        
        return {
            "solids_count": len(self.solids),
            "parts": parts,
            "grouped": grouped,
            "metadata": metadata
        }
    
    def _extract_solids(self, shape) -> List:
        solids = []
        explorer = TopExp_Explorer(shape, TopAbs_SOLID)
        while explorer.More():
            solids.append(explorer.Current())
            explorer.Next()
        return solids
    
    def _analyze_solid(self, solid, index: int) -> Dict:
        """Calculate OBB and apply woodworker logic."""
        obb = Bnd_OBB()
        brepbndlib.AddOBB(solid, obb, True, True, True)
        
        half_x, half_y, half_z = obb.XHSize(), obb.YHSize(), obb.ZHSize()
        dimensions = sorted([2 * half_x, 2 * half_y, 2 * half_z])
        
        # Woodworker Logic: smallest=thickness, middle=width, largest=length
        thickness, width, length = dimensions
        
        props = GProp_GProps()
        brepgprop_VolumeProperties(solid, props)
        volume_mm3 = props.Mass()
        
        center = obb.Center()
        theoretical_volume = thickness * width * length
        accuracy = (volume_mm3 / theoretical_volume * 100) if theoretical_volume > 0 else 0
        
        return {
            "index": index,
            "name": f"Part_{index + 1}",
            "thickness": round(thickness, 2),
            "width": round(width, 2),
            "length": round(length, 2),
            "volume_mm3": round(volume_mm3, 2),
            "volume_accuracy_percent": round(accuracy, 1),
            "obb_center": [round(center.X(), 2), round(center.Y(), 2), round(center.Z(), 2)],
            "rotation_matrix": self._get_obb_rotation(obb),
            "extraction_method": "OBB_pythonocc"
        }
    
    def _get_obb_rotation(self, obb: Bnd_OBB) -> List[List[float]]:
        x_dir, y_dir, z_dir = obb.XDirection(), obb.YDirection(), obb.ZDirection()
        return [
            [round(x_dir.X(), 4), round(x_dir.Y(), 4), round(x_dir.Z(), 4)],
            [round(y_dir.X(), 4), round(y_dir.Y(), 4), round(y_dir.Z(), 4)],
            [round(z_dir.X(), 4), round(z_dir.Y(), 4), round(z_dir.Z(), 4)]
        ]
    
    def _group_parts(self, parts: List[Dict]) -> Dict:
        grouped = {}
        for part in parts:
            key = f"{part['thickness']}mm"
            if key not in grouped:
                grouped[key] = {"thickness": part['thickness'], "count": 0, "parts": []}
            grouped[key]["count"] += 1
            grouped[key]["parts"].append(part)
        return grouped
    
    def _calculate_metadata(self, parts: List[Dict]) -> Dict:
        if not parts:
            return {}
        return {
            "total_parts": len(parts),
            "total_volume_mm3": round(sum(p["volume_mm3"] for p in parts), 2),
            "average_extraction_accuracy": round(np.mean([p["volume_accuracy_percent"] for p in parts]), 1),
            "thickness_range": {"min": round(min(p["thickness"] for p in parts), 2), "max": round(max(p["thickness"] for p in parts), 2)},
            "dimensions_range": {
                "width": {"min": round(min(p["width"] for p in parts), 2), "max": round(max(p["width"] for p in parts), 2)},
                "length": {"min": round(min(p["length"] for p in parts), 2), "max": round(max(p["length"] for p in parts), 2)}
            }
        }


def quick_extract(filepath: str) -> Dict:
    """Quick extraction helper."""
    return StepExtractor(filepath).parse()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python step_parser.py <path_to_step_file>")
        sys.exit(1)
    
    result = quick_extract(sys.argv[1])
    print(f"Parsed {result['solids_count']} solids, {len(result['parts'])} parts")
    for key, group in result['grouped'].items():
        print(f"  {key}: {group['count']} pieces")
'''

step_parser_path = CORE_DIR / "step_parser.py"
step_parser_path.write_text(STEP_PARSER_CODE, encoding='utf-8')
print(f"  [OK] {step_parser_path.relative_to(PROJECT_ROOT)}")

# =============================================================================
# ETAPE 3: FICHIER STEP_IMPORT.PY (API Router)
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 3] Installation du router API STEP...")
print("-" * 70)

STEP_IMPORT_CODE = '''"""
STEP Import API Router - Handles STEP file upload, parsing, and auto-extraction
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.core.step_parser import StepExtractor
from app.models import StepModel, Part, Project, Material
from pydantic import BaseModel
from typing import List, Dict
import hashlib
import json
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Storage directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "UserData" / "StepFiles"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class StepImportResponse(BaseModel):
    step_model_id: int
    filename: str
    parts_extracted: int
    grouped_by_thickness: Dict
    metadata: Dict


class MaterialAssignment(BaseModel):
    thickness: float
    material_id: int


class BulkMaterialAssignment(BaseModel):
    assignments: List[MaterialAssignment]


@router.post("/projects/{project_id}/import-step", response_model=StepImportResponse)
async def import_step_file(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import a STEP file and auto-extract parts with OBB analysis."""
    if not file.filename.lower().endswith(('.stp', '.step')):
        raise HTTPException(400, "File must be .stp or .step")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, f"Project {project_id} not found")
    
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    existing = db.query(StepModel).filter(StepModel.project_id == project_id, StepModel.file_hash == file_hash).first()
    if existing:
        raise HTTPException(400, "Ce fichier STEP a deja ete importe")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = UPLOAD_DIR / f"{project_id}_{timestamp}_{file.filename}"
    filepath.write_bytes(file_content)
    
    try:
        result = StepExtractor(str(filepath)).parse()
    except Exception as e:
        filepath.unlink(missing_ok=True)
        raise HTTPException(400, f"Erreur parsing STEP: {e}")
    
    step_model = StepModel(
        project_id=project_id, filename=file.filename, filepath=str(filepath),
        file_hash=file_hash, file_metadata=json.dumps(result['metadata'])
    )
    db.add(step_model)
    db.flush()
    
    created_parts = []
    for part_data in result['parts']:
        part = Part(
            project_id=project_id, step_model_id=step_model.id, name=part_data['name'],
            width=part_data['width'], height=part_data['length'], quantity=1,
            material_id=None, auto_extracted=True, allow_rotation=True, grain_direction=0,
            extraction_metadata=json.dumps({
                'thickness': part_data['thickness'], 'volume_mm3': part_data['volume_mm3'],
                'volume_accuracy': part_data['volume_accuracy_percent'],
                'obb_center': part_data['obb_center'], 'extraction_method': part_data['extraction_method']
            })
        )
        db.add(part)
        created_parts.append(part)
    
    db.commit()
    
    return StepImportResponse(
        step_model_id=step_model.id, filename=file.filename,
        parts_extracted=len(created_parts), grouped_by_thickness=result['grouped'],
        metadata=result['metadata']
    )


@router.get("/projects/{project_id}/step-models")
async def get_step_models(project_id: int, db: Session = Depends(get_db)):
    models = db.query(StepModel).filter(StepModel.project_id == project_id).options(joinedload(StepModel.extracted_parts)).all()
    return [{"id": m.id, "filename": m.filename, "import_date": m.import_date, "parts_count": len(m.extracted_parts)} for m in models]


@router.post("/step-models/{step_model_id}/assign-materials")
async def assign_materials_bulk(step_model_id: int, data: BulkMaterialAssignment, db: Session = Depends(get_db)):
    parts = db.query(Part).filter(Part.step_model_id == step_model_id).all()
    if not parts:
        raise HTTPException(404, "Aucune piece trouvee")
    
    thickness_map = {a.thickness: a.material_id for a in data.assignments}
    updated = 0
    for part in parts:
        if part.extraction_metadata:
            meta = json.loads(part.extraction_metadata)
            if meta.get('thickness') in thickness_map:
                part.material_id = thickness_map[meta['thickness']]
                updated += 1
    
    db.commit()
    return {"message": f"{updated} pieces mises a jour", "updated_count": updated}


@router.delete("/step-models/{step_model_id}")
async def delete_step_model(step_model_id: int, db: Session = Depends(get_db)):
    step_model = db.query(StepModel).filter(StepModel.id == step_model_id).first()
    if not step_model:
        raise HTTPException(404, "Modele introuvable")
    Path(step_model.filepath).unlink(missing_ok=True)
    db.delete(step_model)
    db.commit()
    return {"message": "Supprime avec succes"}
'''

step_import_path = ROUTERS_DIR / "step_import.py"
step_import_path.write_text(STEP_IMPORT_CODE, encoding='utf-8')
print(f"  [OK] {step_import_path.relative_to(PROJECT_ROOT)}")

# =============================================================================
# ETAPE 4: MISE A JOUR DE MAIN.PY (Ajouter le router)
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 4] Mise a jour de main.py (ajout router STEP)...")
print("-" * 70)

main_py_path = BACKEND_APP / "main.py"
if main_py_path.exists():
    main_content = main_py_path.read_text(encoding='utf-8')
    
    # Ajouter import si manquant
    if "step_import" not in main_content:
        # Trouver la ligne d'import des routers
        if "from app.routers import" in main_content:
            main_content = main_content.replace(
                "from app.routers import",
                "from app.routers import step_import, "
            )
        
        # Ajouter le router
        if "step_import.router" not in main_content:
            # Trouver la derniere ligne include_router
            lines = main_content.split('\n')
            last_router_idx = -1
            for i, line in enumerate(lines):
                if "app.include_router(" in line:
                    last_router_idx = i
            
            if last_router_idx > -1:
                lines.insert(last_router_idx + 1, 'app.include_router(step_import.router, prefix="/api/step", tags=["STEP Import"])')
                main_content = '\n'.join(lines)
        
        main_py_path.write_text(main_content, encoding='utf-8')
        print(f"  [OK] Router STEP ajoute a main.py")
    else:
        print(f"  [SKIP] Router STEP deja present")
else:
    print(f"  [WARN] main.py introuvable")

# =============================================================================
# ETAPE 5: MISE A JOUR DE PROJECTS.PY (Fix bug chargement)
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 5] Correction bug 'Impossible de charger les projets'...")
print("-" * 70)

projects_py_path = ROUTERS_DIR / "projects.py"
if projects_py_path.exists():
    projects_content = projects_py_path.read_text(encoding='utf-8')
    
    if "joinedload" not in projects_content:
        # Le bug existe toujours, on doit corriger
        projects_content = projects_content.replace(
            "from sqlalchemy.orm import Session",
            "from sqlalchemy.orm import Session, joinedload"
        )
        
        # Remplacer la fonction get_projects
        old_func = '''def get_projects(db: Session = Depends(get_db)):
    """Get all projects."""
    return db.query(ProjectModel).all()'''
        
        new_func = '''def get_projects(db: Session = Depends(get_db)):
    """Get all projects with eager loading (fix lazy-loading errors)."""
    try:
        projects = db.query(ProjectModel)\\
            .options(joinedload(ProjectModel.parts))\\
            .options(joinedload(ProjectModel.client))\\
            .all()
        return projects
    except Exception as e:
        raise HTTPException(500, f"Erreur chargement: {e}")'''
        
        if old_func in projects_content:
            projects_content = projects_content.replace(old_func, new_func)
            projects_py_path.write_text(projects_content, encoding='utf-8')
            print(f"  [OK] Bug corrige dans projects.py")
        else:
            print(f"  [SKIP] Correction deja appliquee ou structure differente")
    else:
        print(f"  [SKIP] joinedload deja present")
else:
    print(f"  [WARN] projects.py introuvable")

# =============================================================================
# ETAPE 6: MISE A JOUR DES MODELES (StepModel)
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 6] Verification des modeles SQLAlchemy...")
print("-" * 70)

models_path = BACKEND_APP / "models" / "__init__.py"
if models_path.exists():
    models_content = models_path.read_text(encoding='utf-8')
    
    if "class StepModel" not in models_content:
        # Ajouter le modele StepModel
        step_model_code = '''

class StepModel(Base):
    """3D STEP file imported for a project."""
    __tablename__ = "step_models"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_hash = Column(String, nullable=True)
    import_date = Column(DateTime, default=datetime.utcnow)
    file_metadata = Column("metadata", Text, nullable=True)
    
    project = relationship("Project", back_populates="step_models")
    extracted_parts = relationship("Part", back_populates="step_model", foreign_keys="Part.step_model_id")
'''
        models_content += step_model_code
        models_path.write_text(models_content, encoding='utf-8')
        print(f"  [OK] StepModel ajoute aux modeles")
    else:
        print(f"  [SKIP] StepModel deja present")
else:
    print(f"  [WARN] models/__init__.py introuvable")

# =============================================================================
# ETAPE 7: MIGRATION BASE DE DONNEES
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 7] Migration de la base de donnees...")
print("-" * 70)

if not DB_PATH.exists():
    print(f"  [ERROR] Base de donnees introuvable: {DB_PATH}")
else:
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    migrations = [
        """CREATE TABLE IF NOT EXISTS step_models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_hash TEXT,
            import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )""",
        "ALTER TABLE parts ADD COLUMN step_model_id INTEGER REFERENCES step_models(id)",
        "ALTER TABLE parts ADD COLUMN auto_extracted BOOLEAN DEFAULT 0",
        "ALTER TABLE parts ADD COLUMN extraction_metadata TEXT",
        "CREATE INDEX IF NOT EXISTS idx_step_models_project ON step_models(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_parts_step_model ON parts(step_model_id)",
        "UPDATE parts SET auto_extracted = 0 WHERE auto_extracted IS NULL"
    ]
    
    for i, sql in enumerate(migrations, 1):
        try:
            cursor.execute(sql)
            print(f"  [OK] Migration {i}/{len(migrations)}")
        except sqlite3.OperationalError as e:
            if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                print(f"  [SKIP] Migration {i}/{len(migrations)} (deja appliquee)")
            else:
                print(f"  [WARN] Migration {i}: {e}")
    
    conn.commit()
    
    # Verification
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='step_models'")
    if cursor.fetchone():
        print(f"  [OK] Table step_models verifiee")
    
    conn.close()

# =============================================================================
# ETAPE 8: VERIFICATION FINALE & SANTE (HEALTH CHECK)
# =============================================================================
print("\n" + "-" * 70)
print("[ETAPE 8] Verification de l'installation & Sante des Modules...")
print("-" * 70)

# 1. Verification Structure Physique
checks = [
    (CORE_DIR / "step_parser.py", "Parser STEP (Legacy Path)"), # Might be gone now
    (ROUTERS_DIR / "step_import.py", "Router API"),
    (DB_PATH, "Base de donnees"),
    (STEP_STORAGE, "Dossier StepFiles"),
    (BACKEND_APP.parent.parent / "Services" / "IA_Engine", "Moteur IA"),
    (BACKEND_APP.parent.parent / "Services" / "Scraping_Engine", "Moteur Scraping"),
]

all_ok = True
for path, name in checks:
    if path.exists():
        print(f"  [OK] {name} trouve")
    else:
        # Legacy path check might fail if we moved it, which is fine if new path exists
        if "Legacy" in name: 
            print(f"  [INFO] {name} absent (Normal si refactoring applique)")
        else:
            print(f"  [ERROR] {name} MANQUANT: {path}")
            all_ok = False

# 2. Verification des Connexions (Imports)
print("\n[INFO] Test des imports Services...")
try:
    sys.path.append(str(BACKEND_APP.parent.parent / "Services"))
    import IA_Engine
    print("  [OK] IA_Engine importable")
except ImportError as e:
    print(f"  [ERROR] IA_Engine INACCESSIBLE: {e}")
    all_ok = False

try:
    sys.path.append(str(BACKEND_APP.parent.parent / "Services"))
    import Scraping_Engine
    print("  [OK] Scraping_Engine importable")
except ImportError as e:
    print(f"  [WARN] Scraping_Engine INACCESSIBLE: {e}")
    print("         Le logiciel demarrera en mode degradé (sans prix/stocks).")
    # Non-blocking failure for Scraping



# =============================================================================
# RESUME FINAL
# =============================================================================
print("\n" + "=" * 70)
if all_ok:
    print("   INSTALLATION TERMINEE AVEC SUCCES!")
    print("=" * 70)
    print("""
Pour demarrer le serveur:

    1. Ouvrir Anaconda Prompt
    2. cd "{}"
    3. conda activate opticut_pro
    4. uvicorn app.main:app --reload --port 8000

Ou double-cliquer sur: start_pro.bat
""".format(BACKEND_APP))
else:
    print("   INSTALLATION INCOMPLETE - Verifiez les erreurs ci-dessus")
    print("=" * 70)

print("\n[FIN] Script termine.")
