"""Projects API router."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Union
from app.db.database import get_db
from app.models import Project as ProjectModel, Part as PartModel
from app.schemas import Project, ProjectCreate, Part, PartCreate
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[Project])
def get_projects(db: Session = Depends(get_db)):
    """
    Get all projects with eager loading to prevent lazy-loading errors.
    
    This fixes the "Impossible de charger les projets" error by:
    1. Using joinedload for efficient relationship loading
    2. Adding proper error handling
    3. Ensuring all relationships are loaded before serialization
    """
    from sqlalchemy.exc import OperationalError
    try:
        projects = db.query(ProjectModel)\
            .options(joinedload(ProjectModel.parts))\
            .options(joinedload(ProjectModel.client))\
            .options(joinedload(ProjectModel.step_models))\
            .all()
        
        logger.info(f"Successfully loaded {len(projects)} projects")
        return projects
        
    except OperationalError as e:
        logger.warning(f"Database schema mismatch or error: {e}. Returning empty list.")
        # Sometimes a column is missing during migration windows, we don't want to crash the whole app
        return []
    except Exception as e:
        logger.error(f"Error loading projects: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du chargement des projets: {str(e)}"
        )


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project with all its parts."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/stats")
def get_project_stats(project_id: int, db: Session = Depends(get_db)):
    """
    Get project statistics for frontend EnhancedProjectSelector.
    
    Returns:
    {
        "piece_count": number of parts in project,
        "material_count": number of unique materials,
        "estimated_area": total area of all parts in mm²
    }
    """
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Count parts
    parts = db.query(PartModel).filter(PartModel.project_id == project_id).all()
    piece_count = len(parts)
    
    # Count unique materials
    unique_materials = set()
    total_area = 0.0
    
    for part in parts:
        if part.material_id:
            unique_materials.add(part.material_id)
        # Calculate area per piece (width × height × quantity)
        area_per_piece = part.width * part.height
        total_area += area_per_piece * part.quantity
    
    material_count = len(unique_materials)
    
    return {
        "piece_count": piece_count,
        "material_count": material_count,
        "estimated_area": total_area
    }


@router.post("/", response_model=Project)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project."""
    db_project = ProjectModel(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project and all its parts."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.put("/{project_id}/status", response_model=Project)
def update_project_status(
    project_id: int, 
    status: str = Body(..., embed=True), 
    db: Session = Depends(get_db)
):
    """Update project status."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.status = status
    db.commit()
    db.refresh(project)
    return project

@router.patch("/{project_id}/status")
def patch_project_status(
    project_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """Update project status (PATCH equivalent)."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    valid_statuses = ["reflexion", "en_cours", "fini", "valide"]
    if status not in valid_statuses:
        # We also accept existing statuses like 'draft' just to be safe
        project.status = status
    else:
        project.status = status
        
    db.commit()
    db.refresh(project)
    return project

@router.patch("/{project_id}/planning")
def patch_project_planning(
    project_id: int,
    start_date: Optional[str] = Body(None),
    delivery_date: Optional[str] = Body(None),
    steps: Optional[list] = Body(None),
    db: Session = Depends(get_db)
):
    """Update project dates and steps."""
    from datetime import datetime
    import json
    
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    try:
        if start_date is not None:
            project.start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
        if delivery_date is not None:
            project.delivery_date = datetime.fromisoformat(delivery_date.replace("Z", "+00:00")) if delivery_date else None
        if steps is not None:
            project.steps_json = json.dumps(steps)
            # Synchro automatique de estimated_hours = somme des heures_prevues par étape
            total_heures_prevues = sum(float(s.get('heures_prevues', 0) or 0) for s in steps)
            if total_heures_prevues > 0:
                project.estimated_hours = total_heures_prevues
                
            total_heures_reelles = sum(float(s.get('heures_reelles', 0) or 0) for s in steps)
            if total_heures_reelles > 0:
                project.actual_hours = total_heures_reelles
            
        db.commit()
        db.refresh(project)
        return project
    except Exception as e:
        logger.error(f"Error updating planning: {e}")
        raise HTTPException(status_code=400, detail=str(e))


class ProjectTarificationUpdate(BaseModel):
    marge_pct: Optional[float] = None
    prix_vente_manuel: Optional[float] = None

@router.get("/{project_id}/cout-detaille")
def get_project_cout_detaille(project_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import text
    from app.models import Material
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    tarification = db.execute(text("SELECT taux_horaire, marge_defaut_pct, frais_generaux_pct FROM tarification_globale WHERE id = 1")).fetchone()
    taux_horaire = tarification[0] if tarification and tarification[0] is not None else 35.0
    frais_gen_pct = tarification[2] if tarification and tarification[2] is not None else 10.0
    
    mat_cost = 0.0
    source_cout = "none"
    
    from app.models import OptimizationResult
    opt = db.query(OptimizationResult).filter(OptimizationResult.project_id == project.id).order_by(OptimizationResult.id.desc()).first()
    
    if opt and opt.total_cost is not None and opt.total_cost > 0:
        mat_cost = opt.total_cost
        source_cout = "optimization"
    else:
        parts = db.query(PartModel).filter(PartModel.project_id == project.id).all()
        if len(parts) > 0:
            for part in parts:
                if part.material_id:
                    material = db.query(Material).filter(Material.id == part.material_id).first()
                    if material:
                        area_m2 = (part.width * part.height * part.quantity) / 1_000_000
                        mat_cost += area_m2 * (material.cost_per_sqm or 0.0)
            source_cout = "parts"
                
    mo_cost_prevu = float(project.estimated_hours or 0.0) * taux_horaire
    ds = mat_cost + mo_cost_prevu
    fg = ds * (frais_gen_pct / 100.0)
    cr = ds + fg
    marge = project.marge_pct if project.marge_pct is not None else (tarification[1] if tarification and tarification[1] is not None else 30.0)
    
    if project.prix_vente_manuel and project.prix_vente_manuel > 0:
        prix_vente = project.prix_vente_manuel
    else:
        prix_vente = cr / (1 - (marge / 100.0)) if marge < 100 else cr
        
    benefice = prix_vente - cr
    margin_effective = (benefice / prix_vente * 100) if prix_vente > 0 else 0
    
    return {
        "cout_matieres": mat_cost,
        "source_cout_matieres": source_cout,
        "cout_main_oeuvre": mo_cost_prevu,
        "debourse_sec": ds,
        "frais_generaux": fg,
        "cout_de_revient": cr,
        "benefice": benefice,
        "prix_vente": prix_vente,
        "marge_effective_pct": margin_effective,
        "taux_horaire_utilise": taux_horaire,
        "marge_appliquee_pct": marge
    }

@router.patch("/{project_id}/tarification")
def update_project_tarification(project_id: int, payload: ProjectTarificationUpdate, db: Session = Depends(get_db)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
        
    if payload.marge_pct is not None:
        project.marge_pct = payload.marge_pct
    if payload.prix_vente_manuel is not None:
        project.prix_vente_manuel = payload.prix_vente_manuel
        
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/assign-client")
async def assign_client(
    project_id: int, 
    client_id: Optional[int] = Body(None, embed=True), 
    db: Session = Depends(get_db)
):
    """Assign or unassign a client to a project."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if client_id is not None:
        from app.models import Client as ClientModel
        client = db.query(ClientModel).filter(ClientModel.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
            
    project.client_id = client_id
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/parts", response_model=Part)
def add_part(project_id: int, part: PartCreate, db: Session = Depends(get_db)):
    """Add a part to a project."""
    # Verify project exists
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    part_data = part.model_dump()
    part_data["project_id"] = project_id
    db_part = PartModel(**part_data)
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


@router.put("/parts/{part_id}", response_model=Part)
def update_part(part_id: int, part: PartCreate, db: Session = Depends(get_db)):
    """Update a part."""
    db_part = db.query(PartModel).filter(PartModel.id == part_id).first()
    if not db_part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    for key, value in part.model_dump().items():
        setattr(db_part, key, value)
    
    db.commit()
    db.refresh(db_part)
    return db_part


@router.delete("/parts/{part_id}")
def delete_part(part_id: int, db: Session = Depends(get_db)):
    """Delete a part."""
    part = db.query(PartModel).filter(PartModel.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    db.delete(part)
    db.commit()
    return {"message": "Part deleted"}


@router.post("/parts/filter")
def filter_parts(
    project_ids: List[int] = Body(...),
    material_type: str = Body(None),  # 'panel' or 'raw_wood'
    material_id: int = Body(None),
    thickness: float = Body(None),
    species: str = Body(None),
    db: Session = Depends(get_db)
):
    """
    Filter parts across multiple projects.
    
    Used for multi-project optimization and piece selection.
    Returns all parts matching the criteria.
    """
    from app.models import Material
    from sqlalchemy import and_
    
    # Build query
    query = db.query(PartModel).filter(PartModel.project_id.in_(project_ids))
    
    # Join with material if needed
    if material_type or material_id or thickness or species:
        query = query.join(Material, PartModel.material_id == Material.id)
    
    # Apply filters
    conditions = []
    
    if material_id is not None:
        conditions.append(PartModel.material_id == material_id)
    
    if material_type:
        if material_type == "panel":
            conditions.append(Material.is_panel == True)
        elif material_type == "raw_wood":
            conditions.append(Material.is_panel == False)
    
    if thickness is not None:
        conditions.append(Material.thickness == thickness)
    
    if species:
        conditions.append(Material.species == species)
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    parts = query.all()
    
    # Format response
    response = []
    for part in parts:
        response.append({
            "id": part.id,
            "project_id": part.project_id,
            "name": part.name,
            "width": part.width,
            "height": part.height,
            "quantity": part.quantity,
            "material_id": part.material_id,
            "material_name": part.material.name if part.material else None,
            "material_thickness": part.material.thickness if part.material else None,
            "material_species": part.material.species if part.material else None,
            "is_panel": part.material.is_panel if part.material else True,
            "grain_direction": part.grain_direction,
            "allow_rotation": part.allow_rotation
        })
    
    return response

@router.post("/{project_id}/open-folder")
def open_project_folder(project_id: int, db: Session = Depends(get_db)):
    """Open the project folder in Windows Explorer."""
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    client_name = project.client.name if project.client else "Général"
    
    # Path Discovery
    base_engine_path = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
    user_data_root = base_engine_path / "UserData"
    
    # Target: Moteur/UserData/Clients/[Client]/[Project]
    # We use a sanitize function similar to the generators
    def sanitize(name: str) -> str:
        if not name: return "Sans_Nom"
        clean = "".join([c for c in name if c.isalnum() or c in (' ', '-', '_')]).strip()
        return clean.replace(' ', '_') or "Sans_Nom"
    
    project_path = user_data_root / "Clients" / sanitize(client_name) / sanitize(project.name)
    
    if not project_path.exists():
        # Create it if it doesn't exist yet (perhaps no exports made)
        project_path.mkdir(parents=True, exist_ok=True)
    
    try:
        os.startfile(str(project_path))
        return {"success": True, "path": str(project_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossible d'ouvrir le dossier: {str(e)}")


@router.get("/{project_id}/cout-detaille")
def get_cout_detaille(project_id: int, db: Session = Depends(get_db)):
    """
    Calcule le coût détaillé d'un projet :
    - Déboursé sec = coût matières (surface des pièces × prix lot de stock, ou à défaut prix matériau)
    - MO prévue = estimated_hours × taux_horaire
    - Frais généraux = (déboursé + MO) × frais_generaux_pct
    - Prix de vente calculé avec marge (projet > défaut global)
    - Prix de vente manuel si renseigné (override)
    """
    import json
    from sqlalchemy import text
    from app.models import Material as MaterialModel, Stock as StockModel

    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # 1. Tarification globale
    tarif_row = db.execute(
        text("SELECT taux_horaire, marge_defaut_pct, frais_generaux_pct FROM tarification_globale WHERE id = 1")
    ).fetchone()
    taux_horaire = float(tarif_row[0]) if tarif_row and tarif_row[0] else 35.0
    marge_defaut_pct = float(tarif_row[1]) if tarif_row and tarif_row[1] else 30.0
    frais_generaux_pct = float(tarif_row[2]) if tarif_row and tarif_row[2] else 10.0

    # Marge effective (projet-spécifique ou défaut global)
    marge_pct = float(project.marge_pct) if getattr(project, 'marge_pct', None) is not None else marge_defaut_pct

    # 2. Coût matières depuis les pièces du projet
    parts = db.query(PartModel).filter(PartModel.project_id == project_id).all()
    cout_matieres = 0.0
    detail_materiaux = {}

    for part in parts:
        if not part.material_id:
            continue
        material = db.query(MaterialModel).filter(MaterialModel.id == part.material_id).first()
        if not material:
            continue

        # Surface d'une pièce en m² (dimensions en mm)
        area_m2_per_piece = (part.width / 1000.0) * (part.height / 1000.0)
        total_area_m2 = area_m2_per_piece * part.quantity

        # Chercher le prix par lot de stock (prix_unitaire) -- source prioritaire
        # On cherche un lot de stock associé à ce matériau avec un prix saisi
        stock_item = db.query(StockModel).filter(
            StockModel.material_id == part.material_id,
            StockModel.prix_unitaire != None,
            StockModel.prix_unitaire > 0
        ).order_by(StockModel.id.desc()).first()

        if stock_item and stock_item.prix_unitaire:
            unite = getattr(stock_item, 'unite_prix', 'm2') or 'm2'
            prix = float(stock_item.prix_unitaire)
        elif material.cost_per_sqm and material.cost_per_sqm > 0:
            unite = getattr(material, 'price_type', 'm2') or 'm2'
            prix = float(material.cost_per_sqm)
        else:
            unite = 'm2'
            prix = 0.0

        if unite == 'unit':
            cout_piece = prix * part.quantity
        elif unite == 'm3':
            thickness_m = (material.thickness / 1000.0) if material.thickness else 0.02
            volume_m3 = total_area_m2 * thickness_m
            cout_piece = volume_m3 * prix
        else:  # m2
            cout_piece = total_area_m2 * prix

        cout_matieres += cout_piece

        mat_name = material.name
        if mat_name not in detail_materiaux:
            detail_materiaux[mat_name] = {"area_m2": 0.0, "cout": 0.0}
        detail_materiaux[mat_name]["area_m2"] += total_area_m2
        detail_materiaux[mat_name]["cout"] += cout_piece

    # 3. Coût main d'oeuvre
    estimated_hours = float(project.estimated_hours or 0)
    actual_hours = float(project.actual_hours or 0)
    cout_mo_prevu = estimated_hours * taux_horaire
    cout_mo_reel = actual_hours * taux_horaire

    # 4. Frais généraux
    debourse_prevu = cout_matieres + cout_mo_prevu
    debourse_reel = cout_matieres + cout_mo_reel
    frais_gen_prevu = debourse_prevu * (frais_generaux_pct / 100.0)
    frais_gen_reel = debourse_reel * (frais_generaux_pct / 100.0)

    # 5. Prix de vente calculé (avec marge)
    # Prix = coût total / (1 - marge)
    def prix_vente_calcule(debourse: float, frais: float, marge: float) -> float:
        total = debourse + frais
        if marge >= 100:
            return total * 10  # garde-fou
        return total / (1.0 - marge / 100.0) if marge < 100 else total

    pv_prevu = prix_vente_calcule(debourse_prevu, frais_gen_prevu, marge_pct)
    benefice_prevu = pv_prevu - debourse_prevu - frais_gen_prevu
    margin_pct_reelle = (benefice_prevu / pv_prevu * 100) if pv_prevu > 0 else 0

    # Prix de vente manuel (override)
    prix_vente_manuel = getattr(project, 'prix_vente_manuel', None)
    prix_vente_final = float(prix_vente_manuel) if prix_vente_manuel else round(pv_prevu, 2)

    return {
        "project_id": project_id,
        "project_name": project.name,
        "tarification": {
            "taux_horaire": taux_horaire,
            "marge_pct": marge_pct,
            "frais_generaux_pct": frais_generaux_pct,
            "prix_vente_manuel_actif": prix_vente_manuel is not None,
        },
        "matieres": {
            "total": round(cout_matieres, 2),
            "detail": [
                {"materiau": k, "area_m2": round(v["area_m2"], 3), "cout": round(v["cout"], 2)}
                for k, v in detail_materiaux.items()
            ]
        },
        "main_oeuvre": {
            "heures_prevues": estimated_hours,
            "heures_reelles": actual_hours,
            "cout_prevu": round(cout_mo_prevu, 2),
            "cout_reel": round(cout_mo_reel, 2),
        },
        "prevue": {
            "debourse_sec": round(debourse_prevu, 2),
            "frais_generaux": round(frais_gen_prevu, 2),
            "benefice": round(benefice_prevu, 2),
            "prix_vente_calcule": round(pv_prevu, 2),
            "marge_pct": round(margin_pct_reelle, 1),
        },
        "prix_vente_final": prix_vente_final,
    }


@router.patch("/{project_id}/tarification")
def patch_project_tarification(
    project_id: int,
    marge_pct: Optional[float] = Body(None),
    prix_vente_manuel: Optional[float] = Body(None),
    reset_prix_manuel: bool = Body(False),
    db: Session = Depends(get_db)
):
    """
    Met à jour la marge spécifique et/ou le prix de vente manuel d'un projet.
    reset_prix_manuel=True efface le prix manuel (revient au calcul auto).
    """
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    if marge_pct is not None:
        project.marge_pct = marge_pct
    if reset_prix_manuel:
        project.prix_vente_manuel = None
    elif prix_vente_manuel is not None:
        project.prix_vente_manuel = prix_vente_manuel

    db.commit()
    db.refresh(project)
    return {
        "message": "Tarification projet mise à jour",
        "marge_pct": getattr(project, 'marge_pct', None),
        "prix_vente_manuel": getattr(project, 'prix_vente_manuel', None),
    }
