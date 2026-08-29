# OptiCut Pro — Notes de packaging

## Prérequis

| Outil | Version recommandée |
|---|---|
| conda env `opticut_pro` | Python 3.10+ |
| PyInstaller | ≥ 6.x (`pip install pyinstaller`) |
| Node.js | ≥ 18 (pour npm run build) |

---

## Étapes complètes

### 1. Build du frontend

```bash
cd Moteur/Frontend
npm install          # si pas déjà fait
npm run build        # → génère Moteur/Frontend/dist/
```

Vérification : `Moteur/Frontend/dist/index.html` doit exister.

### 2. Build de l'exécutable

```bash
conda activate opticut_pro
# Depuis la RACINE du dépôt (dossier logiciel_V6/)
python Moteur/Backend/build_exe.py
```

L'exécutable est généré dans : `Moteur/Backend/dist_exe/OptiCutPro.exe`

### 3. Test isolé

```
mkdir C:\Test_Exe_Isole
copy Moteur\Backend\dist_exe\OptiCutPro.exe C:\Test_Exe_Isole\
C:\Test_Exe_Isole\OptiCutPro.exe
```

Comportement attendu :
- Une console s'ouvre brièvement (puis se ferme si `--windowed`)
- Le navigateur par défaut s'ouvre sur `http://localhost:8000`
- La page de connexion OptiCut Pro s'affiche

---

## Architecture de l'exécutable

```
OptiCutPro.exe  (bundle PyInstaller --onefile)
  └── (extrait dans %TEMP%\_MEIxxxxxx/ au lancement)
       ├── app/                   ← package FastAPI + routers
       ├── IA_Engine/             ← moteur d'optimisation
       ├── frontend_dist/         ← build React (index.html + assets/)
       │     ├── index.html
       │     └── assets/
       └── app/migrations/        ← scripts Alembic (si nécessaires)
```

## Données persistantes (NON emballées dans l'exe)

Toutes les données utilisateur sont stockées dans :

```
%APPDATA%\OptiCutPro\
  ├── .env                       ← JWT_SECRET_KEY (généré au 1er lancement)
  ├── BaseDeDonnees\opticut.db   ← base SQLite
  ├── Optimisations\             ← résultats d'optimisation (JSON, PDF, DXF…)
  ├── StepFiles\                 ← fichiers STEP uploadés
  ├── Exports\                   ← exports générés (PDF, CSV…)
  └── Sauvegardes\Backups\       ← sauvegardes automatiques
```

> **Important** : ces dossiers sont créés automatiquement au premier lancement.
> Ne pas supprimer `%APPDATA%\OptiCutPro\` sans sauvegarder `opticut.db` d'abord.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Console rouge + crash immédiat | Port 8000 déjà utilisé | Fermer l'autre processus / changer le port dans run_app.py |
| Page blanche dans le navigateur | Frontend non inclus | Vérifier que `Moteur/Frontend/dist/` existait avant le build |
| Erreur JWT token | `.env` corrompu | Supprimer `%APPDATA%\OptiCutPro\.env` (il sera recréé) |
| Antivirus bloque l'exe | Faux positif PyInstaller | Ajouter une exception dans l'antivirus |

---

## Mise à jour

Pour mettre à jour l'exe après des modifications du code :

1. `npm run build` dans `Moteur/Frontend/` (si le frontend a changé)
2. `python Moteur/Backend/build_exe.py` (recompile tout)
3. Distribuer le nouveau `OptiCutPro.exe` — les données `%APPDATA%` sont préservées
