"""
API endpoints for stock filtering and management.

Provides endpoints to filter stock by material type, species, dimensions, etc.
Used by UI to select appropriate boards for raw wood optimization.
"""

from __future__ import annotations
import json
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, ConfigDict

from app.db.database import get_db
from app.models import Stock, Material
from app.schemas.stock import (
    StockAvailabilityRequest,
    StockItemAvailability,
    StockAvailabilityResponse,
)


router = APIRouter(tags=["stock"])


class StockFilterRequest(BaseModel):
    """Request model for filtering stock."""
    material_id: int | None = None
    material_type: str | None = None  # 'panel' or 'raw_wood'
    species: str | None = None
    min_width: float | None = None
    min_height: float | None = None
    max_width: float | None = None
    max_height: float | None = None
    include_offcuts: bool = True
    grain_direction: int | None = None  # 0, 1, or 2


class StockItemResponse(BaseModel):
    """Stock item response model."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    material_id: int
    material_name: str
    material_species: str | None
    thickness: float
    is_panel: bool
    width: float
    height: float
    quantity: int
    is_offcut: bool
    grain_direction: int
    has_defects: bool
    label: str | None
    quality_score: float
    prix_unitaire: float | None = None
    unite_prix: str | None = None


@router.get("", response_model=list[StockItemResponse])
def get_all_stock(db: Session = Depends(get_db)) -> list[StockItemResponse]:
    """Get all stock items."""
    query = db.query(Stock).join(Material).filter(Stock.quantity > 0)
    stock_items = query.all()
    
    response = []
    for stock_item in stock_items:
        has_defects = False
        defects_val = cast(Any, stock_item.defects)
        if defects_val:
            try:
                defects_data = json.loads(str(defects_val))
                has_defects = len(defects_data) > 0
            except (json.JSONDecodeError, TypeError):
                has_defects = False

        response.append(StockItemResponse(
            id=int(cast(Any, stock_item.id)),
            material_id=int(cast(Any, stock_item.material_id)),
            material_name=str(cast(Any, stock_item.material).name),
            material_species=cast("str | None", cast(Any, stock_item.material).species),
            thickness=float(cast(Any, stock_item.material).thickness),
            is_panel=bool(cast(Any, stock_item.material).is_panel),
            width=float(cast(Any, stock_item.width)),
            height=float(cast(Any, stock_item.height)),
            quantity=int(cast(Any, stock_item.quantity)),
            is_offcut=bool(cast(Any, stock_item.is_offcut)),
            grain_direction=int(cast(Any, stock_item.grain_direction)),
            has_defects=has_defects,
            label=cast("str | None", stock_item.label),
            quality_score=float(cast(Any, stock_item.quality_score)),
            prix_unitaire=float(getattr(stock_item, 'prix_unitaire', 0)) if getattr(stock_item, 'prix_unitaire', None) is not None else None,
            unite_prix=getattr(stock_item, 'unite_prix', 'm2') or 'm2'
        ))
    
    return response


@router.post("/filter", response_model=list[StockItemResponse])
def filter_stock(
    filter_params: StockFilterRequest,
    db: Session = Depends(get_db)
) -> list[StockItemResponse]:
    """
    Filter stock items based on multiple criteria.
    
    Used to select appropriate boards for optimization based on:
    - Material type (panel vs raw wood)
    - Species (for raw wood)
    - Minimum/maximum dimensions
    - Grain direction
    - Offcut status
    """
    
    # Build query
    query = db.query(Stock).join(Material)
    
    conditions = []
    
    # Material ID filter
    if filter_params.material_id is not None:
        conditions.append(Stock.material_id == filter_params.material_id)
    
    # Material type filter (panel vs raw wood)
    if filter_params.material_type:
        if filter_params.material_type == "panel":
            conditions.append(Material.is_panel == True)
        elif filter_params.material_type == "raw_wood":
            conditions.append(Material.is_panel == False)
    
    # Species filter
    if filter_params.species:
        conditions.append(Material.species == filter_params.species)
    
    # Dimension filters
    if filter_params.min_width is not None:
        conditions.append(Stock.width >= filter_params.min_width)
    if filter_params.max_width is not None:
        conditions.append(Stock.width <= filter_params.max_width)
    if filter_params.min_height is not None:
        conditions.append(Stock.height >= filter_params.min_height)
    if filter_params.max_height is not None:
        conditions.append(Stock.height <= filter_params.max_height)
    
    # Offcut filter
    if not filter_params.include_offcuts:
        conditions.append(Stock.is_offcut == False)
    
    # Grain direction filter
    if filter_params.grain_direction is not None:
        conditions.append(Stock.grain_direction == filter_params.grain_direction)
    
    # Apply all conditions
    if conditions:
        query = query.filter(and_(*conditions))
    
    # Only return stock with quantity > 0
    query = query.filter(Stock.quantity > 0)
    
    # Execute query
    stock_items = query.all()
    
    # Build response
    response = []
    for stock_item in stock_items:
        # Check for defects
        has_defects = False
        defects_val = cast(Any, stock_item.defects)
        if defects_val:
            try:
                defects_data = json.loads(str(defects_val))
                has_defects = len(defects_data) > 0
            except (json.JSONDecodeError, TypeError):
                has_defects = False

        response.append(StockItemResponse(
            id=int(cast(Any, stock_item.id)),
            material_id=int(cast(Any, stock_item.material_id)),
            material_name=str(cast(Any, stock_item.material).name),
            material_species=cast("str | None", cast(Any, stock_item.material).species),
            thickness=float(cast(Any, stock_item.material).thickness),
            is_panel=bool(cast(Any, stock_item.material).is_panel),
            width=float(cast(Any, stock_item.width)),
            height=float(cast(Any, stock_item.height)),
            quantity=int(cast(Any, stock_item.quantity)),
            is_offcut=bool(cast(Any, stock_item.is_offcut)),
            grain_direction=int(cast(Any, stock_item.grain_direction)),
            has_defects=has_defects,
            label=cast("str | None", stock_item.label),
            quality_score=float(cast(Any, stock_item.quality_score)),
            prix_unitaire=float(getattr(stock_item, 'prix_unitaire', 0)) if getattr(stock_item, 'prix_unitaire', None) is not None else None,
            unite_prix=getattr(stock_item, 'unite_prix', 'm2') or 'm2'
        ))
    
    return response


@router.get("/{stock_id}/defects")
def get_stock_defects(stock_id: int, db: Session = Depends(get_db)) -> dict[str, list[Any]]:
    """
    Get defects for a specific stock item.
    
    Returns defect polygons in GeoJSON format for visualization.
    """
    stock_item = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock_item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    defects_val = cast(Any, stock_item.defects)
    if not defects_val:
        return {"defects": []}
    
    # Parse JSON defects
    try:
        defects = json.loads(str(defects_val))
        return {"defects": defects if isinstance(defects, list) else []}
    except json.JSONDecodeError:
        return {"defects": []}


@router.put("/{stock_id}/defects")
def update_stock_defects(
    stock_id: int,
    defects: list[dict[str, Any]],
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    """
    Update defects for a stock item.
    
    Defects format: [{"type": "knot", "polygon": [[x, y], ...]}, ...]
    """
    stock_item = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock_item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    stock_item.defects = json.dumps(defects)
    db.commit()
    
    return {"success": True, "defect_count": len(defects)}


@router.post("/availability", response_model=StockAvailabilityResponse)
def check_stock_availability(
    request: StockAvailabilityRequest,
    db: Session = Depends(get_db)
) -> StockAvailabilityResponse:
    """
    Vérifie la disponibilité du stock pour une liste de matériaux.

    **Utilisation** :
    - Appelé par `MaterialSourceSelector.tsx` pour afficher les options de stock.

    **Exemple de requête** :
    ```json
    {
      "material_ids": [1, 2]
    }
    ```

    **Exemple de réponse** :
    ```json
    {
      "availabilities": [
        {
          "material_id": 1,
          "available_quantity": 15,
          "available_area": 6.7500,
          "sufficient": false,
          "shortfall": null,
          "stock_items": [
            {
              "id": 10,
              "reference": "CHENE-001",
              "width": 2500,
              "height": 1200,
              "thickness": 20,
              "quantity": 5,
              "unit_cost": 45.50,
              "area": 3.0000,
              "total_area": 15.0000
            }
          ]
        }
      ]
    }
    ```
    """
    # --- ÉTAPE 1 : Validation de la requête ---
    if not request.material_ids:
        raise HTTPException(
            status_code=400,
            detail="material_ids cannot be empty"
        )

    availabilities: list[StockItemAvailability] = []

    # --- ÉTAPE 2 : Traiter chaque material_id ---
    for material_id in request.material_ids:
        # 2.1. Vérifier que le matériau existe
        material = db.query(Material).filter(Material.id == material_id).first()
        if material is None:
            continue  # Ignorer les matériaux introuvables

        # 2.2. Récupérer TOUS les stocks pour ce matériau (quantity > 0)
        stock_items = db.query(Stock).filter(
            Stock.material_id == material_id,
            Stock.quantity > 0
        ).all()

        # 2.3. Calculer la quantité et surface totale disponible
        available_quantity = sum(int(cast(Any, item.quantity)) for item in stock_items)
        available_area = sum(
            (float(cast(Any, item.width)) * float(cast(Any, item.height)) * int(cast(Any, item.quantity))) / 1_000_000
            for item in stock_items
        )

        # 2.4. Construire la liste des planches (pour affichage détaillé)
        stock_items_list: list[dict[str, Any]] = []
        for item in stock_items:
            item_width = float(cast(Any, item.width))
            item_height = float(cast(Any, item.height))
            item_qty = int(cast(Any, item.quantity))
            item_area = (item_width * item_height) / 1_000_000  # m²
            item_total_area = (item_width * item_height * item_qty) / 1_000_000  # m²

            thickness = getattr(item, "thickness", None)
            if thickness is None and getattr(item, "material", None):
                thickness = item.material.thickness
            elif thickness is None:
                thickness = material.thickness if material else 0.0

            ref = getattr(item, "reference", None) or getattr(item, "label", None) or ""
            unit_cost = getattr(item, "unit_cost", None) or getattr(item, "prix_unitaire", None) or 0.0

            stock_items_list.append({
                "id": int(cast(Any, item.id)),
                "reference": str(ref),
                "width": item_width,
                "height": item_height,
                "thickness": float(thickness),
                "quantity": item_qty,
                "unit_cost": float(unit_cost),
                "area": round(item_area, 4),
                "total_area": round(item_total_area, 4),
            })

        # 2.5. Créer l'objet de disponibilité
        # Note: 'sufficient' est False par défaut car on ne connaît pas la demande.
        # Le frontend devra comparer avec la quantité nécessaire.
        availabilities.append(
            StockItemAvailability(
                material_id=material_id,
                available_quantity=available_quantity,
                available_area=round(available_area, 4),
                stock_items=stock_items_list,
                sufficient=False,  # À recalculer côté frontend
                shortfall=None
            )
        )

    return StockAvailabilityResponse(availabilities=availabilities)


class StockUpdate(BaseModel):
    quantity: int | None = None
    prix_unitaire: float | None = None
    unite_prix: str | None = None

@router.patch("/{stock_id}", response_model=StockItemResponse)
def update_stock(
    stock_id: int,
    stock_update: StockUpdate,
    db: Session = Depends(get_db)
) -> StockItemResponse:
    """Update stock properties like quantity and price."""
    stock_item = db.query(Stock).filter(Stock.id == stock_id).first()
    if not stock_item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    if stock_update.quantity is not None:
        stock_item.quantity = stock_update.quantity
    if stock_update.prix_unitaire is not None:
        setattr(stock_item, 'prix_unitaire', stock_update.prix_unitaire)
    if stock_update.unite_prix is not None:
        setattr(stock_item, 'unite_prix', stock_update.unite_prix)
        
    db.commit()
    db.refresh(stock_item)
    
    has_defects = False
    defects_val = cast(Any, stock_item.defects)
    if defects_val:
        try:
            defects_data = json.loads(str(defects_val))
            has_defects = len(defects_data) > 0
        except (json.JSONDecodeError, TypeError):
            has_defects = False

    return StockItemResponse(
        id=int(cast(Any, stock_item.id)),
        material_id=int(cast(Any, stock_item.material_id)),
        material_name=str(cast(Any, stock_item.material).name),
        material_species=cast("str | None", cast(Any, stock_item.material).species),
        thickness=float(cast(Any, stock_item.material).thickness),
        is_panel=bool(cast(Any, stock_item.material).is_panel),
        width=float(cast(Any, stock_item.width)),
        height=float(cast(Any, stock_item.height)),
        quantity=int(cast(Any, stock_item.quantity)),
        is_offcut=bool(cast(Any, stock_item.is_offcut)),
        grain_direction=int(cast(Any, stock_item.grain_direction)),
        has_defects=has_defects,
        label=cast("str | None", stock_item.label),
        quality_score=float(cast(Any, stock_item.quality_score)),
        prix_unitaire=float(getattr(stock_item, 'prix_unitaire', 0)) if getattr(stock_item, 'prix_unitaire', None) is not None else None,
        unite_prix=getattr(stock_item, 'unite_prix', 'm2') or 'm2'
    )
