# Instructions pour Migration et Test

## 1. Migration de la Base de Données

La base de données doit être mise à jour pour supporter l'import STEP. Deux options :

### Option A : Migration automatique via Python

```bash
# Depuis le répertoire Backend/System/Bin
cd "c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Backend\System\Bin"

# Exécuter le script de migration
conda activate votre_env  # Activez votre environnement conda Python 3.9
python app/db/migrations/run_migration.py
```

### Option B : Migration manuelle via SQLite

```bash
# Ouvrir la base de données avec SQLite
sqlite3 "../../../../../UserData/BaseDeDonnees/opticut.db"

# Exécuter le contenu de app/db/migrations/001_add_step_support.sql
# (copier-coller le contenu SQL dans la console SQLite)

# Vérifier que les tables ont été créées
.tables
# Vous devriez voir "step_models" dans la liste

# Vérifier les nouvelles colonnes de parts
PRAGMA table_info(parts);
# Vous devriez voir : step_model_id, auto_extracted, extraction_metadata

.quit
```

## 2. Démarrage du Backend

```bash
# Depuis Backend/System/Bin
conda activate votre_env
uvicorn app.main:app --reload --port 8000
```

Le serveur devrait démarrer avec le nouveau endpoint `/api/step/...`

## 3. Test de l'API STEP

### Test 1 : Upload d'un fichier STEP

Créez un cube simple dans Fusion 360 (ex: 100x200x18mm) et exportez-le en STEP.

```bash
# Test avec curl (remplacez PATH_TO_FILE)
curl -X POST "http://localhost:8000/api/step/projects/1/import-step" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@C:\path\to\your\test.stp"
```

### Test 2 : Vérifier que les projets se chargent

```bash
curl "http://localhost:8000/api/projects"
```

Si vous obtenez une liste de projets sans erreur, le bug est corrigé ✅

### Test 3 : Parser STEP en ligne de commande

```bash
# Test direct du parser
conda activate votre_env
python app/core/step_parser.py "C:\path\to\your\test.stp"
```

Vous devriez voir :

```
✓ Successfully parsed 1 solids
Extracted 1 parts:
------------------------------------------------------------
Part #1:
  Thickness: 18.0 mm
  Width:     100.0 mm
  Length:    200.0 mm
  Volume:    360000.0 mm³
  Accuracy:  100.0%
```

## 4. Frontend (optionnel pour l'instant)

Si vous voulez tester l'interface :

```bash
# Depuis Frontend/
npm run dev
```

Puis ouvrez `http://localhost:5173` et allez dans la nouvelle page "Import STEP"

## 5. Dépannage

### Erreur "No module named OCC"

```bash
# Vérifier que pythonocc-core est bien installé
conda activate votre_env
python -c "from OCC.Core.STEPControl import STEPControl_Reader; print('OK')"
```

Si erreur, réinstallez :

```bash
conda install -c conda-forge pythonocc-core
```

### Erreur "step_models table not found"

La migration n'a pas été appliquée. Exécutez Option B (migration manuelle).

### Le serveur ne démarre pas

Vérifiez que vous êtes dans le bon environnement :

```bash
conda activate votre_env
python --version  # Doit être 3.9.x
which python  # Doit pointer vers le conda env
```
