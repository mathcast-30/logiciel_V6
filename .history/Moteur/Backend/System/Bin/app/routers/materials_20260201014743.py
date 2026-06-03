"""Materials API router."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from app.db.database import get_db
from app.models import Material as MaterialModel, Stock as StockModel, EdgeBand as EdgeBandModel, SupplierMaterial, Supplier, Part as PartModel
from app.schemas import Material, MaterialCreate, Stock, StockCreate, StockUpdate, EdgeBand, EdgeBandCreate
from sqlalchemy import func

router = APIRouter()


@router.get("/", response_model=List[Material])
def get_materials(db: Session = Depends(get_db)):
    """Get all materials."""
    return db.query(MaterialModel).all()


@router.post("/", response_model=Material)
def create_material(material: MaterialCreate, db: Session = Depends(get_db)):
    """Create a new material."""
    # Check if material with same name exists
    existing = db.query(MaterialModel).filter(MaterialModel.name == material.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material with this name already exists")
    
    db_material = MaterialModel(**material.model_dump())
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    db.refresh(db_material)
    return db_material



# Edge Banding Endpoints (Must be before /{material_id} to avoid conflict)
@router.get("/edge-bands", response_model=List[EdgeBand])
def get_edge_bands(db: Session = Depends(get_db)):
    """Get all defined edge bands."""
    return db.query(EdgeBandModel).all()


@router.post("/edge-bands", response_model=EdgeBand)
def create_edge_band(edge_band: EdgeBandCreate, db: Session = Depends(get_db)):
    """Create a new edge band definition."""
    existing = db.query(EdgeBandModel).filter(EdgeBandModel.name == edge_band.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Edge band with this name already exists")
    
    db_edge_band = EdgeBandModel(**edge_band.model_dump())
    db.add(db_edge_band)
    db.commit()
    db.refresh(db_edge_band)
    return db_edge_band


@router.delete("/edge-bands/{edge_band_id}")
def delete_edge_band(edge_band_id: int, db: Session = Depends(get_db)):
    """Delete an edge band definition."""
    edge_band = db.query(EdgeBandModel).filter(EdgeBandModel.id == edge_band_id).first()
    if not edge_band:
        raise HTTPException(status_code=404, detail="Edge band not found")
    
    db.delete(edge_band)
    db.commit()
    return {"message": "Edge band deleted"}


@router.get("/{material_id}", response_model=Material)
def get_material(material_id: int, db: Session = Depends(get_db)):
    """Get a specific material by ID."""
    material = db.query(MaterialModel).filter(MaterialModel.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.delete("/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db)):
    """Delete a material."""
    material = db.query(MaterialModel).filter(MaterialModel.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}


@router.get("/{material_id}/best-prices")
def get_best_prices(material_id: int, db: Session = Depends(get_db)):
    """Get supplier prices for a material, sorted by price."""
    offers = db.query(SupplierMaterial).filter(
        SupplierMaterial.material_id == material_id
    ).order_by(SupplierMaterial.price.asc()).all()
    
    result = []
    for offer in offers:
        supplier = db.query(Supplier).filter(Supplier.id == offer.supplier_id).first()
        if supplier:
            result.append({
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "price": offer.price,
                "price_type": offer.price_type,
                "reference": offer.reference,
                "delay": supplier.delivery_delay_days
            })
    return result


@router.get("/{material_id}/stock", response_model=List[Stock])
def get_material_stock(material_id: int, db: Session = Depends(get_db)):
    """Get all stock for a specific material."""
    return db.query(StockModel).filter(StockModel.material_id == material_id).all()


@router.post("/{material_id}/stock", response_model=Stock)
def add_stock(material_id: int, stock: StockCreate, db: Session = Depends(get_db)):
    """Add stock for a material."""
    # Verify material exists
    material = db.query(MaterialModel).filter(MaterialModel.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    stock_data = stock.model_dump()
    stock_data["material_id"] = material_id
    db_stock = StockModel(**stock_data)
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return db_stock


@router.put("/stock/{stock_id}", response_model=Stock)
def update_stock(stock_id: int, stock_update: StockUpdate, db: Session = Depends(get_db)):
    """Update a stock item."""
    db_stock = db.query(StockModel).filter(StockModel.id == stock_id).first()
    if not db_stock:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    update_data = stock_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_stock, key, value)
    
    db.commit()
    db.refresh(db_stock)
    return db_stock


@router.delete("/stock/{stock_id}")
def delete_stock(stock_id: int, db: Session = Depends(get_db)):
    """Delete a stock item."""
    stock = db.query(StockModel).filter(StockModel.id == stock_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    db.delete(stock)
    db.commit()
    return {"message": "Stock deleted"}


@router.post("/identify-from-pieces")
def identify_materials_from_pieces(
    piece_ids: List[int] = Body(..., embed=True),
    project_ids: Optional[List[int]] = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    """
    Identify unique materials from selected pieces.
    
    Groups pieces by material and returns comprehensive material analysis:
    - Material ID, name, thickness, species
    - Total area needed, cost per sqm, total cost estimate
    - Total weight estimate
    - Available stock quantity and area
    - Number of pieces using this material
    
    Request:
    {
        "piece_ids": [1, 2, 3],
        "project_ids": [1, 2]  # Optional - for context
    }
    
    Response:
    [
        {
            "id": 1,
            "name": "Chêne Massif",
            "thickness": 20.0,
            "species": "chêne",
            "is_panel": false,
            "total_area": 5000.0,  # mm²
            "cost_per_sqm": 45.0,
            "estimated_cost": 225.0,  # total_area in m² × cost_per_sqm
            "total_weight": 40.0,  # kg (estimated with density)
            "piece_count": 3,
            "stock_available": 1200.0,  # mm²
            "stock_quantity": 1
        }
    ]
    """
    from sqlalchemy import and_
    
    # Query parts by IDs
    parts = db.query(PartModel).filter(PartModel.id.in_(piece_ids)).all()
    
    if not parts:
        return []
    
    # Group by material
    materials_data: Dict[int, Dict] = {}
    
    for part in parts:
        if not part.material_id:
            continue
        
        material_id = part.material_id
        
        if material_id not in materials_data:
            material = db.query(MaterialModel).filter(MaterialModel.id == material_id).first()
            if not material:
                continue
            
            # Calculate stock availability
            stock_items = db.query(StockModel).filter(StockModel.material_id == material_id).all()
            total_stock_area = sum(item.width * item.height for item in stock_items)
            
            materials_data[material_id] = {
                "id": material.id,
                "name": material.name,
                "thickness": material.thickness,
                "species": material.species or "Inconnu",
                "is_panel": material.is_panel,
                "price_type": material.price_type,
                "cost_per_sqm": material.cost_per_sqm,
                "total_area": 0.0,  # mm²
                "total_area_m2": 0.0,  # m²
                "estimated_cost": 0.0,
                "total_weight": 0.0,  # kg - estimated
                "piece_count": 0,
                "stock_available": total_stock_area,  # mm²
                "stock_quantity": len(stock_items),
                "supplier_ref": material.supplier_ref
            }
        
        # Add piece area to material total
        area_mm2 = part.width * part.height * part.quantity
        materials_data[material_id]["total_area"] += area_mm2
        materials_data[material_id]["piece_count"] += 1
    
    # Calculate costs and weights
    result = []
    for material_id, data in materials_data.items():
        # Convert mm² to m²
        area_m2 = data["total_area"] / 1_000_000
        data["total_area_m2"] = area_m2
        
        # Calculate cost based on price type
        if data["price_type"] == "m2":
            data["estimated_cost"] = area_m2 * data["cost_per_sqm"]
        elif data["price_type"] == "m3":
            # Estimate volume: thickness in mm → m, area in m²
            thickness_m = data["thickness"] / 1000
            volume_m3 = area_m2 * thickness_m
            data["estimated_cost"] = volume_m3 * data["cost_per_sqm"]
        else:  # unit
            # For "unit" pricing, use piece count
            data["estimated_cost"] = data["piece_count"] * data["cost_per_sqm"]
        
        # Estimate weight (assume wood density ~600 kg/m³ for average species)
        if data["is_panel"]:
            thickness_m = data["thickness"] / 1000
            volume_m3 = area_m2 * thickness_m
            data["total_weight"] = volume_m3 * 600  # kg
        else:
            # For raw wood, use similar calculation
            thickness_m = data["thickness"] / 1000
            volume_m3 = area_m2 * thickness_m
            data["total_weight"] = volume_m3 * 700  # kg (slightly denser for solid wood)
        
        # Remove intermediate keys
        del data["price_type"]
        del data["total_area_m2"]
        del data["supplier_ref"]
        
        result.append(data)
    
    return result

