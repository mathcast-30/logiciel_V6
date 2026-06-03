from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import Order, OrderItem, OrderStatus, Supplier, Material, Stock
from app.schemas import orders as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Order])
def get_orders(
    skip: int = 0, 
    limit: int = 100, 
    status: OrderStatus = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with supplier name
    for order in orders:
        if order.supplier:
            order.supplier_name = order.supplier.name
        for item in order.items:
            if item.material:
                item.material_name = item.material.name
                
    return orders

@router.post("/", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    # Calculate total
    total_cost = 0
    db_items = []
    
    for item in order.items:
        total_cost += item.quantity * item.unit_price
        db_item = OrderItem(**item.dict())
        db_items.append(db_item)
        
    db_order = Order(
        supplier_id=order.supplier_id,
        notes=order.notes,
        expected_delivery_date=order.expected_delivery_date,
        total_cost=total_cost,
        status=OrderStatus.DRAFT
        # items will be added after flush or individually
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Add items
    for item in db_items:
        item.order_id = db_order.id
        db.add(item)
    
    db.commit()
    db.refresh(db_order)
    return db_order

@router.put("/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status: OrderStatus, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    db.commit()
    return order

@router.post("/{order_id}/receive", response_model=schemas.Order)
def receive_order(order_id: int, db: Session = Depends(get_db)):
    """
    Mark order as received and update Stock quantities.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status == OrderStatus.RECEIVED:
        raise HTTPException(status_code=400, detail="Order already received")
        
    # Update stock
    for item in order.items:
        # Check if stock exists or create new
        # For simplicity, we create a new stock line or update generic
        # Ideally, we should add specific stock items.
        
        # Determine dimensions from Material info if not present?
        # Supplier offers usually link to a Material which has default dimensions or we assume full sheets.
        material = db.query(Material).filter(Material.id == item.material_id).first()
        if not material:
            continue
            
        # Add to stock
        # We assume "quantity" in order item is number of sheets/units
        new_stock = Stock(
            material_id=material.id,
            width=material.width if material.width else 2500, # Fallback
            height=material.height if material.height else 1220,
            quantity=int(item.quantity),
            label=f"Cmd #{order.id} - {order.supplier.name}"
        )
        db.add(new_stock)
        
    order.status = OrderStatus.RECEIVED
    db.commit()
    db.refresh(order)
    return order

@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}
