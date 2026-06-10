"""Management API router."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models import Project as ProjectModel, OptimizationResult, Stock as StockModel, Part as PartModel
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/overview")
def get_management_overview(db: Session = Depends(get_db)):
    try:
        # Projects active
        active_projects_count = db.query(ProjectModel).filter(ProjectModel.status.in_(["reflexion", "en_cours"])).count()
        
        # Projects by status
        status_counts = db.query(ProjectModel.status, func.count(ProjectModel.id)).group_by(ProjectModel.status).all()
        projects_by_status = {
            "reflexion": 0, "en_cours": 0, "fini": 0, "valide": 0
        }
        for status, count in status_counts:
            # Map existing status to new ones if necessary, but assume they match
            if status in projects_by_status:
                projects_by_status[status] = count
            else:
                projects_by_status[status] = count # fallback
                
        # K-metric avg
        # Simplification: get avg of k_metric where k_metric is not null
        k_metric_avg = db.query(func.avg(OptimizationResult.k_metric)).filter(OptimizationResult.k_metric.isnot(None)).scalar() or 0.0
        k_metric_trend = 0.0 # Mocked
        
        # Stock critical count
        # Simplification: assume quantity <= 5 is critical
        stock_critical_count = db.query(StockModel).filter(StockModel.quantity <= 5).count()
        
        # Next delivery
        next_project = db.query(ProjectModel).filter(
            ProjectModel.delivery_date.isnot(None),
            ProjectModel.status.in_(["en_cours"])
        ).order_by(ProjectModel.delivery_date.asc()).first()
        
        next_delivery = None
        if next_project and next_project.delivery_date:
            days_remaining = (next_project.delivery_date - datetime.utcnow()).days
            next_delivery = {
                "project_name": next_project.name,
                "delivery_date": next_project.delivery_date.isoformat(),
                "days_remaining": days_remaining
            }
            
        return {
            "projects_active": active_projects_count,
            "projects_by_status": projects_by_status,
            "k_metric_avg": float(k_metric_avg) * 100, # Assuming it's 0-1
            "k_metric_trend": k_metric_trend,
            "stock_critical_count": stock_critical_count,
            "next_delivery": next_delivery
        }
    except Exception as e:
        logger.error(f"Error in overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/planning")
def get_management_planning(db: Session = Depends(get_db)):
    projects = db.query(ProjectModel).all()
    results = []
    
    for p in projects:
        try:
            steps = json.loads(p.steps_json) if getattr(p, "steps_json", None) else []
        except:
            steps = []
            
        # Simplification: determine main material by counting parts. We'll just mock it or grab first.
        # Actually, let's just say 'Mixte' or empty if no parts
        main_material = "Bois/Panneaux"
        
        # Calculate progress based on steps (mock for now, or assume 0 if steps exist)
        progress = 0.0
        if steps:
            # Let's say if it's "fini", it's 1.0, "en_cours" maybe 0.5
            if p.status == "fini": progress = 1.0
            elif p.status == "valide": progress = 1.0
            elif p.status == "en_cours": progress = 0.5
            else: progress = 0.0
            
        results.append({
            "id": p.id,
            "name": p.name,
            "status": p.status or "reflexion",
            "start_date": p.start_date.isoformat() if getattr(p, "start_date", None) else None,
            "delivery_date": p.delivery_date.isoformat() if getattr(p, "delivery_date", None) else None,
            "steps": steps,
            "main_material": main_material,
            "progress": progress,
            "estimated_cost": getattr(p, "estimated_cost", 0.0),
            "actual_cost": getattr(p, "actual_cost", 0.0),
            "estimated_hours": getattr(p, "estimated_hours", 0.0),
            "actual_hours": getattr(p, "actual_hours", 0.0)
        })
    
    return {"projects": results}

@router.get("/analytics")
def get_management_analytics(db: Session = Depends(get_db)):
    # Mocks based on the user request, as real data requires complex aggregations
    return {
        "k_metric_weekly": [
            {"week": "S15", "value": 81},
            {"week": "S16", "value": 83},
            {"week": "S17", "value": 85},
            {"week": "S18", "value": 82},
            {"week": "S19", "value": 88},
            {"week": "S20", "value": 87},
            {"week": "S21", "value": 89},
            {"week": "S22", "value": 86}
        ],
        "budget_comparison": [
            {"category": "Matière", "estimated": 500, "actual": 480},
            {"category": "Main d'oeuvre", "estimated": 300, "actual": 450},
            {"category": "Fournitures", "estimated": 100, "actual": 110},
            {"category": "Sous-traitance", "estimated": 200, "actual": 200}
        ],
        "material_distribution": [
            {"material": "Chêne 18mm", "area_m2": 12.4, "percentage": 35},
            {"material": "MDF 19mm", "area_m2": 8.0, "percentage": 25},
            {"material": "Contreplaqué", "area_m2": 5.0, "percentage": 20},
            {"material": "Hêtre Massif", "area_m2": 3.5, "percentage": 20}
        ],
        "profitability": {
            "prevue": {"debourse_sec": 515, "frais_generaux": 51, "benefice": 160, "margin_pct": 41.07},
            "reelle": {"debourse_sec": 1125, "frais_generaux": 112, "benefice": 489, "margin_pct": 53.47}
        }
    }
