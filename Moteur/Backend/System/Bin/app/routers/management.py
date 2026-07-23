"""Management API router."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models import Project as ProjectModel, OptimizationResult, Stock as StockModel, Part as PartModel, Material
from sqlalchemy import text
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def _get_source_cout(project_id: int, db: Session) -> str:
    """Retourne la source du coût matière pour un projet donné."""
    opt = db.query(OptimizationResult).filter(
        OptimizationResult.project_id == project_id
    ).order_by(OptimizationResult.id.desc()).first()
    if opt and opt.total_cost is not None and opt.total_cost > 0:
        return "optimization"
    parts = db.query(PartModel).filter(PartModel.project_id == project_id).count()
    if parts > 0:
        return "parts"
    return "none"

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
            "actual_hours": getattr(p, "actual_hours", 0.0),
            "marge_pct": getattr(p, "marge_pct", None),
            "prix_vente_manuel": getattr(p, "prix_vente_manuel", None),
            "source_cout_matieres": _get_source_cout(p.id, db),
        })

    
    return {"projects": results}

@router.get("/analytics")
def get_management_analytics(db: Session = Depends(get_db)):
    try:
        tarification = db.execute(text("SELECT taux_horaire, marge_defaut_pct, frais_generaux_pct FROM tarification_globale WHERE id = 1")).fetchone()
        taux_horaire = tarification[0] if tarification and tarification[0] is not None else 35.0
        frais_gen_pct = tarification[2] if tarification and tarification[2] is not None else 10.0
        
        projects = db.query(ProjectModel).all()
        
        total_mo_prevue = 0.0
        total_mo_reelle = 0.0
        total_mat_prevue = 0.0
        total_mat_reelle = 0.0
        
        total_benefice_prevu = 0.0
        total_benefice_reel = 0.0
        
        mat_dist = {}
        count_optimization = 0
        count_parts = 0
        count_none = 0
        
        for p in projects:
            mo_prevue = float(p.estimated_hours or 0.0) * taux_horaire
            mo_reelle = float(p.actual_hours or 0.0) * taux_horaire
            total_mo_prevue += mo_prevue
            total_mo_reelle += mo_reelle
            
            opt = db.query(OptimizationResult).filter(OptimizationResult.project_id == p.id).order_by(OptimizationResult.id.desc()).first()
            mat_cost_for_project = 0.0
            
            if opt and opt.total_cost is not None and opt.total_cost > 0:
                mat_cost_for_project = opt.total_cost
                count_optimization += 1
                # For mat_dist, still rely on parts surface
                parts = db.query(PartModel).filter(PartModel.project_id == p.id).all()
                for part in parts:
                    if part.material_id:
                        material = db.query(Material).filter(Material.id == part.material_id).first()
                        if material:
                            area_m2 = (part.width * part.height * part.quantity) / 1_000_000
                            if material.name not in mat_dist:
                                mat_dist[material.name] = 0.0
                            mat_dist[material.name] += area_m2
            else:
                parts = db.query(PartModel).filter(PartModel.project_id == p.id).all()
                if len(parts) > 0:
                    count_parts += 1
                else:
                    count_none += 1
                for part in parts:
                    if part.material_id:
                        material = db.query(Material).filter(Material.id == part.material_id).first()
                        if material:
                            area_m2 = (part.width * part.height * part.quantity) / 1_000_000
                            cost = area_m2 * (material.cost_per_sqm or 0.0)
                            mat_cost_for_project += cost
                            
                            if material.name not in mat_dist:
                                mat_dist[material.name] = 0.0
                            mat_dist[material.name] += area_m2
                            
            total_mat_prevue += mat_cost_for_project
            total_mat_reelle += mat_cost_for_project 
            
            ds_prevu = mo_prevue + mat_cost_for_project
            ds_reel = mo_reelle + mat_cost_for_project
            
            fg_prevu = ds_prevu * (frais_gen_pct / 100.0)
            fg_reel = ds_reel * (frais_gen_pct / 100.0)
            
            cout_de_revient_prevu = ds_prevu + fg_prevu
            cout_de_revient_reel = ds_reel + fg_reel
            
            if p.prix_vente_manuel and p.prix_vente_manuel > 0:
                prix_vente = p.prix_vente_manuel
            else:
                marge = p.marge_pct if p.marge_pct is not None else (tarification[1] if tarification and tarification[1] is not None else 30.0)
                prix_vente = cout_de_revient_prevu / (1 - (marge / 100.0)) if marge < 100 else cout_de_revient_prevu
                
            benefice_prevu = prix_vente - cout_de_revient_prevu
            benefice_reel = prix_vente - cout_de_revient_reel
            
            total_benefice_prevu += benefice_prevu
            total_benefice_reel += benefice_reel
            
        total_ds_prevu = total_mo_prevue + total_mat_prevue
        total_ds_reel = total_mo_reelle + total_mat_reelle
        
        total_fg_prevu = total_ds_prevu * (frais_gen_pct / 100.0)
        total_fg_reel = total_ds_reel * (frais_gen_pct / 100.0)
        
        total_cr_prevu = total_ds_prevu + total_fg_prevu
        total_cr_reel = total_ds_reel + total_fg_reel
        
        total_area = sum(mat_dist.values())
        material_distribution = []
        for name, area in mat_dist.items():
            pct = (area / total_area * 100) if total_area > 0 else 0
            material_distribution.append({
                "material": name,
                "area_m2": round(area, 2),
                "percentage": round(pct, 1)
            })
        
        material_distribution.sort(key=lambda x: x["area_m2"], reverse=True)
        
        margin_pct_prevue = (total_benefice_prevu / (total_cr_prevu + total_benefice_prevu) * 100) if (total_cr_prevu + total_benefice_prevu) > 0 else 0
        margin_pct_reelle = (total_benefice_reel / (total_cr_reel + total_benefice_reel) * 100) if (total_cr_reel + total_benefice_reel) > 0 else 0
        
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
                {"category": "Matière", "estimated": round(total_mat_prevue, 2), "actual": round(total_mat_reelle, 2)},
                {"category": "Main d'oeuvre", "estimated": round(total_mo_prevue, 2), "actual": round(total_mo_reelle, 2)},
                {"category": "Fournitures", "estimated": 0, "actual": 0},
                {"category": "Sous-traitance", "estimated": 0, "actual": 0}
            ],
            "material_distribution": material_distribution,
            "profitability": {
                "prevue": {
                    "debourse_sec": round(total_ds_prevu, 2), 
                    "frais_generaux": round(total_fg_prevu, 2), 
                    "benefice": round(total_benefice_prevu, 2), 
                    "margin_pct": round(margin_pct_prevue, 2)
                },
                "reelle": {
                    "debourse_sec": round(total_ds_reel, 2), 
                    "frais_generaux": round(total_fg_reel, 2), 
                    "benefice": round(total_benefice_reel, 2), 
                    "margin_pct": round(margin_pct_reelle, 2)
                }
            },
            "analytics_quality": (
                "real" if count_parts == 0 and count_none == 0
                else "estimative" if count_optimization == 0
                else "partial"
            )
        }
    except Exception as e:
        logger.error(f"Error in analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
