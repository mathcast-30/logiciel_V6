from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import Template
from app.schemas import Template as TemplateSchema, TemplateCreate, TemplateResolveRequest
from IA_Engine.templates import TemplateSolver, DEFAULT_TEMPLATES

router = APIRouter()

@router.on_event("startup")
def seed_templates():
    """Seed base templates if none exist."""
    db = next(get_db())
    if db.query(Template).count() == 0:
        for t_data in DEFAULT_TEMPLATES:
            db_t = Template(**t_data)
            db.add(db_t)
        db.commit()

@router.get("", response_model=List[TemplateSchema])
def list_templates(db: Session = Depends(get_db)):
    """List all available templates."""
    return db.query(Template).all()

@router.post("", response_model=TemplateSchema)
def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    """Create a new parametric template."""
    db_template = Template(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/{template_id}", response_model=TemplateSchema)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get a specific template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.post("/{template_id}/resolve")
def resolve_template(template_id: int, request: TemplateResolveRequest, db: Session = Depends(get_db)):
    """Calculate part dimensions for a template with given parameters."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    parts = TemplateSolver.solve(template.definition, request.parameters)
    return parts

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Delete a template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
