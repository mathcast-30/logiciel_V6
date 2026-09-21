"""Pydantic schemas for request/response validation."""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Union, List, Dict, Any


# Client Schemas
class ClientBase(BaseModel):
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class Client(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


class ClientDetail(Client):
    projects: List['Project'] = []
    quotes: List['Quote'] = []



# Stock Schemas (Moved up for reference)
class StockBase(BaseModel):
    material_id: int
    width: float = Field(gt=0, description="Width in mm")
    height: float = Field(gt=0, description="Height in mm")
    quantity: int = Field(ge=1, default=1)
    is_offcut: bool = False
    label: Optional[str] = None


class StockCreate(BaseModel):
    width: float = Field(gt=0, description="Width in mm")
    height: float = Field(gt=0, description="Height in mm")
    quantity: int = Field(ge=1, default=1)
    is_offcut: bool = False
    label: Optional[str] = None
    grain_direction: int = 1


class StockUpdate(BaseModel):
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=1)
    is_offcut: Optional[bool] = None
    label: Optional[str] = None
    grain_direction: Optional[int] = None


class Stock(StockBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    grain_direction: int = 1


# Material Schemas
class MaterialBase(BaseModel):
    name: str
    thickness: float = Field(gt=0, description="Thickness in mm")
    cost_per_sqm: float = Field(ge=0, default=0.0)
    price_type: str = Field(default="m2", pattern="^(m2|m3|unit)$")
    is_panel: bool = True
    supplier_ref: Optional[str] = None
    has_grain: bool = False


class MaterialCreate(MaterialBase):
    pass


class Material(MaterialBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    stock_items: List[Stock] = []


# EdgeBand Schemas
class EdgeBandBase(BaseModel):
    name: str
    thickness: float = Field(gt=0)
    cost_per_m: float = Field(ge=0, default=0.0)
    color: Optional[str] = None


class EdgeBandCreate(EdgeBandBase):
    pass


class EdgeBand(EdgeBandBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    delivery_delay_days: int = 7
    comments: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    delivery_delay_days: Optional[int] = None
    comments: Optional[str] = None


class SupplierMaterialBase(BaseModel):
    supplier_id: int
    material_id: Optional[int] = None
    name: Optional[str] = None
    reference: Optional[str] = None
    price: float = Field(default=0.0, ge=0)
    price_type: str = "unit"
    width: Optional[float] = None
    height: Optional[float] = None
    thickness: Optional[float] = None
    is_archived: bool = False
    stock_quantity: int = 0
    devis_necessaire: bool = False
    essence: Optional[str] = None
    product_type: Optional[str] = None
    treatment: Optional[str] = None
    certification: Optional[str] = None
    group_name: Optional[str] = None


class SupplierMaterialCreate(SupplierMaterialBase):
    pass


class SupplierMaterialUpdate(BaseModel):
    material_id: Optional[int] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_archived: Optional[bool] = None
    name: Optional[str] = None
    reference: Optional[str] = None
    essence: Optional[str] = None
    product_type: Optional[str] = None
    treatment: Optional[str] = None
    certification: Optional[str] = None
    devis_necessaire: Optional[bool] = None
    group_name: Optional[str] = None
    price_type: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    thickness: Optional[float] = None


class PriceHistory(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    price: float
    timestamp: datetime


class SupplierMaterial(SupplierMaterialBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    price_history: List[PriceHistory] = []


class Supplier(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


class SupplierDetail(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    materials: List[SupplierMaterial] = []


# Part Schemas
class PartBase(BaseModel):
    material_id: Optional[int] = None
    name: str
    width: float = Field(gt=0, description="Width in mm")
    height: float = Field(gt=0, description="Height in mm")
    quantity: int = Field(ge=1, default=1)
    allow_rotation: bool = True
    grain_direction: int = Field(default=0, ge=0, le=2, description="0: None, 1: Horizontal, 2: Vertical")
    priority: int = Field(default=0, description="Priority for optimization (higher = first)")
    edge_top_id: Optional[int] = None
    edge_bottom_id: Optional[int] = None
    edge_left_id: Optional[int] = None
    edge_right_id: Optional[int] = None
    notes: Optional[str] = None
    component_name: Optional[str] = None
    names_source: Optional[str] = None
    thickness_confidence: Optional[float] = None
    thickness_method: Optional[str] = None
    contour_2d_json: Optional[str] = None
    machining_features_json: Optional[str] = None
    extraction_warnings_json: Optional[str] = None


class PartCreate(PartBase):
    pass


class Part(PartBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    project_id: int
    edge_top: Optional[EdgeBand] = None
    edge_bottom: Optional[EdgeBand] = None
    edge_left: Optional[EdgeBand] = None
    edge_right: Optional[EdgeBand] = None


# Project Schemas
class ProjectBase(BaseModel):
    name: str
    client_id: Optional[int] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    start_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    parts: List[Part] = []
    client: Optional[Client] = None


from .projects import ProjectStats


# Quote Schemas
class QuoteItemBase(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    unit: str = "u"
    unit_price: float = Field(ge=0)


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItem(QuoteItemBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    total: float


class QuoteBase(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    tva_rate: float = 20.0


class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate] = []


class Quote(QuoteBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    number: str
    date: datetime
    total_ht: float
    total_ttc: float
    status: str
    pdf_path: Optional[str] = None
    items: List[QuoteItem] = []


# Optimization Schemas
from .optimize import RawWoodParams, OptimizationRequest, OptimizationResponse



class GAParameters(BaseModel):
    population_size: int = 50
    generations: int = 30
    mutation_rate: float = 0.2


class AIStrategyResponse(BaseModel):
    ga_parameters: GAParameters
    strategy_report: str


# Template Schemas
class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "General"
    definition: str  # JSON string or dict? Let's use string for now to match DB


class TemplateCreate(TemplateBase):
    pass


class Template(TemplateBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime


class TemplateResolveRequest(BaseModel):
    parameters: Dict[str, Union[str, int, float]]  # { "L": 600, "H": 720, ... }


# Hardware Schemas
class HardwareBase(BaseModel):
    reference: str
    name: str
    category: str = "other"
    cost_unit: float = Field(default=0.0, ge=0)
    supplier: Optional[str] = None
    product_url: Optional[str] = Field(None, description="URL towards supplier product page")
    image_url: Optional[str] = None
    stock_quantity: int = Field(default=0, ge=0)
    min_stock: int = Field(default=10, ge=0)
    specs: Optional[str] = None


class HardwareCreate(HardwareBase):
    pass


class HardwareUpdate(BaseModel):
    reference: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    cost_unit: Optional[float] = None
    supplier: Optional[str] = None
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    stock_quantity: Optional[int] = None
    min_stock: Optional[int] = None
    specs: Optional[str] = None


class Hardware(HardwareBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: Optional[datetime] = None


class HardwareAssemblyBase(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: Optional[str] = None
    items: str  # JSON String


class HardwareAssemblyCreate(HardwareAssemblyBase):
    pass


class HardwareAssembly(HardwareAssemblyBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: Optional[datetime] = None


from .stock import (
    StockAvailabilityRequest,
    StockItemAvailability,
    StockAvailabilityResponse,
)
from .materials import (
    MaterialsRequest,
    IdentifiedMaterial,
    MaterialsResponse,
)

