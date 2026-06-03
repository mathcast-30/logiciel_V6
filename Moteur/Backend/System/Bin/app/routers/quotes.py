from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
from datetime import datetime
from app.db.database import get_db
from app.models import Quote, QuoteItem, Client, Project, Material
from app.schemas import QuoteCreate, Quote as QuoteSchema
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
