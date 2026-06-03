from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.scraping import ScrapeRequest, ScrapedProduct
from Scraping_Engine.scraping_service import ScrapingService

router = APIRouter(
    tags=["scraping"]
)

@router.post("/analyze")
async def crawl_site_endpoint(request: ScrapeRequest, db: Session = Depends(get_db)):
    service = ScrapingService(db)
    return StreamingResponse(
        service.crawl_site(request.url, request.max_pages),
        media_type="application/x-ndjson"
    )
