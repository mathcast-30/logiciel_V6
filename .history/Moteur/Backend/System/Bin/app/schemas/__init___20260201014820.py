"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


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
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ClientDetail(Client):
    projects: List['Project'] = []
    quotes: List['Quote'] = []
    
    class Config:
        from_attributes = True



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
    id: int
    created_at: datetime
    grain_direction: int = 1
    
    class Config:
        from_attributes = True


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
    id: int
    created_at: datetime
    stock_items: List[Stock] = []
    
    class Config:
        from_attributes = True


# EdgeBand Schemas
class EdgeBandBase(BaseModel):
    name: str
    thickness: float = Field(gt=0)
    cost_per_m: float = Field(ge=0, default=0.0)
    color: Optional[str] = None


class EdgeBandCreate(EdgeBandBase):
    pass


class EdgeBand(EdgeBandBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Supplier Schemas (Ensure materials are included)
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

class SupplierUpdate(SupplierBase):
    pass

class SupplierMaterialBase(BaseModel):
    supplier_id: int
    material_id: Optional[int] = None
    name: Optional[str] = None
    reference: Optional[str] = None
    price: float
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

class SupplierMaterialCreate(SupplierMaterialBase):
    pass

class SupplierMaterialUpdate(BaseModel):
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_archived: Optional[bool] = None
    name: Optional[str] = None
    reference: Optional[str] = None
    
class SupplierMaterial(SupplierMaterialBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    # materials: List[SupplierMaterial] = [] # Optional to avoid heavy load on list
    
    class Config:
        from_attributes = True

class SupplierDetail(Supplier):
    materials: List[SupplierMaterial] = []
    
    class Config:
        from_attributes = True


# Part Schemas
class PartBase(BaseModel):
    material_id: Optional[int] = None
    name: str
    width: float = Field(gt=0, description="Width in mm")
    height: float = Field(gt=0, description="Height in mm")
    quantity: int = Field(ge=1, default=1)
    allow_rotation: bool = True
    grain_direction: int = Field(default=0, ge=0, le=2, description="0: None, 1: Horizontal, 2: Vertical")
    edge_top_id: Optional[int] = None
    edge_bottom_id: Optional[int] = None
    edge_left_id: Optional[int] = None
    edge_right_id: Optional[int] = None
    notes: Optional[str] = None


class PartCreate(PartBase):
    pass


class Part(PartBase):
    id: int
    project_id: int
    edge_top: Optional[EdgeBand] = None
    edge_bottom: Optional[EdgeBand] = None
    edge_left: Optional[EdgeBand] = None
    edge_right: Optional[EdgeBand] = None
    
    class Config:
        from_attributes = True


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
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    start_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    parts: List[Part] = []
    
    class Config:
        from_attributes = True


# Quote Schemas
class QuoteItemBase(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    unit: str = "u"
    unit_price: float = Field(ge=0)


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItem(QuoteItemBase):
    id: int
    total: float
    
    class Config:
        from_attributes = True


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
    id: int
    number: str
    date: datetime
    total_ht: float
    total_ttc: float
    status: str
    pdf_path: Optional[str] = None
    items: List[QuoteItem] = []
    
    class Config:
        from_attributes = True


# Optimization Schemas
class RawWoodParams(BaseModel):
    """Raw wood optimization specific parameters."""
    position_resolution: float = Field(default=10.0, gt=0, description="Grid resolution in mm for placement positions")
    min_offcut_dimension: float = Field(default=100.0, ge=0, description="Minimum dimension for reusable offcuts in mm")
    scoring_weights: dict = Field(
        default={"utilization": 0.4, "compactness": 0.3, "offcut_quality": 0.3},
        description="Scoring weights for placement evaluation"
    )


class OptimizationRequest(BaseModel):
    # Legacy compatibility
    project_id: Optional[int] = None # Single project (compatibility)
    project_ids: Optional[List[int]] = None # Multiple projects for batching
    
    # Engine selection (NEW)
    engine: str = Field(default="auto", description="Engine selection: 'auto', 'panel', or 'raw_wood'")
    
    # Piece and stock selection (NEW)
    piece_ids: Optional[List[int]] = Field(None, description="Optional: specific piece IDs to optimize (if not provided, all pieces from projects)")
    stock_ids: Optional[List[int]] = Field(None, description="Optional: specific stock IDs to use (if not provided, all available stock)")
    
    # Material source selection per material (NEW)
    material_sources: Optional[dict] = Field(None, description="Dict mapping material_id to 'stock' or 'supplier'. Ex: {1: 'stock', 2: 'supplier'}")
    
    # Common parameters
    kerf: float = Field(default=3.0, gt=0, description="Blade thickness in mm")
    trim_margin: float = Field(default=2.0, ge=0, description="Sanding/trim margin in mm")
    safety_margin: float = Field(default=5.0, ge=0, description="Safety margin between parts in mm")
    
    # Algorithm selection
    algorithm: str = Field(default="guillotine", description="Algorithm: guillotine, rectpack, next_fit, best_fit")
    material_source: str = Field(default="stock", description="Material source: stock (from inventory) or supplier (catalog)")
    
    # Raw wood specific (NEW)
    raw_wood_params: Optional[RawWoodParams] = Field(None, description="Raw wood optimization parameters (only used if engine='raw_wood')")
    
    # Export and execution
    export_formats: List[str] = Field(default=["pdf"], description="Export formats: png, pdf, dxf, svg, json")
    validate_and_update_stock: bool = Field(default=False, description="If true, update stock and add offcuts after optimization")
    high_precision: bool = Field(default=False, description="If true, use Genetic Algorithm for better optimization (slower)")


class OptimizationResponse(BaseModel):
    optimization_id: int
    engine_used: str = Field(default="panel", description="Which engine was used: 'panel' or 'raw_wood'")
    total_panels_used: int
    waste_percentage: float
    total_cost: float = 0.0
    result_data: dict
    export_files: dict

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
    definition: str # JSON string or dict? Let's use string for now to match DB

class TemplateCreate(TemplateBase):
    pass

class Template(TemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TemplateResolveRequest(BaseModel):
    parameters: dict # { "L": 600, "H": 720, ... }


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
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class HardwareAssemblyBase(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: Optional[str] = None
    items: str # JSON String

class HardwareAssemblyCreate(HardwareAssemblyBase):
    pass

class HardwareAssembly(HardwareAssemblyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    delivery_delay_days: int = Field(default=7, ge=0)
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

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class SupplierDetail(Supplier):
    materials: List['SupplierMaterial'] = []
    
    class Config:
        from_attributes = True


# SupplierMaterial Schemas
class SupplierMaterialBase(BaseModel):
    supplier_id: int
    material_id: Optional[int] = None # Optional link to internal stock
    name: Optional[str] = None
    essence: Optional[str] = None
    product_type: Optional[str] = None
    treatment: Optional[str] = None
    certification: Optional[str] = None
    devis_necessaire: bool = False
    group_name: Optional[str] = None # e.g. "Avivés Hêtre"
    reference: Optional[str] = None
    price: float = Field(default=0.0, ge=0)
    price_type: str = Field(default="unit", pattern="^(m2|m3|unit)$")
    width: Optional[float] = None
    height: Optional[float] = None
    thickness: Optional[float] = None
    stock_quantity: int = 0
    is_archived: bool = False

class SupplierMaterialCreate(SupplierMaterialBase):
    pass

class SupplierMaterialUpdate(BaseModel):
    material_id: Optional[int] = None
    name: Optional[str] = None
    essence: Optional[str] = None
    product_type: Optional[str] = None
    treatment: Optional[str] = None
    certification: Optional[str] = None
    devis_necessaire: Optional[bool] = None
    group_name: Optional[str] = None
    reference: Optional[str] = None
    price: Optional[float] = None
    price_type: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    thickness: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_archived: Optional[bool] = None

class PriceHistory(BaseModel):
    id: int
    price: float
    timestamp: datetime
    
    class Config:
        from_attributes = True

class SupplierMaterial(SupplierMaterialBase):
    id: int
    updated_at: datetime
    created_at: datetime
    price_history: List[PriceHistory] = []
    
    class Config:
        from_attributes = True
