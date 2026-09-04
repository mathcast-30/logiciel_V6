# -*- coding: utf-8 -*-
"""
backend_step_import_integration.py
=====================================

Patch d'intégration backend pour l'analyse géométrique avancée + récupération
des noms Fusion 360. Ce fichier n'est PAS destiné à être importé tel quel :
c'est un recueil de blocs à copier dans vos fichiers existants, chacun
clairement délimité et annoté avec sa destination.

Fichiers concernés :
  1. models/__init__.py          (colonnes Part)
  2. main.py                      (migration au démarrage)
  3. schemas/__init__.py          (schémas Pydantic)
  4. routers/step_import.py       (logique d'import + confirm)

NOTE : non exécuté/testé dans l'environnement de rédaction (pas d'accès à vos
fichiers réels ni à pythonocc-core ici). Relisez chaque bloc avant de le
coller, en particulier les noms de classes/fonctions qui doivent correspondre
exactement à ceux déjà présents dans votre code.
"""

# =============================================================================
# BLOC 1 — models/__init__.py
# =============================================================================
# Ajoutez ces colonnes à votre classe Part existante (à côté des colonnes
# width/height/thickness déjà présentes). Adapté au style SQLAlchemy 2.0
# (Mapped/mapped_column) mentionné dans le plan d'intégration précédent —
# si vous êtes encore en syntaxe SQLAlchemy 1.x classique (Column(...)),
# adaptez la syntaxe mais gardez les noms et types.

MODELS_PATCH = '''
# --- Dans class Part(Base): ---

    # Nom du composant tel que récupéré depuis Fusion 360 (ou généré si absent)
    component_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    names_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # "fusion_xcaf" ou "generic_fallback"

    # Analyse géométrique avancée
    thickness_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    thickness_method: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    shape_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contour_2d_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    machining_features_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extraction_warnings_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
'''

# =============================================================================
# BLOC 2 — main.py (migration dynamique au démarrage)
# =============================================================================
# Vous avez déjà (d'après le plan précédent) une fonction run_db_migrations()
# appelée au boot. Ajoutez-y cet appel, ou créez la fonction si elle n'existe
# pas encore et appelez-la juste après create_all().

MAIN_PY_PATCH = '''
import sqlite3


def ensure_part_geometry_columns(db_path: str):
    """Ajoute les nouvelles colonnes géométriques à la table 'parts' si elles
    n'existent pas déjà. Idempotent : sans effet si déjà exécuté."""
    columns_to_add = {
        "component_name": "TEXT",
        "names_source": "TEXT",
        "thickness_confidence": "REAL",
        "thickness_method": "TEXT",
        "shape_type": "TEXT",
        "contour_2d_json": "TEXT",
        "machining_features_json": "TEXT",
        "extraction_warnings_json": "TEXT",
    }

    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(parts)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                logger.info(f"Migration : ajout de la colonne parts.{column_name}")
                cursor.execute(
                    f"ALTER TABLE parts ADD COLUMN {column_name} {column_type}"
                )
        conn.commit()
    finally:
        conn.close()


# À appeler au démarrage, APRÈS create_all() et APRÈS avoir fait une
# sauvegarde de la base (voir rappel plus bas) :
#
#   ensure_part_geometry_columns(DATABASE_PATH)
#
# IMPORTANT : faites une copie de opticut.db avant le premier lancement
# après ce changement, comme pour opticut_backup_before_geom_analyzer.db
# précédemment. Cette migration est censée être sans danger (ALTER TABLE
# ADD COLUMN ne touche pas les données existantes) mais la prudence reste
# de mise vu votre historique d'incident de base vide.
'''

# =============================================================================
# BLOC 3 — schemas/__init__.py
# =============================================================================

SCHEMAS_PATCH = '''
from typing import List, Optional
from pydantic import BaseModel


class MachiningFeature(BaseModel):
    type: str  # "percage" | "rainure" | "mortaise_ou_poche"
    bbox_width: float
    bbox_height: float
    position_center: tuple[float, float]


class PartBase(BaseModel):
    # ... vos champs existants (name, width, height, quantity, etc.) ...

    component_name: Optional[str] = None
    names_source: Optional[str] = None
    thickness_confidence: Optional[float] = None
    thickness_method: Optional[str] = None
    shape_type: Optional[str] = None
    contour_2d: Optional[List[List[float]]] = None  # désérialisé depuis contour_2d_json
    machining_features: Optional[List[MachiningFeature]] = None
    extraction_warnings: Optional[List[str]] = None


class Part(PartBase):
    id: int
    auto_extracted: bool = False

    class Config:
        from_attributes = True


class ExtractedPartData(BaseModel):
    """Pièce détectée lors de l'import, avant confirmation par l'utilisateur."""
    temp_id: str  # identifiant temporaire côté import, avant création en DB
    component_name: str
    names_source: str  # "fusion_xcaf" | "generic_fallback"
    width: float
    height: float
    thickness: float
    thickness_confidence: Optional[float] = None
    thickness_method: str
    shape_type: str
    contour_2d: Optional[List[List[float]]] = None
    machining_features: List[MachiningFeature] = []
    warnings: List[str] = []


class StepImportResponse(BaseModel):
    solids_count: int
    pieces: List[ExtractedPartData]
    names_source: str  # source globale dominante, pour affichage rapide
    has_low_confidence_pieces: bool
    has_non_convex_pieces: bool
    global_warnings: List[str] = []
'''

# =============================================================================
# BLOC 4 — routers/step_import.py
# =============================================================================

ROUTER_PATCH = '''
import json
import logging

from step_name_extractor import extract_named_solids_safe
from piece_geometry_analyzer import PieceGeometryAnalyzer

logger = logging.getLogger("app.routers.step_import")
analyzer = PieceGeometryAnalyzer()

CONFIDENCE_LOW_THRESHOLD = 0.6


@router.post("/projects/{project_id}/import-step", response_model=StepImportResponse)
async def import_step_file(project_id: int, file: UploadFile, db: Session = Depends(get_db)):
    # ... votre code existant de sauvegarde du fichier uploadé sur disque ...
    filepath = save_uploaded_step_file(file, project_id)  # <- votre fonction existante

    try:
        extraction_result = extract_named_solids_safe(filepath)
    except ValueError as e:
        logger.warning(f"STEP parse error for project {project_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    global_warnings = []
    if extraction_result["warning"]:
        global_warnings.append(extraction_result["warning"])

    pieces: list[ExtractedPartData] = []
    for idx, item in enumerate(extraction_result["solids"]):
        analysis = analyzer.analyze_solid(item["solid"])

        pieces.append(ExtractedPartData(
            temp_id=f"temp_{idx}",
            component_name=item["name"],
            names_source=extraction_result["names_source"],
            width=analysis["length"],
            height=analysis["width"],
            thickness=analysis["thickness"],
            thickness_confidence=analysis["thickness_confidence"],
            thickness_method=analysis["thickness_method"],
            shape_type=analysis["shape_type"],
            contour_2d=analysis["contour_2d"],
            machining_features=analysis["machining_features"],
            warnings=analysis["warnings"],
        ))

    has_low_confidence = any(
        p.thickness_confidence is not None and p.thickness_confidence < CONFIDENCE_LOW_THRESHOLD
        for p in pieces
    )
    has_non_convex = any(p.shape_type == "forme_structurelle_non_convexe" for p in pieces)

    # Stocker temporairement les résultats d'extraction (en mémoire/cache ou
    # table temporaire) pour que /confirm puisse les retrouver par temp_id
    # sans redemander le fichier. Adaptez à votre mécanisme existant
    # (vous avez déjà un flux confirm_import pour l'assignation matériaux).
    store_pending_extraction(project_id, pieces)  # <- à adapter à votre code existant

    return StepImportResponse(
        solids_count=extraction_result and len(pieces),
        pieces=pieces,
        names_source=extraction_result["names_source"],
        has_low_confidence_pieces=has_low_confidence,
        has_non_convex_pieces=has_non_convex,
        global_warnings=global_warnings,
    )


@router.post("/step-models/{step_model_id}/confirm")
async def confirm_step_import(step_model_id: int, db: Session = Depends(get_db)):
    # ... récupération de vos pending pieces comme avant ...
    pending_pieces = get_pending_extraction(step_model_id)  # <- votre mécanisme existant

    for piece_data in pending_pieces:
        new_part = Part(
            project_id=...,  # comme avant
            name=piece_data.component_name,
            component_name=piece_data.component_name,
            names_source=piece_data.names_source,
            width=piece_data.width,
            height=piece_data.height,
            thickness=piece_data.thickness,
            thickness_confidence=piece_data.thickness_confidence,
            thickness_method=piece_data.thickness_method,
            shape_type=piece_data.shape_type,
            contour_2d_json=json.dumps(piece_data.contour_2d) if piece_data.contour_2d else None,
            machining_features_json=json.dumps(
                [f.dict() for f in piece_data.machining_features]
            ) if piece_data.machining_features else None,
            extraction_warnings_json=json.dumps(piece_data.warnings) if piece_data.warnings else None,
            auto_extracted=True,
        )
        db.add(new_part)

    db.commit()
    return {"status": "ok", "parts_created": len(pending_pieces)}
'''

if __name__ == "__main__":
    print("Ce fichier contient des patchs à copier manuellement, il n'est pas exécutable tel quel.")
    print("Blocs disponibles : MODELS_PATCH, MAIN_PY_PATCH, SCHEMAS_PATCH, ROUTER_PATCH")
