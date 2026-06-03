# AI Agent Copilot Instructions - OptiCut Pro V4

**Project**: OptiCut Pro - Professional woodworking/cutting optimization & stock management desktop app
**Stack**: React 18 + TypeScript + Vite | Python FastAPI | SQLite
**Architecture**: Desktop (Frontend) → REST API (Backend) → Database

## Quick Architecture

- **Frontend** (`Moteur/Frontend`): React SPA with Vite, TailwindCSS, context-based state (ThemeContext)
- **Backend** (`Moteur/Backend/System/Bin/app`): FastAPI with routers for each domain (projects, materials, optimize, etc.)
- **Database**: SQLite at `Moteur/UserData/BaseDeDonnees/opticut.db` with Client→Project→Parts hierarchy
- **Services**: Python modules in `Moteur/Backend/Services/` (IA_Engine, Scraping_Engine, etc.)
- **Launcher**: `LANCER_LOGICIEL.bat` or `System_Scripts/OPTICUT_PRO.bat` - starts backend (port 8000) + frontend (port 5173)

## Core Patterns

### Frontend State & UI
- **ThemeContext** (`src/context/ThemeContext.tsx`): Manages light/dark theme + custom color palettes. Colors stored in `localStorage` under `opticut-ui-colors` key. CSS variables injected via `--color-{name}`.
- **Page Structure**: Each page imports services (e.g., `projectService`, `optimizeService`) and manages local state; Sidebar navigation via React Router.
- **Component Organization**: Settings components in `src/components/Settings/` (ColorCustomizer, PresetSelector, etc.); reusable UI in `src/components/UI/`.

### Backend API Design
- **Main Entry**: `Moteur/Backend/System/Bin/app/main.py` - FastAPI app with CORS for localhost:5173 and mobile.
- **Router Pattern**: Each feature has dedicated router module (e.g., `app.routers.projects`, `app.routers.optimize`). Routers imported and auto-mounted in main.py.
- **Database**: SQLAlchemy ORM with models in `app.db.database`. Client→Project relationship enforced via foreign keys.
- **CORS**: Allows origin `*` for dev; adjust in production.

### Data Layer
- **DB Schema**: Clients table → Projects (client_id FK) → STEP_Models & Parts (project_id FK). Materials catalog separate.
- **Path Convention**: Data stored at `Moteur/UserData/` (user isolation). Exports in `Data/Exports/`, backups in `Data/Storage/`.
- **STEP Parser**: `app.core.step_parser.StepExtractor` (pythonocc-core dependency) extracts geometry from STEP files; routed via `step_import` endpoint.

## Developer Workflows

### Local Development
1. **Backend**: Run `conda activate opticut_pro` then `uvicorn app.main:app --reload` from `Moteur/Backend/System/Bin/`.
2. **Frontend**: `npm run dev` from `Moteur/Frontend/` (Vite dev server on port 5173).
3. **Full Startup**: Use `LANCER_LOGICIEL.bat` - validates Node.js + Conda, spawns both in separate terminal windows.

### Adding a Feature
1. **Backend Router**: Create/edit file in `app/routers/` (e.g., `new_feature.py`), define FastAPI routes, import in `main.py`.
2. **Frontend Service**: Create `src/services/newFeatureService.ts` with fetch calls to `http://localhost:8000/api/route`.
3. **UI Component**: Add component to `src/components/` or `src/pages/` using service + React hooks.
4. **Theme/Styling**: Use Tailwind classes; custom colors via CSS variables (e.g., `bg-[var(--color-primary)]`).

### Database Migrations
- Manual migration scripts in `Moteur/Backend/System/Tools/` (e.g., `migrate_db.py`, `fix_db_schema.py`).
- Schema reference: `Moteur/Backend/DATABASE_SCHEMA.md` documents Client→Project→Parts hierarchy.
- Always backup before migrations: `Moteur/UserData/BaseDeDonnees/` contains backups.

### Debugging
- **Backend Logs**: Check terminal where backend is running; FastAPI auto-reload on file changes.
- **Frontend Console**: Browser DevTools (F12) shows React errors and API fetch calls.
- **Database**: Use SQLite viewer or `verify_db.py` script to inspect data.

## Code Conventions

### TypeScript (Frontend)
- Use `const` + arrow functions; avoid `var`.
- Context hooks: `const { colors, setColors } = useTheme()` (similar to ThemeContext pattern).
- Services return Promises; wrap in try-catch or `.then()`.
- Export types in separate `types/` files (e.g., `presets.ts` for preset interfaces).

### Python (Backend)
- Routers define route handlers; use FastAPI decorators (`@router.get()`, `@router.post()`).
- Database models inherit from SQLAlchemy Base; define in `app.db.models`.
- Error handling: Return `{"error": "message"}` with appropriate HTTP status.
- Path imports: Services directory auto-injected in `main.py`; import as `from IA_Engine import ...`.

### Configuration
- **Backend Port**: 8000 (set in launcher scripts).
- **Frontend Port**: 5173 (Vite default, set in launcher).
- **Environment**: `opticut_pro` Conda env with Python 3.9+.
- **Conda Dependencies**: `pythonocc-core`, `fastapi`, `uvicorn`, `sqlalchemy` (check `requirements.txt`).

## Important Notes

- **Layout Stability**: Moteur/ is the stable core; don't move System/ or Services/ paths without updating import chains.
- **CORS Setup**: Currently allows all origins (`*`); tighten for production deployment.
- **localStorage**: Both theme and color palette persisted; clear if resetting defaults.
- **File Uploads/Exports**: Check `Moteur/UserData/Exports/` for generated files; `Storage/` for backups.
- **Mobile**: Separate app in `Moteur/Mobile/` (Capacitor + React); uses same Backend API on port 8000.

## Key Files to Understand First

1. [Moteur/Frontend/src/App.tsx](Moteur/Frontend/src/App.tsx) - Route definitions
2. [Moteur/Backend/System/Bin/app/main.py](Moteur/Backend/System/Bin/app/main.py) - API entry point
3. [Moteur/Frontend/src/context/ThemeContext.tsx](Moteur/Frontend/src/context/ThemeContext.tsx) - State management pattern
4. [Moteur/Backend/DATABASE_SCHEMA.md](Moteur/Backend/DATABASE_SCHEMA.md) - Data model
5. [Moteur/Backend/System/Bin/app/routers/](Moteur/Backend/System/Bin/app/routers/) - Feature endpoints (explore projects.py, optimize.py, etc.)
