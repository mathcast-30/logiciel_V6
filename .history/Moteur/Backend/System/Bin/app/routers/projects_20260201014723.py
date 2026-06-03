"""Projects API router."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db.database import get_db
from app.models import Project as ProjectModel, Part as PartModel
from app.schemas import Project, ProjectCreate, Part, PartCreate
import logging

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
    try:
        projects = db.query(ProjectModel)\
            .options(joinedload(ProjectModel.parts))\
            .options(joinedload(ProjectModel.client))\
            .options(joinedload(ProjectModel.step_models))\
            .all()
        
        logger.info(f"Successfully loaded {len(projects)} projects")
        return projects
        
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

