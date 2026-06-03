from pydantic import BaseModel
from typing import Optional

class ScrapeRequest(BaseModel):
    url: str
    max_pages: int = 5

class ScrapedProduct(BaseModel):
    name: str
    price: Optional[float] = None
    dimensions: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    group_name: Optional[str] = None
    essence: Optional[str] = None
    product_type: Optional[str] = None
    treatment: Optional[str] = None
    certification: Optional[str] = None
    devis_necessaire: bool = False
    is_new: bool = True
    price_changed: bool = False
    old_price: Optional[float] = None
