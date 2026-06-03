from __future__ import annotations

import asyncio
import aiohttp
from bs4 import BeautifulSoup
import re
import json
import random
from urllib.parse import urljoin, urlparse
from typing import Optional, List, Set, Dict, Any, Generator
from sqlalchemy.orm import Session
from app.models import SupplierMaterial, Supplier, PriceHistory
from app.schemas.scraping import ScrapedProduct
from Scraping_Engine.scraping_utils import clean_price, extract_dimensions_from_text, \
    extract_wood_type, extract_cut_type, extract_treatment, extract_certification, should_exclude_product, matches_keywords, detect_anomalies

class ScrapingService:
    def __init__(self, db: Session):
        self.db = db
        self.headers_list = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
        ]
        self.proxies = [] # User can fill this list: ["http://user:pass@host:port", ...]

    def get_random_headers(self):
        return {
            'User-Agent': random.choice(self.headers_list),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }

    def get_random_proxy(self):
        return random.choice(self.proxies) if self.proxies else None

    async def fetch_page(self, session: aiohttp.ClientSession, url: str, semaphore: asyncio.Semaphore):
        async with semaphore:
            proxy = self.get_random_proxy()
            try:
                # Randomized delay 3-5s to avoid patterns
                await asyncio.sleep(random.uniform(3.0, 5.0))
                
                kwargs = {'headers': self.get_random_headers(), 'timeout': 20, 'ssl': False}
                if proxy: kwargs['proxy'] = proxy

                async with session.get(url, **kwargs) as response:
                    if response.status == 200:
                        return await response.text(), response.url
                    elif response.status == 403:
                        print(f"Access Forbidden (WAF/Blocking) on {url}")
                    return None, None
            except Exception as e:
                print(f"Error fetching {url}: {e}")
                return None, None

    def get_existing_catalog(self, domain: str) -> Dict[str, SupplierMaterial]:
        """Returns a map of existing products for this domain/supplier by URL."""
        # Find supplier by website containing domain
        supplier = self.db.query(Supplier).filter(Supplier.website.contains(domain)).first()
        if not supplier:
            return {}
        
        existing = self.db.query(SupplierMaterial).filter(SupplierMaterial.supplier_id == supplier.id).all()
        return {item.reference: item for item in existing if item.reference}

    def extract_products(self, html: str, base_url: str, existing_catalog: Dict[str, SupplierMaterial]):
        soup = BeautifulSoup(html, 'html.parser')
        raw_products = []
        
        # Heuristic to find product blocks
        product_cards = soup.find_all(class_=re.compile(r'(product|item|card|article|listing|tile)', re.I))
        if len(product_cards) < 2:
            candidates = soup.find_all(['li', 'div', 'article'])
            product_cards = [c for c in candidates if 100 < len(c.text) < 3000 and c.find('img') and c.find('a')]

        for card in product_cards:
            # Name detection
            name = None
            link = card.find('a', href=True)
            if link and link.get_text(strip=True):
                name = link.get_text(strip=True)
            else:
                header = card.find(['h2', 'h3', 'h4', 'h5'])
                if header: name = header.get_text(strip=True)
            
            if not name or len(name) < 3: continue
            name = re.sub(r'\s+', ' ', name).strip()
            
            # Context for better extraction
            full_context = name
            desc_elem = card.find(class_=re.compile(r'(desc|info|spec|summary)', re.I))
            if desc_elem: full_context += " " + desc_elem.get_text(strip=True)
            
            # Exclusion check (bois de chauffage, etc.)
            if should_exclude_product(name, full_context):
                continue

            # STRICT KEYWORD FILTERING
            if not matches_keywords(name, full_context):
                continue
            
            # Price & Devis detection
            price_text = ""
            price_elem = card.find(string=re.compile(r'(\d+[.,]\d{2}\s?€|sur devis|devis nécessaire|sur demande)', re.I))
            if not price_elem:
                 price_elem = card.find(class_=re.compile(r'price', re.I))
            if price_elem:
                price_text = price_elem.get_text(strip=True) if hasattr(price_elem, 'get_text') else str(price_elem)
            
            devis_necessaire = any(x in price_text.lower() for x in ["sur devis", "devis nécessaire", "sur demande", "sur dev"])
            price = clean_price(price_text)
            
            # If no price AND no devis text, but it's a valid card, it's likely devis-based
            if not price and not devis_necessaire:
                devis_necessaire = True
                price = 0.0
            
            dim_result = extract_dimensions_from_text(full_context)
            dimensions = dim_result['formatted'] if isinstance(dim_result, dict) else dim_result
            
            wood_type = extract_wood_type(full_context)
            cut_type = extract_cut_type(full_context)
            treatment = extract_treatment(full_context)
            certification = extract_certification(full_context)
            
            product_url = urljoin(base_url, link.get('href')) if link and link.get('href') else base_url
            
            # Check for existing
            is_new = True
            price_changed = False
            old_price = None
            
            if product_url in existing_catalog:
                is_new = False
                existing_item = existing_catalog[product_url]
                if price and existing_item.price != price:
                    price_changed = True
                    old_price = existing_item.price

            # Basic validation
            img = card.find('img')
            img_url = urljoin(base_url, img.get('src') or img.get('data-src') or "") if img else None
            
            raw_products.append(ScrapedProduct(
                name=name, price=price if price else 0.0, url=product_url, image_url=img_url,
                dimensions=dimensions, category=" ".join(filter(None, [cut_type, wood_type])) or "Divers",
                group_name=wood_type or "Divers", essence=wood_type, product_type=cut_type,
                treatment=treatment, certification=certification, devis_necessaire=devis_necessaire,
                is_new=is_new, price_changed=price_changed, old_price=old_price
            ).dict())
        return raw_products

    async def update_product_price(self, offer_id: int):
        """Fetches the current price for a specific offer by its URL."""
        offer = self.db.query(SupplierMaterial).filter(SupplierMaterial.id == offer_id).first()
        if not offer or not offer.reference: # reference field stores the URL
            return None
            
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(1)
            html, final_url = await self.fetch_page(session, offer.reference, semaphore)
            if not html: return None
            
            # Simple extraction for single page
            soup = BeautifulSoup(html, 'html.parser')
            # Look for price in product-like blocks or throughout the page
            # We can reuse the extraction logic but we need to stay focused on this product
            # For simplicity, we search for the price that looks most like a price
            price_elem = soup.find(string=re.compile(r'(\d+[.,]\d{2}\s?€)', re.I))
            if not price_elem:
                 price_elem = soup.find(class_=re.compile(r'price', re.I))
            
            if price_elem:
                price_text = price_elem.get_text(strip=True) if hasattr(price_elem, 'get_text') else str(price_elem)
                new_price = clean_price(price_text)
                if new_price and new_price != offer.price:
                    # Record history
                    history = PriceHistory(supplier_material_id=offer.id, price=offer.price)
                    self.db.add(history)
                    offer.price = new_price
                    self.db.commit()
                    return new_price
        return offer.price

    async def crawl_site(self, start_url: str, max_pages: int):
        domain = urlparse(start_url).netloc
        existing_catalog = self.get_existing_catalog(domain)
        visited_urls: Set[str] = set()
        to_visit: List[tuple] = [(start_url, 0)] # (url, priority)
        seen_product_urls = set()
        all_found_products = []
        
        semaphore = asyncio.Semaphore(5)
        pages_scanned = 0
        
        yield json.dumps({"type": "start", "msg": f"Exploration optimisée de {domain}..."}) + "\n"
        
        async with aiohttp.ClientSession() as session:
            while to_visit and pages_scanned < max_pages:
                # Sort by priority (lower is better/higher priority)
                to_visit.sort(key=lambda x: x[1])
                current_url, priority = to_visit.pop(0)
                
                if current_url in visited_urls: continue
                visited_urls.add(current_url)
                pages_scanned += 1
                
                yield json.dumps({"type": "progress", "msg": f"Analyse page {pages_scanned}/{max_pages}: {current_url}", "page_count": pages_scanned}) + "\n"
                
                html, final_url = await self.fetch_page(session, current_url, semaphore)
                if not html: continue
                
                page_products = self.extract_products(html, str(final_url), existing_catalog)
                
                new_found = []
                for p in page_products:
                    if p['url'] not in seen_product_urls:
                        new_found.append(p)
                        seen_product_urls.add(p['url'])
                        all_found_products.append(p)
                
                if new_found:
                    yield json.dumps({"type": "products", "products": new_found}) + "\n"
                
                # Extract links for BFS
                if pages_scanned < max_pages:
                    soup = BeautifulSoup(html, 'html.parser')
                    for a_tag in soup.find_all('a', href=True):
                        full_link = urljoin(str(final_url), a_tag['href'])
                        parsed_link = urlparse(full_link)
                        
                        if parsed_link.netloc == domain and full_link not in visited_urls:
                            # Skip common non-product pages
                            if any(x in full_link.lower() for x in ['login', 'cart', 'account', 'contact', 'legal', 'cgv', 'facebook', 'twitter', 'instagram']):
                                continue
                            
                            link_text = a_tag.get_text().lower()
                            score = 10
                            # Keywords prioritization
                            high_prio = [
                                'bois', 'panneau', 'menuiserie', 'charpente', 'lame', 'terrasse', 
                                'bardage', 'parquet', 'essence', 'hetre', 'chene', 'sapin', 
                                'poutre', 'planche', 'solive', 'chevron', 'mdf', 'osb', 'contreplaqué',
                                'lambris', 'moulure', 'plinthe', 'produit', 'shop', 'boutique',
                                'scierie', 'négociant', 'grossiste', 'rabotage',
                                'chêne', 'hêtre', 'frêne', 'noyer', 'merisier', 'acajou',
                                'châtaignier', 'peuplier', 'tilleul', 'érable', 'bouleau',
                                'teck', 'iroko', 'wengé', 'okoumé', 'douglas', 'mélèze',
                                'cèdre', 'épicéa', 'ipé', 'cumaru', 'padouk', 'bubinga', 'zebrano'
                            ]
                            if any(k in full_link.lower() or k in link_text for k in high_prio):
                                score = 1
                            elif any(k in full_link.lower() for k in ['page=', 'p=']): # pagination
                                score = 2
                                
                            to_visit.append((full_link, score))
                            # Limit queue size to avoid memory bloat
                            if len(to_visit) > 5000: to_visit = to_visit[:5000]

        # Run anomaly detection on all found products
        analyzed_products = detect_anomalies(all_found_products)
        
        yield json.dumps({
            "type": "complete", 
            "total_pages": pages_scanned, 
            "total_products": len(seen_product_urls),
            "analyzed_products": analyzed_products
        }) + "\n"
