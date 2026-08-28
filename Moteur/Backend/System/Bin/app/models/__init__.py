"""Database models for OptiCut Pro."""

from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.database import Base


class PriceType(str, enum.Enum):
    """Type de tarification pour les matériaux."""
    M2 = "m2"  # Prix au mètre carré
    M3 = "m3"  # Prix au mètre cube
    UNIT = "unit"  # Prix à l'unité/planche


class QuoteStatus(str, enum.Enum):
    """Statut d'un devis."""
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class OrderStatus(str, enum.Enum):
    """Statut d'une commande fournisseur."""
    DRAFT = "draft"
    ORDERED = "ordered"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class GrainDirection(int, enum.Enum):
    """Direction du fil du bois."""
    NONE = 0
    HORIZONTAL = 1
    VERTICAL = 2


class EdgeBand(Base):
    """Edge banding material definition."""
    __tablename__ = "edge_bands"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)  # ex: "PVC Blanc 2mm"
    thickness: Mapped[float] = mapped_column(Float, nullable=False)  # in mm
    cost_per_m: Mapped[float] = mapped_column(Float, default=0.0)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Client(Base):
    """Client/Customer definition."""
    __tablename__ = "clients"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    projects: Mapped[list[Project]] = relationship("Project", back_populates="client", cascade="all, delete-orphan")
    quotes: Mapped[list[Quote]] = relationship("Quote", back_populates="client", cascade="all, delete-orphan")


class Material(Base):
    """Material/Panel type definition."""
    __tablename__ = "materials"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    thickness: Mapped[float] = mapped_column(Float, nullable=False)  # in mm
    cost_per_sqm: Mapped[float] = mapped_column(Float, default=0.0)  # Prix de base (compatibilité)
    price_type: Mapped[str] = mapped_column(String, default="m2")  # m2, m3, unit
    is_panel: Mapped[bool] = mapped_column(Boolean, default=True)  # True = Panneau, False = Massif
    species: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Wood species: 'chene', 'hetre', 'sapin', etc.
    supplier_ref: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Référence fournisseur
    has_grain: Mapped[bool] = mapped_column(Boolean, default=False)  # Grain direction matters
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    stock_items: Mapped[list[Stock]] = relationship("Stock", back_populates="material", cascade="all, delete-orphan")
    supplier_offers: Mapped[list[SupplierMaterial]] = relationship("SupplierMaterial", back_populates="material", cascade="all, delete-orphan")


class Supplier(Base):
    """Fournisseur de matériaux."""
    __tablename__ = "suppliers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    delivery_delay_days: Mapped[int] = mapped_column(Integer, default=7)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    materials: Mapped[list[SupplierMaterial]] = relationship("SupplierMaterial", back_populates="supplier", cascade="all, delete-orphan")


class SupplierMaterial(Base):
    """Offre d'un fournisseur pour un matériau (Prix, Réf)."""
    __tablename__ = "supplier_materials"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"))
    material_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("materials.id"), nullable=True) # Optional link to internal stock
    
    # Information
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Display name from supplier/scraping
    
    # Hierarchical Organization
    group_name: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True) # e.g. "Avivés Hêtre"
    essence: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True) # e.g. "Chêne", "Hêtre"
    product_type: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True) # e.g. "Planche", "Poutre"
    treatment: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g. "Raboté"
    certification: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g. "FSC", "PEFC"
    devis_necessaire: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Specific details
    price: Mapped[float] = mapped_column(Float, nullable=False)
    price_type: Mapped[str] = mapped_column(String, default="unit")  # unit, m2, m3
    reference: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    
    # Dimensions if applicable
    width: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    thickness: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="materials")
    material: Mapped[Optional[Material]] = relationship("Material", back_populates="supplier_offers")
    price_history: Mapped[list[PriceHistory]] = relationship("PriceHistory", back_populates="supplier_material", cascade="all, delete-orphan")


class PriceHistory(Base):
    """Historique des prix pour un produit fournisseur."""
    __tablename__ = "price_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    supplier_material_id: Mapped[int] = mapped_column(Integer, ForeignKey("supplier_materials.id"))
    price: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    supplier_material: Mapped[SupplierMaterial] = relationship("SupplierMaterial", back_populates="price_history")


class Order(Base):
    """Commande fournisseur."""
    __tablename__ = "orders"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.DRAFT)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    expected_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    supplier: Mapped[Supplier] = relationship("Supplier")
    items: Mapped[list[OrderItem]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Ligne de commande."""
    __tablename__ = "order_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"))
    material_id: Mapped[int] = mapped_column(Integer, ForeignKey("materials.id"))
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Relationships
    order: Mapped[Order] = relationship("Order", back_populates="items")
    material: Mapped[Material] = relationship("Material")


class Stock(Base):
    """Available stock panels."""
    __tablename__ = "stock"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    material_id: Mapped[int] = mapped_column(Integer, ForeignKey("materials.id"), nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False)  # in mm
    height: Mapped[float] = mapped_column(Float, nullable=False)  # in mm
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    is_offcut: Mapped[bool] = mapped_column(Boolean, default=False)  # Is this a reusable offcut?
    grain_direction: Mapped[int] = mapped_column(Integer, default=1)  # 1: Horizontal, 2: Vertical
    defects: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON: list of defect polygons
    label: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Optional label/identifier
    quality_score: Mapped[float] = mapped_column(Float, default=1.0)  # 0-1 score for remnant usefulness
    prix_unitaire: Mapped[float] = mapped_column(Float, default=0.0)
    unite_prix: Mapped[str] = mapped_column(String, default="m2")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    material: Mapped[Material] = relationship("Material", back_populates="stock_items")


class Project(Base):
    """Project containing parts to optimize."""
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("clients.id"), nullable=True)  # Optional client link
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft, validated, in_progress, done
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    steps_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    actual_cost: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0)
    actual_hours: Mapped[float] = mapped_column(Float, default=0.0)
    marge_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    prix_vente_manuel: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Relationships
    client: Mapped[Optional[Client]] = relationship("Client", back_populates="projects")
    parts: Mapped[list[Part]] = relationship("Part", back_populates="project", cascade="all, delete-orphan")
    optimizations: Mapped[list[OptimizationResult]] = relationship("OptimizationResult", back_populates="project", cascade="all, delete-orphan")
    quotes: Mapped[list[Quote]] = relationship("Quote", back_populates="project")
    step_models: Mapped[list[StepModel]] = relationship("StepModel", back_populates="project", cascade="all, delete-orphan")


class Part(Base):
    """Individual part/piece to cut."""
    __tablename__ = "parts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    material_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("materials.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False)  # in mm
    height: Mapped[float] = mapped_column(Float, nullable=False)  # in mm
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    allow_rotation: Mapped[bool] = mapped_column(Boolean, default=True)
    grain_direction: Mapped[int] = mapped_column(Integer, default=0)  # 0: None, 1: Horizontal, 2: Vertical
    priority: Mapped[int] = mapped_column(Integer, default=0)
    
    # Edge banding (link to EdgeBand model)
    edge_top_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("edge_bands.id"), nullable=True)
    edge_bottom_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("edge_bands.id"), nullable=True)
    edge_left_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("edge_bands.id"), nullable=True)
    edge_right_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("edge_bands.id"), nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # STEP Import tracking
    step_model_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("step_models.id"), nullable=True)
    auto_extracted: Mapped[bool] = mapped_column(Boolean, default=False)  # True if extracted from STEP
    extraction_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON OBB data
    
    # Relationships
    project: Mapped[Project] = relationship("Project", back_populates="parts")
    material: Mapped[Optional[Material]] = relationship("Material")
    step_model: Mapped[Optional[StepModel]] = relationship("StepModel", back_populates="extracted_parts", foreign_keys=[step_model_id])
    
    edge_top: Mapped[Optional[EdgeBand]] = relationship("EdgeBand", foreign_keys=[edge_top_id])
    edge_bottom: Mapped[Optional[EdgeBand]] = relationship("EdgeBand", foreign_keys=[edge_bottom_id])
    edge_left: Mapped[Optional[EdgeBand]] = relationship("EdgeBand", foreign_keys=[edge_left_id])
    edge_right: Mapped[Optional[EdgeBand]] = relationship("EdgeBand", foreign_keys=[edge_right_id])


class OptimizationResult(Base):
    """Saved optimization results."""
    __tablename__ = "optimization_results"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    kerf: Mapped[float] = mapped_column(Float, default=3.0)  # Blade thickness in mm
    trim_margin: Mapped[float] = mapped_column(Float, default=2.0)  # Sanding margin in mm
    safety_margin: Mapped[float] = mapped_column(Float, default=5.0)  # Safety margin between parts in mm
    total_panels_used: Mapped[int] = mapped_column(Integer)
    waste_percentage: Mapped[float] = mapped_column(Float)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)  # Coût total matière
    result_data: Mapped[str] = mapped_column(Text)  # JSON string of cutting plan
    k_metric: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Kenyon lower bound ratio
    solve_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_stock_area: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    file_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Path in UserData
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project: Mapped[Project] = relationship("Project", back_populates="optimizations")


class Quote(Base):
    """Devis/Quotation for a project."""
    __tablename__ = "quotes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # ex: "D-2024-001"
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("projects.id"), nullable=True)
    
    # Montants
    total_ht: Mapped[float] = mapped_column(Float, default=0.0)  # Hors taxes
    tva_rate: Mapped[float] = mapped_column(Float, default=20.0)  # Taux TVA
    total_ttc: Mapped[float] = mapped_column(Float, default=0.0)  # TTC
    
    # Détails
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Dates
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # État
    status: Mapped[str] = mapped_column(String, default="draft")  # draft, sent, accepted, rejected
    pdf_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Chemin vers le PDF archivé
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client: Mapped[Client] = relationship("Client", back_populates="quotes")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="quotes")
    items: Mapped[list[QuoteItem]] = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    """Ligne de devis."""
    __tablename__ = "quote_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quote_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotes.id"), nullable=False)
    
    description: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    unit: Mapped[str] = mapped_column(String, default="u")  # u, m2, m3, h (heure)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Relationships
    quote: Mapped[Quote] = relationship("Quote", back_populates="items")


class Template(Base):
    """Parametric template for cabinets, drawers, etc."""
    __tablename__ = "templates"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String, default="General") # Cabinet, Drawer, etc.
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Hardware(Base):
    """Hardware item definition (Quincaillerie)."""
    __tablename__ = "hardware"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, default="other") 
    cost_unit: Mapped[float] = mapped_column(Float, default=0.0)
    supplier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    product_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, default=10) # Alert threshold
    specs: Mapped[Optional[str]] = mapped_column(Text, nullable=True) 
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HardwareAssembly(Base):
    """Assembly Rule for Hardware."""
    __tablename__ = "hardware_assemblies"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False) 
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True) 
    items: Mapped[str] = mapped_column(Text, nullable=False) 
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StepModel(Base):
    """3D STEP file imported for a project."""
    __tablename__ = "step_models"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    filepath: Mapped[str] = mapped_column(String, nullable=False)
    file_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True) 
    import_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    file_metadata: Mapped[Optional[str]] = mapped_column("metadata", Text, nullable=True) 
    
    # Relationships
    project: Mapped[Project] = relationship("Project", back_populates="step_models")
    extracted_parts: Mapped[list[Part]] = relationship("Part", back_populates="step_model", foreign_keys="Part.step_model_id")


class User(Base):
    """User accounts and roles."""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nom: Mapped[str] = mapped_column(String, nullable=False)
    prenom: Mapped[str] = mapped_column(String, nullable=False)
    identifiant: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="operateur", nullable=False)
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_pwd: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    derniere_connexion: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    avatar_color: Mapped[Optional[str]] = mapped_column(String, default="#6C63FF", nullable=True)


class TarificationGlobale(Base):
    """Global pricing configuration singleton."""
    __tablename__ = "tarification_globale"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    taux_horaire: Mapped[float] = mapped_column(Float, default=35.0, nullable=False)
    marge_defaut_pct: Mapped[float] = mapped_column(Float, default=30.0, nullable=False)
    frais_generaux_pct: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)



