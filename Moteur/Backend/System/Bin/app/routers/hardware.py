from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import Hardware, HardwareAssembly
from app.schemas import Hardware as HardwareSchema, HardwareCreate, HardwareUpdate, HardwareAssembly as AssemblySchema, HardwareAssemblyCreate
from IA_Engine.hardware_engine import hardware_engine

router = APIRouter()

# --- Logic / Rule Engine ---

@router.get("/calculate-for-project/{project_id}")
def calculate_project_hardware(project_id: int, db: Session = Depends(get_db)):
    """
    Calculate required hardware for all parts in a project based on active rules.
    """
    try:
        results = hardware_engine.calculate_for_project(project_id, db)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating hardware: {str(e)}")

# --- Assembly Routes ---

@router.post("/assemblies", response_model=AssemblySchema)
def create_assembly(item: HardwareAssemblyCreate, db: Session = Depends(get_db)):
    if db.query(HardwareAssembly).filter(HardwareAssembly.name == item.name).first():
        raise HTTPException(status_code=400, detail="Assembly name already exists")

    db_item = HardwareAssembly(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
    
@router.get("/assemblies", response_model=List[AssemblySchema])
def read_assemblies(db: Session = Depends(get_db)):
    return db.query(HardwareAssembly).all()

# --- Hardware Items ---

@router.post("/", response_model=HardwareSchema)
def create_hardware(item: HardwareCreate, db: Session = Depends(get_db)):
    # Check reference uniqueness
    if db.query(Hardware).filter(Hardware.reference == item.reference).first():
        raise HTTPException(status_code=400, detail="Reference already exists")
        
    db_item = Hardware(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[HardwareSchema])
def read_hardware(skip: int = 0, limit: int = 100, category: str = None, db: Session = Depends(get_db)):
    query = db.query(Hardware)
    if category:
        query = query.filter(Hardware.category == category)
    return query.offset(skip).limit(limit).all()

@router.get("/{item_id}", response_model=HardwareSchema)
def read_hardware_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Hardware).filter(Hardware.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    return item

@router.patch("/{item_id}", response_model=HardwareSchema)
def update_hardware(item_id: int, item: HardwareUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Hardware).filter(Hardware.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    update_data = item.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_hardware(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(Hardware).filter(Hardware.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    db.delete(db_item)
    db.commit()
    return {"ok": True}


