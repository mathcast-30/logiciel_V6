"""
API endpoints for stock filtering and management.

Provides endpoints to filter stock by material type, species, dimensions, etc.
Used by UI to select appropriate boards for raw wood optimization.
"""

from __future__ import annotations
import json
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, ConfigDict

from app.db.database import get_db
from app.models import Stock, Material


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
    is_panel: bool
    width: float
    height: float
    quantity: int
    is_offcut: bool
    grain_direction: int
    has_defects: bool
    label: str | None
    quality_score: float


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
            is_panel=bool(cast(Any, stock_item.material).is_panel),
            width=float(cast(Any, stock_item.width)),
            height=float(cast(Any, stock_item.height)),
            quantity=int(cast(Any, stock_item.quantity)),
            is_offcut=bool(cast(Any, stock_item.is_offcut)),
            grain_direction=int(cast(Any, stock_item.grain_direction)),
            has_defects=has_defects,
            label=cast("str | None", stock_item.label),
            quality_score=float(cast(Any, stock_item.quality_score))
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


@router.post("/availability")
def check_stock_availability(
    material_ids: list[int] = Body(..., embed=True),
    db: Session = Depends(get_db)
) -> dict[str, list[dict[str, Any]]]:
    """
    Check stock availability for materials.
    
    Used by MaterialSourceSelector to show stock information when "Stock" source is selected.
    """
    result = []
    
    for mat_id in material_ids:
        # Get material info
        material = db.query(Material).filter(Material.id == mat_id).first()
        if not material:
            continue
        
        # Get all stock for this material
        stock_items = db.query(Stock).filter(Stock.material_id == mat_id).all()
        
        # Calculate availability
        total_available_area = 0.0
        total_cost = 0.0
        available_panels = []
        
        for stock_item in stock_items:
            qty = int(cast(Any, stock_item.quantity))
            if qty > 0:
                width = float(cast(Any, stock_item.width))
                height = float(cast(Any, stock_item.height))
                area_mm2 = width * height * qty
                total_available_area += area_mm2
                
                # Calculate cost for this stock item
                area_m2 = area_mm2 / 1_000_000
                if material.price_type == "m2":
                    item_cost = area_m2 * float(cast(Any, material.cost_per_sqm))
                elif material.price_type == "m3":
                    thickness_m = float(cast(Any, material.thickness)) / 1000
                    volume_m3 = area_m2 * thickness_m
                    item_cost = volume_m3 * float(cast(Any, material.cost_per_sqm))
                else:  # unit
                    item_cost = qty * float(cast(Any, material.cost_per_sqm))
                
                total_cost += item_cost
                
                available_panels.append({
                    "id": int(cast(Any, stock_item.id)),
                    "width": width,
                    "height": height,
                    "quantity": qty,
                    "area": area_mm2,
                    "is_offcut": bool(cast(Any, stock_item.is_offcut)),
                    "grain_direction": int(cast(Any, stock_item.grain_direction)),
                    "quality_score": float(cast(Any, stock_item.quality_score)),
                    "label": cast("str | None", stock_item.label)
                })
        
        result.append({
            "material_id": int(cast(Any, material.id)),
            "material_name": str(cast(Any, material.name)),
            "material_species": cast("str | None", material.species) or "Inconnu",
            "is_panel": bool(cast(Any, material.is_panel)),
            "thickness": float(cast(Any, material.thickness)),
            "stock_count": len([s for s in stock_items if int(cast(Any, s.quantity)) > 0]),
            "available_area": total_available_area,
            "available_panels": available_panels,
            "estimated_cost": round(total_cost, 2)
        })
    
    return {"availability": result}

