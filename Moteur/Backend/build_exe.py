"""
OptiCut Pro — Script de packaging PyInstaller
=============================================
Usage :
    conda activate opticut_pro
    python Moteur/Backend/build_exe.py

Prérequis :
    pip install pyinstaller
    (ou : conda install -c conda-forge pyinstaller)

Le script doit être lancé depuis la RACINE du dépôt (le dossier parent de Moteur/).
"""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------
SCRIPT_DIR  = Path(__file__).resolve().parent          # Moteur/Backend/
REPO_ROOT   = SCRIPT_DIR.parent.parent                 # logiciel_V6/
MOTEUR_DIR  = SCRIPT_DIR.parent                        # Moteur/

ENTRY_POINT = MOTEUR_DIR / "Backend" / "System" / "Bin" / "run_app.py"
FRONTEND_DIST = MOTEUR_DIR / "Frontend" / "dist"
IA_ENGINE_DIR = MOTEUR_DIR / "Backend" / "Services" / "IA_Engine"
APP_DIR     = MOTEUR_DIR / "Backend" / "System" / "Bin" / "app"
MIGRATIONS_DIR = APP_DIR / "migrations"

OUTPUT_DIR  = SCRIPT_DIR / "dist_exe"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Vérifications préalables
# ---------------------------------------------------------------------------
def check_prerequisites():
    errors = []
    if not ENTRY_POINT.exists():
        errors.append(f"  - Point d'entrée introuvable : {ENTRY_POINT}")
    if not FRONTEND_DIST.exists():
        errors.append(f"  - Frontend dist introuvable : {FRONTEND_DIST}\n"
                      f"    → Lancez d'abord : cd Moteur/Frontend && npm run build")
    if errors:
        print("\n[ERREUR] Conditions préalables non satisfaites :\n")
        for e in errors:
            print(e)
        sys.exit(1)
    print("[OK] Conditions préalables vérifiées.")

# ---------------------------------------------------------------------------
# Construction de la commande PyInstaller
# ---------------------------------------------------------------------------
def build():
    check_prerequisites()

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--windowed",               # Pas de console noire (Windows)
        "--name", "OptiCutPro",
        "--distpath", str(OUTPUT_DIR),
        "--workpath", str(OUTPUT_DIR / "build_work"),
        "--specpath", str(SCRIPT_DIR),

        # ----- Données embarquées -----
        # Frontend React (dist → accessible via sys._MEIPASS/frontend_dist)
        f"--add-data={FRONTEND_DIST};frontend_dist",

        # Fichiers de migrations Alembic
        f"--add-data={MIGRATIONS_DIR};app/migrations",

        # Moteur IA (Python packages de services)
        f"--add-data={IA_ENGINE_DIR};IA_Engine",

        # ----- Imports cachés -----
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "sqlalchemy.dialects.sqlite",
        "--hidden-import", "passlib.handlers.bcrypt",
        "--hidden-import", "email_validator",

        # ----- Exclusions (allègent le bundle) -----
        "--exclude-module", "tkinter",
        "--exclude-module", "matplotlib",
        "--exclude-module", "IPython",
        "--exclude-module", "pytest",
        "--exclude-module", "sphinx",

        str(ENTRY_POINT),
    ]

    print("\n[BUILD] Lancement de PyInstaller...\n")
    print("Commande :", " ".join(cmd))
    print()

    result = subprocess.run(cmd, cwd=str(REPO_ROOT))
    if result.returncode == 0:
        exe_path = OUTPUT_DIR / "OptiCutPro.exe"
        print(f"\n[OK] Build réussi !")
        print(f"     Exécutable : {exe_path}")
        print(f"\nTest rapide : copiez {exe_path} dans un dossier isolé et double-cliquez dessus.")
    else:
        print(f"\n[ERREUR] PyInstaller a échoué (code {result.returncode}).")
        sys.exit(result.returncode)


if __name__ == "__main__":
    build()
