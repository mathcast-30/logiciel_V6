"""Suppliers API router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import (
    Supplier as SupplierModel, 
    SupplierMaterial as SupplierMaterialModel, 
    Material as MaterialModel,
    PriceHistory as PriceHistoryModel
)
from app.schemas import (
    Supplier, SupplierCreate, SupplierUpdate, SupplierDetail,
    SupplierMaterial, SupplierMaterialCreate, SupplierMaterialUpdate,
    PriceHistory
)

router = APIRouter()

# ==========================
# Suppliers CRUD
# ==========================

@router.get("/", response_model=List[Supplier])
def get_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all suppliers."""
    return db.query(SupplierModel).offset(skip).limit(limit).all()

@router.get("/{supplier_id}", response_model=SupplierDetail)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Get a specific supplier with their offers."""
    supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.post("/", response_model=Supplier)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create a new supplier."""
    existing = db.query(SupplierModel).filter(SupplierModel.name == supplier.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier with this name already exists")
    
    db_supplier = SupplierModel(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.put("/{supplier_id}", response_model=Supplier)
def update_supplier(supplier_id: int, supplier_update: SupplierUpdate, db: Session = Depends(get_db)):
    """Update a supplier."""
    db_supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Delete a supplier."""
    supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(supplier)
    db.commit()
    return {"message": "Supplier deleted"}

# ==========================
# Supplier Materials (Offers)
# ==========================

@router.get("/{supplier_id}/catalog", response_model=List[SupplierMaterial])
def get_supplier_catalog(supplier_id: int, db: Session = Depends(get_db)):
    """Get all materials in a supplier's catalog."""
    return db.query(SupplierMaterialModel).filter(
        SupplierMaterialModel.supplier_id == supplier_id,
        SupplierMaterialModel.is_archived == False
    ).all()

@router.post("/{supplier_id}/materials", response_model=SupplierMaterial)
def add_supplier_material(
    supplier_id: int, 
    offer: SupplierMaterialCreate, 
    db: Session = Depends(get_db)
):
    """Add a material offer to a supplier."""
    supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    # Check if offer already exists by reference (if provided) or name/material_id
    existing = None
    if offer.reference:
        existing = db.query(SupplierMaterialModel).filter(
            SupplierMaterialModel.supplier_id == supplier_id,
            SupplierMaterialModel.reference == offer.reference
        ).first()

    if existing:
        # Check if price changed to record history
        if existing.price != offer.price:
            history = PriceHistoryModel(supplier_material_id=existing.id, price=existing.price)
            db.add(history)
            existing.price = offer.price
        
        # Update other fields
        update_data = offer.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(existing, key, value)
            
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new
    db_offer = SupplierMaterialModel(**offer.model_dump())
    db_offer.supplier_id = supplier_id
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.put("/offers/{offer_id}", response_model=SupplierMaterial)
def update_supplier_offer(
    offer_id: int,
    update: SupplierMaterialUpdate,
    db: Session = Depends(get_db)
):
    """Update a specific supplier material."""
    db_offer = db.query(SupplierMaterialModel).filter(SupplierMaterialModel.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    update_data = update.model_dump(exclude_unset=True)
    
    # Handle price history
    if "price" in update_data and update_data["price"] != db_offer.price:
        history = PriceHistoryModel(supplier_material_id=db_offer.id, price=db_offer.price)
        db.add(history)
    
    for key, value in update_data.items():
        setattr(db_offer, key, value)
    
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.delete("/offers/{offer_id}")
def delete_supplier_offer(offer_id: int, db: Session = Depends(get_db)):
    """Delete a specific supplier offer."""
    offer = db.query(SupplierMaterialModel).filter(SupplierMaterialModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    db.delete(offer)
    db.commit()
    return {"message": "Offer deleted"}
@router.post("/offers/{offer_id}/refresh")
async def refresh_offer_price(offer_id: int, db: Session = Depends(get_db)):
    """Triggers a quick scraping for a specific offer's price."""
    from Scraping_Engine.scraping_service import ScrapingService
    service = ScrapingService(db)
    new_price = await service.update_product_price(offer_id)
    if new_price is None:
        raise HTTPException(status_code=404, detail="Offer not found or could not be scraped")
    return {"price": new_price}

@router.post("/{supplier_id}/refresh")
async def refresh_supplier_catalog(supplier_id: int, db: Session = Depends(get_db)):
    """Triggers a quick scraping for all products in a supplier's catalog."""
    from Scraping_Engine.scraping_service import ScrapingService
    service = ScrapingService(db)
    
    catalog = db.query(SupplierMaterialModel).filter(
        SupplierMaterialModel.supplier_id == supplier_id,
        SupplierMaterialModel.is_archived == False,
        SupplierMaterialModel.reference != None # Must have a URL
    ).all()
    
    updated_count = 0
    for offer in catalog:
        try:
            new_price = await service.update_product_price(offer.id)
            if new_price:
                updated_count += 1
        except Exception as e:
            print(f"Error refreshing {offer.id}: {e}")
            
    return {"updated_count": updated_count, "total": len(catalog)}

@router.post("/{supplier_id}/batch-import")
async def batch_import_materials(
    supplier_id: int, 
    products: List[SupplierMaterialCreate], 
    db: Session = Depends(get_db)
):
    """Import multiple materials for a supplier."""
    supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    created_count = 0
    updated_count = 0
    
    for offer in products:
        # Reuse add_supplier_material logic but optimized for loop
        existing = None
        if offer.reference:
            existing = db.query(SupplierMaterialModel).filter(
                SupplierMaterialModel.supplier_id == supplier_id,
                SupplierMaterialModel.reference == offer.reference
            ).first()

        if existing:
            if existing.price != offer.price:
                history = PriceHistoryModel(supplier_material_id=existing.id, price=existing.price)
                db.add(history)
                existing.price = offer.price
            
            update_data = offer.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(existing, key, value)
            updated_count += 1
        else:
            db_offer = SupplierMaterialModel(**offer.model_dump())
            db_offer.supplier_id = supplier_id
            db.add(db_offer)
            created_count += 1
            
    db.commit()
    return {"created": created_count, "updated": updated_count}
@router.post("/offers/{offer_id}/associate/{material_id}")
async def associate_material(offer_id: int, material_id: int, db: Session = Depends(get_db)):
    """Link a supplier offer to an internal material."""
    offer = db.query(SupplierMaterialModel).filter(SupplierMaterialModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offre fournisseur non trouvée")
        
    material = db.query(MaterialModel).filter(MaterialModel.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Matériau interne non trouvé")
        
    offer.material_id = material_id
    db.commit()
    return {"success": True, "message": f"Offre associée à {material.name}"}
