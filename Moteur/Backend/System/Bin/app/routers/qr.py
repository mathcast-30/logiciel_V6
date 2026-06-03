"""
API Router pour la gestion des QR codes
Permet de scanner un QR code et récupérer les informations associées
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from ..models import Stock, Material, Project, Part

router = APIRouter(
    prefix="/qr",
    tags=["QR Codes"]
)


@router.get("/scan/{qr_code}")
def scan_qr_code(qr_code: str, db: Session = Depends(get_db)):
    """
    Scanne un QR code et retourne les informations de la planche associée
    
    Le QR code peut être:
    - STOCK-{id} : Référence directe au stock
    - Le label ou supplier_ref d'un item stock
    """
    
    # Chercher par différents critères
    stock_item = None
    
    # 1. Format STOCK-{id}
    if qr_code.upper().startswith("STOCK-"):
        try:
            stock_id = int(qr_code.split("-")[1])
            stock_item = db.query(Stock).filter(Stock.id == stock_id).first()
        except (ValueError, IndexError):
            pass
    
    # 2. Chercher par label ou qr_code field
    if not stock_item:
        stock_item = db.query(Stock).filter(
            or_(
                Stock.label == qr_code,
                Stock.id == int(qr_code) if qr_code.isdigit() else False
            )
        ).first()
    
    if not stock_item:
        raise HTTPException(
            status_code=404, 
            detail=f"Aucune planche trouvée pour le QR code: {qr_code}"
        )
    
    # Récupérer le matériau
    material = db.query(Material).filter(Material.id == stock_item.material_id).first()
    
    # Trouver les pièces qui utilisent ce matériau et leurs projets
    # On cherche surtout l'optimisation la plus récente qui utilise ce PANEL_ID
    from ..models import OptimizationResult
    import json

    optimization = db.query(OptimizationResult).join(Project).filter(
        OptimizationResult.result_data.like(f'%"panel_id": {stock_item.id}%')
    ).order_by(OptimizationResult.is_validated.desc(), OptimizationResult.created_at.desc()).first()
    
    linked_project = optimization.project if optimization else None
    
    # Extraire les chutes spécifiques pour ce panel_id de l'optimisation
    offcuts_data = []
    if optimization and optimization.result_data:
        try:
            full_data = json.loads(optimization.result_data)
            # Chercher le panel spécifique dans l'optimisation
            for panel in full_data.get('panels', []):
                if panel.get('panel_id') == stock_item.id:
                    offcuts_data = panel.get('offcuts', [])
                    break
        except Exception:
            pass
    
    # Construire la réponse
    response = {
        "stock_item": {
            "id": stock_item.id,
            "material_id": stock_item.material_id,
            "width": stock_item.width,
            "height": stock_item.height,
            "quantity": stock_item.quantity,
            "is_offcut": stock_item.is_offcut,
            "label": stock_item.label,
            "material": {
                "id": material.id,
                "name": material.name,
                "thickness": material.thickness,
                "cost_per_sqm": material.cost_per_sqm
            } if material else None
        },
        "linked_project": {
            "id": linked_project.id,
            "name": linked_project.name,
            "status": linked_project.status,
            "client_id": linked_project.client_id
        } if linked_project else None,
        "optimization": {
            "id": optimization.id if optimization else None,
            "offcuts": offcuts_data
        } if optimization else None
    }
    
    return response


@router.post("/{stock_id}/use")
def mark_stock_used(stock_id: int, db: Session = Depends(get_db)):
    """
    Marque une planche comme utilisée (décrémente la quantité)
    """
    stock_item = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock_item:
        raise HTTPException(status_code=404, detail="Stock non trouvé")
    
    if stock_item.quantity <= 0:
        raise HTTPException(status_code=400, detail="Stock déjà épuisé")
    
    stock_item.quantity -= 1
    db.commit()
    
    return {
        "success": True,
        "message": f"Stock mis à jour. Quantité restante: {stock_item.quantity}",
        "remaining": stock_item.quantity
    }


@router.post("/consume")
def consume_board_and_generate_offcuts(
    stock_id: int, 
    optimization_id: int = None, 
    db: Session = Depends(get_db)
):
    """
    Consomme une planche et génère AUTOMATIQUEMENT les chutes prévues
    dans l'optimisation spécifiée.
    """
    from ..models import OptimizationResult
    import json

    stock_item = db.query(Stock).filter(Stock.id == stock_id).first()
    if not stock_item:
        raise HTTPException(status_code=404, detail="Stock non trouvé")
    
    if stock_item.quantity <= 0:
        raise HTTPException(status_code=400, detail="Stock déjà épuisé")

    # 1. Décompter la planche
    stock_item.quantity -= 1
    
    # 2. Récupérer les chutes depuis l'optimisation
    new_offcuts_count = 0
    if optimization_id:
        opt = db.query(OptimizationResult).filter(OptimizationResult.id == optimization_id).first()
        if opt and opt.result_data:
            try:
                data = json.loads(opt.result_data)
                for panel in data.get('panels', []):
                    if panel.get('panel_id') == stock_id:
                        # On a trouvé le plan de cette planche, on crée les chutes
                        for offcut in panel.get('offcuts', []):
                            new_stock = Stock(
                                material_id=stock_item.material_id,
                                width=offcut.get('width'),
                                height=offcut.get('height'),
                                quantity=1,
                                is_offcut=True,
                                label=f"Chute de {stock_item.label or stock_id}",
                                grain_direction=stock_item.grain_direction
                            )
                            db.add(new_stock)
                            new_offcuts_count += 1
                        break
            except Exception as e:
                print(f"Error generating offcuts: {e}")

    db.commit()

    return {
        "success": True,
        "message": f"Planche consommée. {new_offcuts_count} chutes enregistrées.",
        "remaining": stock_item.quantity,
        "offcuts_created": new_offcuts_count
    }
