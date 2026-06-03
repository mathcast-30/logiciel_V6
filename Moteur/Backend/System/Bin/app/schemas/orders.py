from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models import OrderStatus

class OrderItemBase(BaseModel):
    material_id: int
    quantity: float
    unit_price: float
    reference: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    material_name: Optional[str] = None  # Populated manually if needed

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    supplier_id: int
    notes: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None

class Order(OrderBase):
    id: int
    status: OrderStatus
    total_cost: float
    created_at: datetime
    supplier_name: Optional[str] = None  # Populated manually
    items: List[OrderItem] = []

    class Config:
        from_attributes = True
