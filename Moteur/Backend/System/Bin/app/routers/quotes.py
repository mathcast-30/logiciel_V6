from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime
from app.db.database import get_db
from app.models import Quote, QuoteItem, Client, Project, Material, Order, OrderItem, OrderStatus, Supplier
from app.schemas import QuoteCreate, Quote as QuoteSchema
from app.schemas import orders as order_schemas
from IA_Engine.quotes import QuoteGenerator

router = APIRouter()

@router.post("/", response_model=QuoteSchema)
def create_quote(quote: QuoteCreate, db: Session = Depends(get_db)):
    """Create a new quote and generate PDF."""
    
    # Verify client exists
    client = db.query(Client).filter(Client.id == quote.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    project = None
    if quote.project_id:
        project = db.query(Project).filter(Project.id == quote.project_id).first()

    # Generate Quote Number (Simple logic: Year-Count)
    year = datetime.now().year
    count = db.query(Quote).filter(Quote.date >= datetime(year, 1, 1)).count() + 1
    number = f"D-{year}-{count:03d}"
    
    # Calculate totals
    total_ht = sum(item.quantity * item.unit_price for item in quote.items)
    total_ttc = total_ht * (1 + quote.tva_rate / 100)
    
    # Create Quote Record
    db_quote = Quote(
        number=number,
        client_id=quote.client_id,
        project_id=quote.project_id,
        description=quote.description,
        notes=quote.notes,
        valid_until=quote.valid_until,
        tva_rate=quote.tva_rate,
        total_ht=total_ht,
        total_ttc=total_ttc,
        status="draft"
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    
    # Create Items
    quote_items = []
    for item in quote.items:
        db_item = QuoteItem(
            quote_id=db_quote.id,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            total=item.quantity * item.unit_price
        )
        db.add(db_item)
        quote_items.append(db_item)
    
    db.commit()
    db.refresh(db_quote)
    
    # Generate PDF
    try:
        generator = QuoteGenerator()
        pdf_path = generator.generate(db_quote, client, project, quote_items)
        db_quote.pdf_path = pdf_path
        db_quote.status = "sent" # or 'generated'
        db.commit()
    except Exception as e:
        print(f"PDF Generation Error: {e}")
        # Don't fail the request, but log error
    
    return db_quote

@router.get("/", response_model=List[QuoteSchema])
def list_quotes(db: Session = Depends(get_db)):
    """List all quotes."""
    return db.query(Quote).order_by(Quote.date.desc()).all()

@router.get("/{quote_id}", response_model=QuoteSchema)
def get_quote(quote_id: int, db: Session = Depends(get_db)):
    """Get a specific quote."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote

@router.patch("/{quote_id}/status", response_model=QuoteSchema)
def update_quote_status(quote_id: int, status: str, db: Session = Depends(get_db)):
    """Update quote status."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    valid_statuses = ["draft", "sent", "accepted", "rejected", "invoiced"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    quote.status = status
    db.commit()
    db.refresh(quote)
    return quote

@router.delete("/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    """Delete a quote."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    db.delete(quote)
    db.commit()
    return {"success": True}

@router.post("/{quote_id}/convert-to-order", response_model=order_schemas.Order)
def convert_quote_to_order(
    quote_id: int,
    supplier_id: Optional[int] = Query(None, description="ID fournisseur (optionnel, prend le premier disponible sinon)"),
    db: Session = Depends(get_db)
):
    """
    Convertit un devis accepté en commande fournisseur.

    - Le devis doit avoir le statut 'accepted'.
    - Chaque ligne de devis dont la description correspond à un matériau en base
      devient une OrderItem.
    - Les lignes sans correspondance matériau sont ignorées (non bloquantes).
    - La commande est liée au devis via quote_id.
    """
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    if quote.status not in ("accepted", "invoiced"):
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de convertir un devis au statut '{quote.status}'. Le devis doit être 'accepted'."
        )

    # Determine supplier: use provided id or fall back to first available
    if supplier_id:
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    else:
        supplier = db.query(Supplier).first()
        if not supplier:
            raise HTTPException(
                status_code=400,
                detail="Aucun fournisseur en base — créez-en un d'abord avant de convertir."
            )

    # Map quote items to order items via material name lookup
    order_items_data = []
    total_cost = 0.0

    for qi in quote.items:
        # Try to match by material name (case-insensitive contains)
        material = db.query(Material).filter(
            Material.name.ilike(f"%{qi.description}%")
        ).first()

        if material is None:
            # Try reverse: description contains material name
            all_mats = db.query(Material).all()
            for m in all_mats:
                if m.name.lower() in qi.description.lower():
                    material = m
                    break

        if material is None:
            # Skip unmatched lines (e.g. "Main d'œuvre")
            continue

        line_total = qi.quantity * qi.unit_price
        total_cost += line_total
        order_items_data.append(OrderItem(
            material_id=material.id,
            quantity=qi.quantity,
            unit_price=qi.unit_price,
            reference=material.supplier_ref
        ))

    # Create the order
    db_order = Order(
        supplier_id=supplier.id,
        quote_id=quote.id,
        status=OrderStatus.DRAFT,
        total_cost=total_cost,
        notes=f"Généré depuis devis {quote.number}"
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    for item in order_items_data:
        item.order_id = db_order.id
        db.add(item)

    db.commit()
    db.refresh(db_order)

    # Enrich response
    if db_order.supplier:
        db_order.supplier_name = db_order.supplier.name
    for item in db_order.items:
        if item.material:
            item.material_name = item.material.name

    return db_order

