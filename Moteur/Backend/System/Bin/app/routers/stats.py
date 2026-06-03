from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models import Project, Material, Stock, Quote, Client

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total Stock Value
    # Calculate value of each stock item: quantity * (width * height / 1000000) * material.cost_per_sqm
    # Note: This assumes cost is per m2. If cost is per sheet, logic changes.
    # For now, we assume cost_per_sqm is populated.
    
    stock_value = 0
    stocks = db.query(Stock).all()
    for item in stocks:
        if item.material and item.material.cost_per_sqm:
            area_m2 = (item.width * item.height) / 1_000_000
            stock_value += area_m2 * item.quantity * item.material.cost_per_sqm

    # 2. Key Counts
    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.status != "done").count()
    total_quotes = db.query(Quote).count()
    pending_quotes = db.query(Quote).filter(Quote.status == "sent").count()

    # 3. Project Status Distribution
    status_counts = db.query(
        Project.status, func.count(Project.id)
    ).group_by(Project.status).all()
    
    projects_by_status = [
        {"name": status, "value": count} 
        for status, count in status_counts
    ]

    # 4. Low Stock Items (Arbitrary threshold < 2 full sheets equivalent? Or just quantity < 5)
    low_stock = db.query(Stock).filter(Stock.quantity < 3).limit(5).all()
    low_stock_data = [
        {
            "id": s.id,
            "material": s.material.name if s.material else "Unknown",
            "dimensions": f"{s.width}x{s.height}",
            "quantity": s.quantity
        }
        for s in low_stock
    ]

    # 5. Recent Activity (Latest 5 projects)
    recent_projects = db.query(Project).order_by(Project.created_at.desc()).limit(5).all()
    recent_activity = [
        {
            "type": "project",
            "id": p.id,
            "name": p.name,
            "date": p.created_at,
            "status": p.status
        }
        for p in recent_projects
    ]

    # 6. Total Clients
    total_clients = db.query(Client).count()

    # 7. Financial Summary (Accepted Quotes)
    accepted_quotes = db.query(Quote).filter(Quote.status == "accepted").all()
    total_revenue = sum(q.total_ttc for q in accepted_quotes)

    # 8. Stock by Material
    stock_by_material_map = {}
    for item in stocks:
        if item.material:
            area_m2 = (item.width * item.height) / 1_000_000
            value = area_m2 * item.quantity * (item.material.cost_per_sqm or 0)
            stock_by_material_map[item.material.name] = stock_by_material_map.get(item.material.name, 0) + value
    
    stock_by_material = [
        {"name": name, "value": round(val, 2)}
        for name, val in stock_by_material_map.items()
    ]

    return {
        "stock_value": round(stock_value, 2),
        "total_projects": total_projects,
        "active_projects": active_projects,
        "pending_quotes": pending_quotes,
        "projects_by_status": projects_by_status,
        "low_stock": low_stock_data,
        "recent_activity": recent_activity,
        "total_clients": total_clients,
        "total_revenue": round(total_revenue, 2),
        "stock_by_material": stock_by_material
    }

@router.get("/revenue-history")
def get_revenue_history(db: Session = Depends(get_db)):
    """
    Get revenue history for the last 12 months.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import extract
    
    today = datetime.now()
    history = []
    
    # Generate last 12 months placeholders
    for i in range(11, -1, -1):
        date_month = today - timedelta(days=i*30) # Approx
        month_str = date_month.strftime("%Y-%m")
        
        # Query quotes accepted in this month
        revenue = db.query(func.sum(Quote.total_ttc)).filter(
            Quote.status == "accepted",
            extract('year', Quote.date) == date_month.year,
            extract('month', Quote.date) == date_month.month
        ).scalar() or 0
        
        history.append({
            "date": month_str,
            "revenue": round(revenue, 2),
            "costs": round(revenue * 0.4, 2) # Mock costs at 40% for now if no rigid link
        })
        
    return history

@router.get("/financial-summary")
def get_financial_summary(db: Session = Depends(get_db)):
    """
    Calculate margins and costs.
    """
    accepted_quotes = db.query(Quote).filter(Quote.status == "accepted").all()
    
    total_revenue = sum(q.total_ttc for q in accepted_quotes)
    total_cogs = 0
    
    for quote in accepted_quotes:
        if quote.project:
            # Try to get optimization cost first
            opt_res = db.query(Stock).filter(Stock.id == -1).first() # Dummy check
            # Better: Sum parts cost
            parts_cost = 0
            for part in quote.project.parts:
                area_m2 = (part.width * part.height) / 1_000_000
                cost = area_m2 * (part.material.cost_per_sqm or 0)
                parts_cost += cost
            
            # Add estimated waste (20%)
            total_cogs += parts_cost * 1.2
            
    margin = total_revenue - total_cogs
    margin_percent = (margin / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "total_revenue": round(total_revenue, 2),
        "total_cogs": round(total_cogs, 2),
        "margin": round(margin, 2),
        "margin_percent": round(margin_percent, 1)
    }

@router.get("/production")
def get_production_stats(db: Session = Depends(get_db)):
    """
    Indicateurs de performance de production.
    """
    from app.models import OptimizationResult
    
    # 1. Taux de perte moyen sur les optimisations validées
    validated_opts = db.query(OptimizationResult).filter(OptimizationResult.is_validated == True).all()
    avg_waste = sum(opt.waste_percentage for opt in validated_opts) / len(validated_opts) if validated_opts else 0
    
    # 2. Total de panneaux utilisés (validés)
    total_panels = sum(opt.total_panels_used for opt in validated_opts) if validated_opts else 0
    
    # 3. Répartition par type de panneau
    # (Exigence: nécessite d'extraire les données du JSON result_data, simplifié ici pour l'exemple)
    
    return {
        "avg_waste_percent": round(avg_waste, 1),
        "total_panels_cut": total_panels,
        "optimizations_count": len(validated_opts),
        "waste_history": [
            {"date": opt.created_at.strftime("%Y-%m-%d"), "waste": opt.waste_percentage}
            for opt in validated_opts[-10:] # 10 dernières
        ] if validated_opts else []
    }

@router.get("/inventory-detailed")
def get_inventory_detailed(db: Session = Depends(get_db)):
    """
    Détails du stock pour l'onglet d'inventaire.
    """
    stocks = db.query(Stock).all()
    
    # Valeur par matière
    material_values = {}
    for s in stocks:
        if s.material:
            area = (s.width * s.height) / 1_000_000
            val = area * s.quantity * (s.material.cost_per_sqm or 0)
            material_values[s.material.name] = material_values.get(s.material.name, 0) + val
            
    return {
        "material_distribution": [
            {"name": k, "value": round(v, 2)} for k, v in material_values.items()
        ],
        "total_items": len(stocks),
        "offcuts_count": db.query(Stock).filter(Stock.is_offcut == True).count()
    }
    
@router.get("/report/pdf")
def generate_pdf_report(db: Session = Depends(get_db)):
    """
    Generate a global PDF report.
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Title
    p.setFont("Helvetica-Bold", 24)
    p.drawString(50, height - 50, "Rapport Financier - OptiCut Pro")
    
    p.setFont("Helvetica", 12)
    p.drawString(50, height - 80, f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    
    # Financial Summary
    summary = get_financial_summary(db)
    y = height - 120
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, y, "Résumé Financier")
    y -= 30
    
    p.setFont("Helvetica", 12)
    p.drawString(70, y, f"Chiffre d'Affaires Total: {summary['total_revenue']} €")
    y -= 20
    p.drawString(70, y, f"Coût Estimé (Matière): {summary['total_cogs']} €")
    y -= 20
    p.setFillColor(colors.green if summary['margin_percent'] > 30 else colors.orange)
    p.drawString(70, y, f"Marge Nette: {summary['margin']} € ({summary['margin_percent']}%)")
    p.setFillColor(colors.black)
    y -= 40
    
    # Stock Alerts
    stats = get_dashboard_stats(db)
    low_stock = stats['low_stock']
    
    if low_stock:
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "Alertes Stock")
        y -= 30
        p.setFont("Helvetica", 12)
        p.setFillColor(colors.red)
        for item in low_stock:
            p.drawString(70, y, f"- {item['material']} ({item['dimensions']}): {item['quantity']} restants")
            y -= 20
        p.setFillColor(colors.black)
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type='application/pdf', 
        headers={"Content-Disposition": "attachment; filename=rapport_opticut.pdf"}
    )
