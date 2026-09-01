from __future__ import annotations
import os
import json
import time
import sys
from pathlib import Path

from fastapi import FastAPI, Request, Depends, BackgroundTasks
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import uvicorn

# Add Services directory to sys.path to allow importing IA_Engine and others
current_dir = Path(__file__).resolve().parent  # app/
bin_dir = current_dir.parent  # Bin/
system_dir = bin_dir.parent  # System/
backend_dir = system_dir.parent  # Backend/
services_dir = backend_dir / "Services"

if str(services_dir) not in sys.path:
    sys.path.append(str(services_dir))

# Import database configuration
from .db.database import engine, Base, SQLALCHEMY_DATABASE_URL
from .dependencies import get_current_user

# Import all API routers
from .routers import (
    projects, materials, optimize, stock, clients, 
    suppliers, hardware, ai, step_import, stats,
    exports, backups, qr, quotes, scraping, orders, templates, files, management, auth, users, settings
)

# Import professional monitoring system
from .monitoring_client import log_info, log_error


def _ensure_part_geometry_columns():
    """Ajoute les colonnes géométriques à la table parts si absentes (sans casser SQLite)."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Check existing columns
            res = conn.execute(text("PRAGMA table_info(parts)")).fetchall()
            existing_cols = {row[1] for row in res}
            
            new_cols = [
                ("thickness_confidence", "FLOAT"),
                ("shape_type", "VARCHAR"),
                ("contour_2d_json", "TEXT"),
                ("machining_features_json", "TEXT"),
                ("extraction_warnings_json", "TEXT"),
            ]
            
            for col_name, col_type in new_cols:
                if existing_cols and col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE parts ADD COLUMN {col_name} {col_type}"))
                    print(f"[DB MIGRATION] Colonne '{col_name}' ajoutée à 'parts'.")
            conn.commit()
    except Exception as err:
        print(f"[DB MIGRATION WARN] Vérification colonnes parts : {err}")


def run_db_migrations():
    """
    Ensure database tables exist on startup.
    
    Alembic `upgrade head` is intentionally NOT called here — it blocks the
    server startup on SQLite (batch_alter_table locks the DB for every boot).
    
    Run migrations manually when needed:
        cd Moteur/Backend/System/Bin
        alembic upgrade head
    
    On first-ever run (empty DB), create_all handles table creation as fallback.
    """
    try:
        # Fast, non-blocking: only creates tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        _ensure_part_geometry_columns()
        print("[OK] Tables DB et colonnes géométriques vérifiées/créées via SQLAlchemy.")
    except Exception as e:
        print(f"[DB ERROR] Impossible de verifier/creer les tables : {e}")
        log_error("Database", "Startup", f"Erreur initialisation tables: {e}", e)



# NOTE: run_db_migrations() is called in startup_event() below,
# not at module-level, to avoid SQLite connection conflicts during import.

# Initialize FastAPI Application
app = FastAPI(
    title="OptiCut Pro API",
    description="Système expert d'optimisation de menuiserie avec monitoring technique déporté.",
    version="4.2.0"
)

# CORS configuration
# En mode .exe : le frontend est servi par uvicorn sur le port 8000 lui-même.
# Les origines dev (5173, 3000) sont conservées pour ne pas casser le workflow de développement.
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    allow_origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

for required_origin in ["http://localhost:8000", "http://127.0.0.1:8000"]:
    if required_origin not in allow_origins:
        allow_origins.append(required_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# 1. Public Routers
app.include_router(auth.router, prefix="/api", tags=["auth"])

# 2. Protected Routers (Require valid JWT Bearer authentication)
app.include_router(projects.router, prefix="/api/projects", tags=["Projets"], dependencies=[Depends(get_current_user)])
app.include_router(materials.router, prefix="/api/materials", tags=["Matériaux"], dependencies=[Depends(get_current_user)])
app.include_router(optimize.router, prefix="/api/optimize", tags=["Optimisation"], dependencies=[Depends(get_current_user)])
app.include_router(stock.router, prefix="/api/stock", tags=["Stock & Chutes"], dependencies=[Depends(get_current_user)])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"], dependencies=[Depends(get_current_user)])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Fournisseurs"], dependencies=[Depends(get_current_user)])
app.include_router(hardware.router, prefix="/api/hardware", tags=["Quincaillerie"], dependencies=[Depends(get_current_user)])
app.include_router(ai.router, prefix="/api/ai", tags=["Intelligence Artificielle"], dependencies=[Depends(get_current_user)])
app.include_router(step_import.router, prefix="/api/step", tags=["Import STEP/3D"], dependencies=[Depends(get_current_user)])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistiques"], dependencies=[Depends(get_current_user)])
app.include_router(backups.router, prefix="/api/backups", tags=["Sauvegardes"], dependencies=[Depends(get_current_user)])
app.include_router(qr.router, prefix="/api/qr", tags=["Codes QR"], dependencies=[Depends(get_current_user)])
app.include_router(quotes.router, prefix="/api/quotes", tags=["Devis"], dependencies=[Depends(get_current_user)])
app.include_router(scraping.router, prefix="/api/scraping", tags=["Web Scraping"], dependencies=[Depends(get_current_user)])
app.include_router(orders.router, prefix="/api/orders", tags=["Commandes"], dependencies=[Depends(get_current_user)])
app.include_router(templates.router, prefix="/api/templates", tags=["Modèles"], dependencies=[Depends(get_current_user)])
app.include_router(exports.router, prefix="/api/exports", tags=["Exports"], dependencies=[Depends(get_current_user)])
app.include_router(files.router, prefix="/api/file-explorer", tags=["Explorateur Fichiers"], dependencies=[Depends(get_current_user)])
app.include_router(management.router, prefix="/api/management", tags=["management"], dependencies=[Depends(get_current_user)])
app.include_router(settings.router, prefix="/api/settings", tags=["Paramètres"], dependencies=[Depends(get_current_user)])
app.include_router(users.router, prefix="/api", tags=["users"], dependencies=[Depends(get_current_user)])


@app.on_event("startup")
async def startup_event():
    """Triggered when the backend starts."""
    from .db.database import db_path

    # Run Alembic migrations here (not at module-level) to avoid SQLite
    # connection conflicts: the app engine is fully ready at this point.
    run_db_migrations()

    log_info("System", "Main", "🚀 OptiCut Pro Backend (V4.2) est opérationnel.")
    log_info("System", "Database", f"SQLite Engine initialisé. Fichier utilisé : {db_path}")

    # Ouvrir le navigateur automatiquement uniquement en mode exécutable packagé
    if getattr(sys, 'frozen', False):
        import threading, webbrowser
        def _open_browser():
            import time
            time.sleep(1.5)  # Laisser uvicorn démarrer
            webbrowser.open('http://localhost:8000')
        threading.Thread(target=_open_browser, daemon=True).start()

    try:
        import shapely
        log_info("Diagnostic", "Dependencies", f"Shapely v{getattr(shapely, '__version__', 'unknown')} détecté avec succès.")
    except ImportError as e:
        log_error("Diagnostic", "Dependencies", f"ERREUR CRITIQUE: Shapely introuvable. Moteur 'Massif' indisponible. ({e})")


@app.get("/api/status")
def status_check():
    """Detailed status & info check endpoint."""
    return {
        "status": "online", 
        "engine": "OptiCut Pro V4",
        "cors_origins": allow_origins,
        "monitoring": "active (port 9999)"
    }


@app.api_route("/api/shutdown", methods=["GET", "POST"])
def api_shutdown(background_tasks: BackgroundTasks):
    """
    Clean shutdown endpoint triggered by STOP_OPTICUT.bat.
    """
    log_info("System", "Shutdown", "Arrêt demandé via /api/shutdown.")
    
    def delayed_exit():
        time.sleep(1.0)
        os._exit(0)
        
    background_tasks.add_task(delayed_exit)
    return {"status": "shutting_down", "message": "Arrêt propre du serveur en cours..."}


# Serve React Frontend
# En mode .exe : le dist est empaqueté dans sys._MEIPASS/frontend_dist/
# En mode dév   : le dist est dans Moteur/Frontend/dist/ (généré par npm run build)
if getattr(sys, 'frozen', False):
    frontend_dist = Path(sys._MEIPASS) / 'frontend_dist'  # type: ignore[attr-defined]
else:
    frontend_dist = backend_dir.parent / 'Frontend' / 'dist'

if frontend_dist.exists() and frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    def frontend_not_found():
        return {"error": "Frontend build not found. Please run 'npm run build' in the Frontend directory."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
