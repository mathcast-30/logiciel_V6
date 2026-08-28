# OptiCut Pro V4 (logiciel_V6)

Bienvenue — ce README détaillé décrit l'architecture, l'installation, le développement, l'exploitation et le dépannage d'OptiCut Pro V4 (répertoire logiciel_V6).

Sommaire rapide
- Lancement recommandé (utilisateur) : double-cliquer `LANCER_LOGICIEL.bat` à la racine du dépôt. Le script démarre le serveur de logs, le backend Python et le frontend React, puis ouvre l'interface web sur http://localhost:5173.
- Développement : backend (conda env `opticut_pro`, uvicorn app.main:app --port 8000), frontend (cd Moteur/Frontend && npm install && npm run dev).

Table des matières
1. Présentation
2. Prérequis
3. Arborescence et rôle des dossiers
4. Exécution (lancement rapide & manuel)
5. Installation détaillée (dev + production)
6. Backend : construction, extension C++ et tests
7. Frontend : scripts et construction
8. Import STEP et dépendances spécifiques
9. Base de données & sauvegardes
10. Logs, debugging et diagnostics
11. Mise à jour / packaging
12. Contribuer
13. FAQ et dépannage
14. Licence


1. Présentation
----------------
OptiCut Pro V4 est une application desktop orientée gestion de projets/stock et optimisation de découpe (import STEP, algorithmes d'agencement, exports pour machines/outils). Le projet mélange un moteur Python (backend), une interface React (frontend) et des utilitaires/scripts Windows pour le déploiement local.

Public cible : ateliers de menuiserie, intégrateurs d'atelier, développeurs en charge de personnaliser le moteur d'optimisation.


2. Prérequis
------------
Minimum recommandé (Windows, tel que supposé par les scripts .bat) :
- Git (pour cloner le repo)
- Node.js (version LTS actuelle) — nécessaire pour le frontend (Vite)
- npm (fourni avec Node.js)
- Anaconda / Miniconda (pour gérer l'environnement Python et dépendances scientifiques)
- Python 3.9+ (via conda env)
- Outils de compilation C++ (MSVC Visual Studio Build Tools sur Windows) si vous voulez compiler l'extension C++ `raw_wood_engine`.
- pybind11 (pour construire l'extension C++)

Exemples de rapid-commands :
- Vérifier Node : `node --version`
- Vérifier conda : `conda --version`


3. Arborescence et rôle des dossiers
------------------------------------
Voici les fichiers et dossiers importants à la racine et leur rôle :

Moteur/
  Backend/                # Moteur Python : scripts, utilitaires, extension C++
    Services/             # Modules métiers (IA_Engine, raw_wood_optimizer, etc.)
    System/               # Structure d'exécution (Bin/...) - contiendra l'app démarrable
    opticut.db            # Base SQLite (dans repo pour référence ; en production voir UserData)
    SETUP_STEP_IMPORT.md  # Guide spécifique pour les imports STEP
    README.md             # Readme propre au backend
    test_*.py             # Scripts et tests unitaires/d'intégration
  Frontend/               # Application React + Vite
    package.json          # scripts: dev, build, preview
    src/                  # code source React (components, pages, services)
    public/               # assets statiques (index.html, images)
Tools/                    # outils utilitaires (ex: log_server.py)
System_Scripts/           # scripts système additionnels
LANCER_LOGICIEL.bat       # Lanceur principal : vérification, install et démarrage
START_OPTICUT.bat         # Script d'aide au démarrage
STOP_OPTICUT.bat          # Script d'arrêt propre + sauvegardes
UPDATE_OPTICUT.bat        # Script de mise à jour automatique
INSTALLATION.md           # Guide d'installation complet (voir le fichier pour pas-à-pas)
README.md                 # README racine (ce fichier)

Remarques sur l'organisation :
- Le lanceur s'appuie sur un conda env nommé `opticut_pro` (variable `CONDA_ENV` dans LANCER_LOGICIEL.bat).
- Le backend est démarré via uvicorn (commande générée : `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`).
- Le frontend est lancé via `npm run dev` (Vite), port 5173 par défaut.


4. Exécution — lancement rapide & manuel
----------------------------------------
Lancement recommandé (tout-en-un) :
- Double-cliquez `LANCER_LOGICIEL.bat` à la racine. Le script :
  - vérifie Node et conda,
  - installe le frontend si `node_modules` manquent (npm install),
  - démarre `Tools/log_server.py` (fenêtre logs),
  - crée puis exécute `run_backend.bat` (activation conda + uvicorn),
  - crée puis exécute `run_frontend.bat` (npm run dev),
  - ouvre le navigateur sur `http://localhost:5173`.

Lancement manuel (développeurs) :
- Backend
  - Ouvrir Anaconda Prompt
  - cd dans `Moteur\Backend\System\Bin` (ou dans le dossier contenant votre app Python)
  - activer l'environnement : `conda activate opticut_pro`
  - installer dépendances : `pip install -r requirements.txt` (si présent)
  - lancer : `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- Frontend
  - cd `Moteur/Frontend`
  - npm install
  - npm run dev
  - ouvrir `http://localhost:5173`

Ports par défaut (variables dans LANCER_LOGICIEL.bat) :
- BACKEND_PORT = 8000
- FRONTEND_PORT = 5173


5. Installation détaillée (développement)
-----------------------------------------
Exemple d'installation pas-à-pas pour un poste de développement Windows :

1) Cloner le dépôt
```
git clone https://github.com/mathcast-30/logiciel_V6
cd logiciel_V6
```

2) Installer Node.js et npm (si non déjà présent)
- Télécharger depuis https://nodejs.org/ (LTS recommandé)

3) Installer Anaconda / Miniconda
- Télécharger et installer Miniconda/Anaconda

4) Créer l'environnement conda recommandé
```
conda create -n opticut_pro python=3.10 -y
conda activate opticut_pro
# puis installer les dépendances Python requises
pip install -r Moteur/Backend/requirements.txt   # si le fichier existe
```

5) Installer le frontend
```
cd Moteur/Frontend
npm install
```

6) Démarrer (dev)
- Backend : `uvicorn app.main:app --reload --port 8000`
- Frontend : `npm run dev` (ouvre sur 5173)

Notes :
- Si `requirements.txt` n'existe pas, consultez `Moteur/Backend/SETUP_STEP_IMPORT.md` et les docs du dossier Backend pour connaître les dépendances (pythonocc-core, sqlalchemy, fastapi, uvicorn, etc.).
- Les scripts `.bat` (LANCER_LOGICIEL.bat, START_OPTICUT.bat) automatisent ces étapes sur Windows.


6. Backend : construction, extension C++ et tests
-------------------------------------------------
Le backend contient du Python pur et une extension C++ (raw_wood_engine) définie via pybind11 dans `Moteur/Backend/setup.py`.

Compiler l'extension C++ (Windows) :
1. Installer Visual Studio Build Tools (MSVC) ou équivalent.
2. Installer pybind11 dans l'environnement Python `opticut_pro` : `pip install pybind11`
3. Depuis `Moteur/Backend/` exécuter :
```
python setup.py build_ext --inplace
```
Cela génèrera un module native (DLL/.pyd) utilisable par le moteur Python.

Tests disponibles :
- Plusieurs scripts `test_*.py` dans `Moteur/Backend/` (ex : `test_massive_optimization.py`, `test_step_occ_diagnostic.py`) — exécutez-les avec l'environnement conda activé :
```
conda activate opticut_pro
python Moteur/Backend/test_massive_optimization.py
```

Migration / utilitaires DB :
- `migration_utility.py`, `update_db.py`, `migrate_storage.py` sont fournis pour gérer la base et le stockage. Toujours faire une sauvegarde avant exécution.


7. Frontend : scripts et construction
-------------------------------------
Principaux scripts dans `Moteur/Frontend/package.json` :
- `npm run dev`  — démarre Vite en dev (port 5173)
- `npm run build` — construit l'app pour production (utilise `tsc -b && vite build`)
- `npm run preview` — prévisualise le build localement

Dépendances notables (extrait package.json) :
- react, react-dom (React 19)
- @dnd-kit (drag & drop)
- axios (appels API)
- tailwindcss (UI)

Lancer la version de production (exemple simplifié) :
1. cd Moteur/Frontend
2. npm run build
3. Servir le dossier `dist/` via un serveur statique ou intégrer au backend via une route statique.


8. Import STEP et dépendances spécifiques
-----------------------------------------
Le projet inclut un guide `Moteur/Backend/SETUP_STEP_IMPORT.md` indiquant comment préparer l'environnement pour importer des fichiers STEP (CAD). Points clés :
- L'import STEP s'appuie sur des bibliothèques dédiées (ex : pythonocc-core ou OCP / OCP-Core).
- Tests d'import : le guide montre des commandes `curl` pour pousser un fichier .stp vers l'API (ex: POST http://localhost:8000/api/step/project/1/import-step) et des scripts Python pour parser le STEP via `app/core/step_parser.py` (exemple : `python app/core/step_parser.py "C:\path\to\your\test.stp"`).

Actions recommandées :
- Installer `pythonocc-core` dans l'environnement conda si vous manipulez STEP.
- Suivre exactement les étapes de `Moteur/Backend/SETUP_STEP_IMPORT.md` pour valider l'installation et exécuter les tests d'import.


9. Base de données & sauvegardes
--------------------------------
- Fichier principal (dans le repo de référence) : `Moteur/Backend/opticut.db` (dans ce dépôt il peut être vide ou d'exemple).
- En production, la DB est située dans `Moteur/UserData/BaseDeDonnees/opticut.db` (ou `Moteur/Data/Database/` selon packaging). Vérifier `INSTALLATION.md` pour le chemin utilisé par votre bundle.

Sauvegarde et restauration :
- `STOP_OPTICUT.bat` effectue une sauvegarde automatique avant fermeture.
- Pour sauvegarde manuelle : copier `opticut.db` vers un dossier sécurisé (ex: `Moteur/UserData/Data/Storage/`), ou exporter via un utilitaire SQL.


10. Logs, debugging et diagnostics
----------------------------------
- Un serveur de logs `Tools/log_server.py` est lancé par le lanceur. Il capture logs backend/frontend et les affiche dans une fenêtre séparée.
- Backend : logs console uvicorn (niveau configurable) — surveiller la fenêtre `OptiCut Backend` ouverte par le lanceur.
- Frontend : ouvrir DevTools du navigateur (F12) pour voir les erreurs réseau ou JS.

Conseils de debugging :
- Si le frontend affiche une page blanche, actualisez après quelques secondes (le backend peut être encore en démarrage).
- Vérifier les ports utilisés (8000 backend, 5173 frontend). Utiliser `netstat -ano | findstr :8000` pour détecter processus occupant le port.


11. Mise à jour / packaging
---------------------------
- `UPDATE_OPTICUT.bat` automatise la mise à jour locale : il télécharge les modifications, applique les scripts et crée une sauvegarde avant d'écraser la DB.
- Pour packager l'app en standalone (option avancée) : vous pouvez packager le backend et le frontend ensemble (p.ex. en construisant le frontend, servant `dist/` via une route statique Python) et créer un installeur Windows (Inno Setup, NSIS) — procédures non incluses dans ce dépôt.


12. Contribuer
---------------
Processus recommandé :
1. Ouvrir une issue décrivant le bug ou la fonctionnalité.
2. Créer une branche `feature/<nom>` ou `fix/<nom>` depuis `main`.
3. Faire des commits clairs (message descriptif), inclure des tests si possible.
4. Ouvrir une Pull Request vers `main` en décrivant le contexte et les étapes de validation.

Checklist PR :
- [ ] Lint et tests passés
- [ ] Documentation mise à jour (README, CHANGELOG)
- [ ] Pas de secrets committés


13. FAQ & dépannage courant
---------------------------
Q : Le script LANCER_LOGICIEL.bat affiche "Node.js n'est pas installé".
A : Installer Node.js (LTS), redémarrer le terminal, relancer depuis Anaconda Prompt.

Q : "Veuillez lancer ce script via \"Anaconda Prompt\"" (conda non trouvé).
A : Ouvrir un Anaconda Prompt (ou ajouter conda au PATH), puis relancer.

Q : Ports 8000/5173 déjà utilisés.
A : Fermer l'application occupant le port ou redémarrer Windows; sinon changer les variables BACKEND_PORT/FRONTEND_PORT dans `LANCER_LOGICIEL.bat`.

Q : Problèmes d'import STEP (erreurs pythonocc-core).
A : Vérifier que `pythonocc-core` ou OCP est installé dans l'environnement conda et que les versions sont compatibles ; suivre `Moteur/Backend/SETUP_STEP_IMPORT.md`.


14. Licence
-----------
Indiquer la licence souhaitée. Actuellement, le dépôt ne contient pas de fichier `LICENSE`. Souhaitez-vous que j'ajoute une licence (MIT, Apache-2.0, GPL-3.0) ?


Annexes utiles (liens vers fichiers du dépôt)
--------------------------------------------
- Lanceur principal : `LANCER_LOGICIEL.bat`
- Installation complète : `INSTALLATION.md`
- Backend README : `Moteur/Backend/README.md`
- Setup import STEP : `Moteur/Backend/SETUP_STEP_IMPORT.md`
- Frontend package : `Moteur/Frontend/package.json`
- Scripts utilitaires : `Tools/log_server.py`, `UPDATE_OPTICUT.bat`, `STOP_OPTICUT.bat`


Prochaine étape
----------------
Souhaitez-vous :
- que je pousse cette version enrichie du README.md dans le dépôt (je suis sur le point de le faire) ?
- que j'ajoute une section interactive d'exemples (exemples d'appels API / requêtes curl) ?
- que j'ajoute un fichier CONTRIBUTING.md et une LICENSE (indiquer le type) ?

