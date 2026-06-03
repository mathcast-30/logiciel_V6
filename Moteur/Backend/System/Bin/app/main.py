from __future__ import annotations
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import json
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import time
import uvicorn
import sys
from pathlib import Path

# Add Services directory to sys.path to allow importing IA_Engine and others
current_dir = Path(__file__).resolve().parent # app/
bin_dir = current_dir.parent # Bin/
system_dir = bin_dir.parent # System/
backend_dir = system_dir.parent # Backend/
services_dir = backend_dir / "Services"

if str(services_dir) not in sys.path:
    sys.path.append(str(services_dir))

# Import database configuration
from .db.database import engine, Base

# Import all API routers
from .routers import (
    projects, materials, optimize, stock, clients, 
    suppliers, hardware, ai, step_import, stats,
    exports, backups, qr, quotes, scraping, orders, templates
)

# Import professional monitoring system
from .monitoring_client import log_info, log_error

# Automatically create database tables (Safe for SQLite)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    # We log via local print if server is not yet ready, 
    # but monitoring_client is designed to be safe.
    print(f"[DB ERROR] Table creation failed: {e}")

# Initialize FastAPI Application
app = FastAPI(
    title="OptiCut Pro API",
    description="Système expert d'optimisation de menuiserie avec monitoring technique déporté.",
    version="4.1.0"
)

# CORS configuration for Frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Professional Monitoring Middleware
# Intercepts every request and sends telemetry to the sidecar terminal

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
    except Exception:
        body_str = "Could not decode body"
    
    error_msg = f"Validation Error on {request.url.path}: {exc.errors()}\nBody: {body_str}"
    print(f"\n[CRITICAL] Pydantic Validation Error: \n{error_msg}\n")
    log_error("FastAPI", "Validation", error_msg, exc)
    
    # Needs to be JSON serializable
    safe_errors = json.loads(json.dumps(exc.errors(), default=lambda x: str(x)))
    
    return JSONResponse(
        status_code=422,
        content={"detail": safe_errors, "message": "Erreur de validation des données JSON (Backend)"}
    )

@app.middleware("http")
async def monitoring_middleware(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    method = request.method
    
    # Process request
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        log_error("API", method, f"Critical failure on {path}: {e}", e)
        raise
    
    # Calculate performance metric
    process_time = (time.time() - start_time) * 1000
    
    # Send log to sidecar (non-blocking)
    msg = f"{method} {path} -> {status_code} ({process_time:.2f}ms)"
    if status_code >= 400:
        log_error("HTTP", path, msg)
    else:
        log_info("API", method, msg)
        
    return response

# Static Files Serving (Cutting plans, PDFs, Labels)
from .db.database import OPTIMIZATIONS_DIR
app.mount("/api/files", StaticFiles(directory=str(OPTIMIZATIONS_DIR)), name="exports")

# Plugin all functional modules (Routers)
app.include_router(projects.router, prefix="/api/projects", tags=["Projets"])
app.include_router(materials.router, prefix="/api/materials", tags=["Matériaux"])
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimisation"])
app.include_router(stock.router, prefix="/api/stock", tags=["Stock & Chutes"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Fournisseurs"])
app.include_router(hardware.router, prefix="/api/hardware", tags=["Quincaillerie"])
app.include_router(ai.router, prefix="/api/ai", tags=["Intelligence Artificielle"])
app.include_router(step_import.router, prefix="/api/step", tags=["Import STEP/3D"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistiques"])
app.include_router(backups.router, prefix="/api/backups", tags=["Sauvegardes"])
app.include_router(qr.router, prefix="/api/qr", tags=["Codes QR"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["Devis"])
app.include_router(scraping.router, prefix="/api/scraping", tags=["Web Scraping"])
app.include_router(orders.router, prefix="/api/orders", tags=["Commandes"])
app.include_router(templates.router, prefix="/api/templates", tags=["Modèles"])
app.include_router(exports.router, prefix="/api/exports", tags=["Exports"])

@app.on_event("startup")
async def startup_event():
    """Triggered when the backend starts."""
    import sys
    
    log_info("System", "Main", "🚀 OptiCut Pro Backend (V4.1) est opérationnel.")
    log_info("System", "Database", f"SQLite Engine initialisé.")
    
    # --- DIAGNOSTIC ENVIRONNEMENT ---
    log_info("Diagnostic", "Python", f"Executable: {sys.executable}")
    log_info("Diagnostic", "Path", f"sys.path: {json.dumps(sys.path, indent=2)}")
    
    try:
        import shapely
        log_info("Diagnostic", "Dependencies", f"Shapely v{getattr(shapely, '__version__', 'unknown')} détecté avec succès.")
    except ImportError as e:
        log_error("Diagnostic", "Dependencies", f"ERREUR CRITIQUE: Shapely introuvable. Moteur 'Massif' indisponible. ({e})")
    # --------------------------------

@app.get("/")
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "online", 
        "engine": "OptiCut Pro V4",
        "monitoring": "active (port 9999)"
    }

if __name__ == "__main__":
    # Local execution support
    uvicorn.run(app, host="0.0.0.0", port=8000)
