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
