# Logiciel_V6 - README

Bienvenue dans le dépôt logiciel_V6. Ce README explique la structure, les composants et comment lancer et contribuer au logiciel.

## Ce que c'est
Ceci est une application desktop destinée à l'optimisation de découpes et à la gestion de projets/stock (gestion de clients, projets, pièces, import STEP, optimisation de découpe, exports et rapports). Elle s'adresse aux ateliers de menuiserie, fabricants et intégrateurs de machines-outils.

### Stack
- Langages : TypeScript (frontend) et Python (backend), SQL (SQLite)
- Framework / runtime :
  - Frontend : React + Vite
  - Backend : FastAPI (uvicorn)
- Base de données : SQLite (fichier local)
- Bibliothèques notables : pythonocc-core (import STEP), SQLAlchemy (ORM), TailwindCSS (UI)

## Organisation du dépôt
Arborescence annotée (éléments de haut niveau pertinents) :

```
Moteur/
  Frontend/                # Application React (src/, public/, package.json)
  Backend/
    System/
      Bin/
        app/               # FastAPI application (main.py, routers/)
      Tools/               # scripts de migration, utilitaires
  UserData/
    BaseDeDonnees/         # opticut.db (SQLite) + backups
    Data/
      Exports/             # exports générés
      Storage/             # sauvegardes
LANCER_LOGICIEL.bat        # script de lancement complet
System_Scripts/
  OPTICUT_PRO.bat          # launcher alternatif
```

Comment ça s'articule :
- Le frontend (React) communique avec le backend (FastAPI) via API REST (ex : http://localhost:8000/api/...).
- Le backend effectue la logique métier (import STEP, optimisation, gestion DB) et persiste dans SQLite (fichier local dans Moteur/UserData/BaseDeDonnees/).
- Les scripts de lancement démarrent le backend (uvicorn) et le serveur de développement frontend (Vite) ou servent l'application packagée.

## Comment lancer (développement)
Prérequis : Node.js, Conda ou Python 3.9+, et les dépendances (pythonocc-core, fastapi, uvicorn, sqlalchemy, etc.).

1) Démarrer le backend (ex depuis Moteur/Backend/System/Bin/) :

```bash
conda activate opticut_pro   # si conda est utilisé
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

2) Démarrer le frontend (depuis Moteur/Frontend/) :

```bash
npm install
npm run dev   # Vite sur le port 5173
```

3) Ou lancer le script Windows fourni :

- Exécuter `LANCER_LOGICIEL.bat` ou `System_Scripts/OPTICUT_PRO.bat` pour démarrer frontend + backend automatiquement.

Notes : le backend peut exposer CORS en développement (réviser en production). La base de données se trouve généralement dans `Moteur/UserData/BaseDeDonnees/opticut.db`.

## Fonctionnalités principales
- Gestion hiérarchique : Clients → Projets → Pièces/Modèles STEP
- Import STEP (via pythonocc-core ou module équivalent)
- Optimisation de découpe (algorithmes d'agencement)
- Catalogue de matériaux et gestion de stock
- Exports de plans, rapports et fichiers pour machines
- Personnalisation UI (thèmes, couleurs persistées en localStorage)
- Sauvegardes et exports dans `Moteur/UserData/Data/`

## Développement & contribution
1. Ouvrir une issue décrivant la fonctionnalité ou le bug.
2. Créer une branche `feature/<nom>` ou `fix/<nom>`.
3. Committer et ouvrir une Pull Request ciblant la branche principale.

Pour ajouter une fonctionnalité :
- Backend : créer un router dans `app/routers/` et le monter dans `app/main.py`.
- Frontend : ajouter un service dans `src/services/`, un composant dans `src/components/` et mettre à jour le routage.

## Migrations de la base de données
- Scripts de migration disponibles dans `Moteur/Backend/System/Tools/` (ex: `migrate_db.py`).
- Toujours faire une sauvegarde de `Moteur/UserData/BaseDeDonnees/opticut.db` avant migration.

## Débogage
- Backend : logs uvicorn (console)
- Frontend : DevTools navigateur
- Base de données : utiliser un visualiseur SQLite ou scripts présents dans `System/Tools/`

## Conventions de code
Frontend (TypeScript):
- Types dans `src/types/`
- Services retournant Promises

Backend (Python):
- Modèles SQLAlchemy dans `app/db/models.py`
- Routers FastAPI dans `app/routers/`

## Configuration
- Backend port : 8000
- Frontend port : 5173
- Conda env recommandé : `opticut_pro`

## Licence
Ajouter la licence souhaitée (ex: MIT). Indiquez la licence et je peux l'ajouter au dépôt.

## Ressources rapides
- Backend main: `Moteur/Backend/System/Bin/app/main.py`
- Frontend ThemeContext: `Moteur/Frontend/src/context/ThemeContext.tsx`
- Base de données: `Moteur/UserData/BaseDeDonnees/opticut.db`
- Launchers: `LANCER_LOGICIEL.bat`, `System_Scripts/OPTICUT_PRO.bat`

---

Remarque : ce README est rédigé d'après les informations disponibles et une convention de structure typique pour ce projet. Si tu veux que j'adapte le contenu au code exact du dépôt (fichiers, routes, noms de modules précis), autorise l'accès au dépôt ou indique les fichiers clés à lire — je mettrai à jour le README en conséquence.
