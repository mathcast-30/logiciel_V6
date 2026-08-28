# OptiCut Pro V4 (logiciel_V6)

## What this is
OptiCut Pro V4 est une application desktop pour la gestion de projets, la gestion de stock et l'optimisation de découpe (import STEP, optimisation d’agencement, exports pour machines). Cible : ateliers de menuiserie, fabricants et intégrateurs d’équipements.

### Stack
- Languages : Python (backend) et TypeScript (frontend)
- Frameworks / runtime :
  - Backend : FastAPI (uvicorn)
  - Frontend : React + Vite
- Base de données : SQLite (fichier local)
- Notable libraries / composants :
  - pybind11 + extension C++ : raw_wood_engine (optimisation bois massif)
  - react, tailwindcss, @dnd-kit, axios côté frontend
  - SQLAlchemy, pydantic, python-dotenv côté backend

---

## Table des matières
1. Présentation rapide  
2. Arborescence et rôle des dossiers  
3. Exécution (lancement rapide & manuel)  
4. Installation détaillée (dev)  
5. Backend — architecture, routes et migrations  
6. Frontend — scripts et build  
7. Import STEP (3D) — aperçu et dépendances  
8. Base de données & sauvegardes  
9. Compilation de l'extension C++ (raw_wood_engine)  
10. Tests, CI et qualité  
11. Debugging & diagnostics  
12. Mise à jour / packaging  
13. Contribuer  
14. FAQ & dépannage  
15. Licence

---

1) Présentation rapide
OptiCut Pro V4 est conçu pour optimiser l'utilisation de panneaux et de bois massif afin de réduire le gaspillage et automatiser la génération de plans/exports pour machine. L'architecture combine un backend Python (moteur) et une interface React servie localement.

2) Arborescence et rôle des dossiers (extrait)
Moteur/
  Backend/                    # Moteur Python, scripts, extension C++
    System/                   # Structure d'exécution (Bin/ etc.)
    Services/                 # IA_Engine, optimizers, raw_wood_optimizer...
    opticut.db                # Base SQLite (exemple/placeholder)
    SETUP_STEP_IMPORT.md      # Guide import STEP
    README.md                 # Backend-specific notes
  Frontend/                   # React + Vite (package.json, src/, public/)
Tools/                        # Utilitaires (log_server.py ...)
System_Scripts/               # Scripts additionnels
LANCER_LOGICIEL.bat           # Lanceur principal (Windows)
START_OPTICUT.bat             # Script d'aide
STOP_OPTICUT.bat              # Script d'arrêt + sauvegarde
UPDATE_OPTICUT.bat            # Mise à jour automatisée
INSTALLATION.md               # Guide utilisateur d'installation
README.md                     # Ce fichier

How it fits together
- LANCER_LOGICIEL.bat démarre un serveur de logs (Tools), le backend (uvicorn) et le frontend (Vite), puis ouvre http://localhost:5173.
- Le frontend communique via HTTP avec le backend (par défaut http://localhost:8000/api/...).
- Le backend inscrit des migrations légères au démarrage, sert des fichiers statiques d'export (mounted at /api/files) et expose de nombreux routers (/api/projects, /api/optimize, /api/step, ...).

3) Exécution — lancement rapide & manuel
Lancement recommandé : double-cliquer LANCER_LOGICIEL.bat.
Lancement manuel (dev) :
- Backend (Anaconda Prompt) :
  cd Moteur\Backend\System\Bin\app
  conda activate opticut_pro
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
- Frontend :
  cd Moteur/Frontend
  npm install
  npm run dev
Ouvrir http://localhost:5173

Ports par défaut (dans LANCER_LOGICIEL.bat) :
- BACKEND_PORT = 8000
- FRONTEND_PORT = 5173

4) Installation détaillée (développement)
Prérequis (Windows) :
- Git, Node.js (LTS), npm, Anaconda/Miniconda, Visual Studio Build Tools (pour C++).
Exemples de commandes :
- git clone https://github.com/mathcast-30/logiciel_V6
- cd Moteur/Frontend && npm install
- conda create -n opticut_pro python=3.10 -y && conda activate opticut_pro
- pip install -r Moteur/Backend/requirements.txt (ou installer manuellement fastapi, uvicorn, sqlalchemy, pythonocc-core si nécessaire)

5) Backend — architecture, routes et migrations
- Entrée : Moteur/Backend/System/Bin/app/main.py
  - Initialise FastAPI, configure CORS (dev: allow_origins=["*"]) et monte routers.
  - Monte /api/files pour exports (StaticFiles).
  - Crée des tables et lance des migrations SQL non intrusives (ALTER TABLE ADD COLUMN ...) au démarrage.
- Routers majeurs : projects, materials, optimize, stock, clients, suppliers, hardware, ai, step_import, stats, exports, backups, qr, quotes, scraping, orders, templates, files (file-explorer), management, settings, auth, users.
- Endpoints importants : /api/health, /api/projects/*, /api/optimize/*, /api/step/* (voir API_REFERENCE.md).

6) Frontend — scripts et build
- package.json (Moteur/Frontend/package.json) : scripts "dev" (vite), "build" (tsc -b && vite build), "preview".
- Principales dépendances : react 19, tailwindcss, @dnd-kit, axios, recharts.
- Dev : npm run dev (serve sur 5173).
- Prod : npm run build puis servir dist/ (ou laisser backend monter dist/ s'il existe).

7) Import STEP (3D)
- Router STEP : Moteur/Backend/System/Bin/app/routers/step_import.py
  - Vérification pythonOCC availability: GET /api/step/system/occ-status
  - Import: POST /api/step/projects/{project_id}/import-step (upload .stp/.step)
  - Confirmation: POST /api/step/step-models/{step_model_id}/confirm
  - Assignations en masse: POST /api/step/step-models/{step_model_id}/assign-materials
- Si pythonOCC n'est pas présent, le router retourne 503 avec install_command recommandé (ex: conda install -c conda-forge pythonocc-core=7.8.1).

8) Base de données & sauvegardes
- Emplacement runtime DB : DB_PATH env var ou Moteur/UserData/BaseDeDonnees/opticut.db (app/db/database.py).
- Tables importantes : users, projects, parts, materials, stock, OptimizationResult, StepModel, tarification_globale.
- Sauvegardes : STOP_OPTICUT.bat effectue sauvegarde avant arrêt ; UPDATE_OPTICUT.bat crée sauvegarde avant mise à jour.

9) Compilation de l'extension C++ (raw_wood_engine)
- Fichier : Moteur/Backend/setup.py (déclare Pybind11Extension "raw_wood_engine")
- Sous Windows :
  - Installer Visual Studio Build Tools (C++), pybind11
  - conda activate opticut_pro ; pip install pybind11 ; python setup.py build_ext --inplace

10) Tests, CI et qualité
- Tests : plusieurs scripts test_*.py dans Moteur/Backend.
- CI proposé : .github/workflows/ci.yml (lint frontend + tests backend).

11) Debugging & diagnostics
- Logs : serveurs ouverts par LANCER_LOGICIEL.bat (fenêtres séparées) ; Tools/log_server.py lance le sidecar logs.
- Backend : logs uvicorn/print et monitoring_middleware envoie logs au sidecar.
- Frontend : DevTools (F12).
- Vérifier ports : netstat -ano | findstr :8000

12) Mise à jour / packaging
- UPDATE_OPTICUT.bat : script de mise à jour automatique, garde une sauvegarde (sauvegardes_avant_maj).
- Pour packager en standalone : construire frontend (npm run build) et servir dist/ via backend pour création de bundle, puis créer installeur (ex: Inno Setup) — procédure non incluse.

13) Contribuer
- Voir CONTRIBUTING.md (guide PR, checklist, conventions).
- Branch naming: feature/<nom> ou fix/<nom>

14) FAQ & dépannage
- Node absent → installer Node LTS.
- Conda absent → exécuter depuis Anaconda Prompt ou ajouter conda au PATH.
- Ports occupés → STOP_OPTICUT.bat ou changer BACKEND_PORT/FRONTEND_PORT dans LANCER_LOGICIEL.bat.
- Import STEP échoue → installer pythonocc-core dans opticut_pro.

15) Licence
- Pas de licence par défaut dans le dépôt initial. Si tu veux, j'ajoute MIT (je peux le faire ou tu fournis une autre licence).

---

Ressources rapides
- Lanceur : LANCER_LOGICIEL.bat
- Backend main : Moteur/Backend/System/Bin/app/main.py
- Frontend package.json : Moteur/Frontend/package.json
- DB path logic : Moteur/Backend/System/Bin/app/db/database.py