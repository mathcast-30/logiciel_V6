"""
OptiCut Pro — Point d'entrée pour l'exécutable PyInstaller.
Ce fichier est utilisé UNIQUEMENT en mode packagé (run_app.py est le script principal).
En développement, lancer uvicorn directement depuis START_OPTICUT.bat.
"""
from __future__ import annotations
import sys
import os
from pathlib import Path

# Fix PyInstaller --windowed mode stdout/stderr standard stream handling:
# En mode windowed (GUI sans console), sys.stdout et sys.stderr valent None,
# ce qui fait planter Uvicorn ColourizedFormatter (AttributeError: 'NoneType' object has no attribute 'isatty').
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

# En mode .exe : ajouter le répertoire des sources extractées au sys.path
# afin que les imports comme `from app.xxx import ...` fonctionnent.
if getattr(sys, 'frozen', False):
    base_path = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    # Ajouter le répertoire Bin (contient le package `app`)
    sys.path.insert(0, str(base_path))
    # IA_Engine est empaqueté dans sys._MEIPASS/IA_Engine
    ia_engine_path = str(base_path / 'IA_Engine')
    if ia_engine_path not in sys.path:
        sys.path.insert(0, ia_engine_path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        use_colors=False,
    )
