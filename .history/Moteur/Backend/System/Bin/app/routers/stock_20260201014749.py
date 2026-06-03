"""
API endpoints for stock filtering and management.

Provides endpoints to filter stock by material type, species, dimensions, etc.
Used by UI to select appropriate boards for raw wood optimization.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict
from pydantic import BaseModel

from app.db.database import get_db
from app.models import Stock, Material

router = APIRouter(prefix="/stock", tags=["stock"])


class StockFilterRequest(BaseModel):
    """Request model for filtering stock."""
    material_id: Optional[int] = None
    material_type: Optional[str] = None  # 'panel' or 'raw_wood'
    species: Optional[str] = None
    min_width: Optional[float] = None
    min_height: Optional[float] = None
    max_width: Optional[float] = None
    max_height: Optional[float] = None
    include_offcuts: bool = True
    grain_direction: Optional[int] = None  # 0, 1, or 2


class StockItemResponse(BaseModel):
    """Stock item response model."""
    id: int
    material_id: int
    material_name: str
    material_species: Optional[str]
    is_panel: bool
    width: float
    height: float
    quantity: int
    is_offcut: bool
    grain_direction: int
    has_defects: bool
    label: Optional[str]
    quality_score: float

    class Config:
        from_attributes = True


@router.post("/filter", response_model=List[StockItemResponse])
def filter_stock(
    filter_params: StockFilterRequest,
    db: Session = Depends(get_db)
):
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
    for stock in stock_items:
        response.append(StockItemResponse(
            id=stock.id,
            material_id=stock.material_id,
            material_name=stock.material.name,
            material_species=stock.material.species,
            is_panel=stock.material.is_panel,
            width=stock.width,
            height=stock.height,
            quantity=stock.quantity,
            is_offcut=stock.is_offcut,
            grain_direction=stock.grain_direction,
            has_defects=stock.defects is not None and stock.defects != "",
            label=stock.label,
            quality_score=stock.quality_score
        ))
    
    return response


@router.get("/{stock_id}/defects")
def get_stock_defects(stock_id: int, db: Session = Depends(get_db)):
    """
    Get defects for a specific stock item.
    
    Returns defect polygons in GeoJSON format for visualization.
    """
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    if not stock.defects or stock.defects == "":
        return {"defects": []}
    
    # Parse JSON defects
    import json
    try:
        defects = json.loads(stock.defects)
        return {"defects": defects}
    except json.JSONDecodeError:
        return {"defects": []}


@router.put("/{stock_id}/defects")
def update_stock_defects(
    stock_id: int,
    defects: List[dict],
    db: Session = Depends(get_db)
):
    """
    Update defects for a stock item.
    
    Defects format: [{"type": "knot", "polygon": [[x, y], ...]}, ...]
    """
    stock = db.query(Stock).filter(Stock.id == stock_id).first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    import json
    stock.defects = json.dumps(defects)
    db.commit()
    
    return {"success": True, "defect_count": len(defects)}
