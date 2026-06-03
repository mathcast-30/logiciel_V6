@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR AUTOMATIQUE
REM =============================================================================
REM Ce script active l'environnement Conda et lance le serveur FastAPI
REM Double-cliquez sur ce fichier pour demarrer le logiciel
REM =============================================================================

echo.
echo ============================================================
echo    OPTICUT PRO - DEMARRAGE AUTOMATIQUE
echo ============================================================
echo.

REM Configuration - Modifier si necessaire
SET CONDA_ENV=opticut_pro
SET BACKEND_DIR=%~dp0Moteur\Backend\System\Bin
SET PORT=8000

echo [INFO] Environnement Conda: %CONDA_ENV%
echo [INFO] Repertoire Backend: %BACKEND_DIR%
echo [INFO] Port: %PORT%
echo.

REM Activer Conda
echo [1/3] Activation de l'environnement Conda...
CALL conda activate %CONDA_ENV%
IF ERRORLEVEL 1 (
    echo [ERREUR] Impossible d'activer l'environnement "%CONDA_ENV%"
    echo.
    echo Solutions possibles:
    echo   1. Ouvrez "Anaconda Prompt" au lieu de double-cliquer
    echo   2. Verifiez que l'environnement existe: conda env list
    echo   3. Creez-le: conda create -n opticut_pro python=3.9
    echo.
    pause
    exit /b 1
)
echo [OK] Environnement active
echo.

REM Aller dans le dossier backend
echo [2/3] Navigation vers le backend...
cd /d "%BACKEND_DIR%"
IF ERRORLEVEL 1 (
    echo [ERREUR] Dossier introuvable: %BACKEND_DIR%
    pause
    exit /b 1
)
echo [OK] Repertoire: %CD%
echo.

REM Test rapide du parser STEP
echo [3/3] Verification du parser STEP...
python -c "from app.core.step_parser import StepExtractor; print('[OK] Parser STEP operationnel')" 2>nul
IF ERRORLEVEL 1 (
    echo [WARN] Impossible de verifier le parser STEP
    echo        Verifiez que pythonocc-core est installe
    echo        Installation: conda install -c conda-forge pythonocc-core
    echo.
)

echo.
echo ============================================================
echo    DEMARRAGE DU SERVEUR FASTAPI
echo ============================================================
echo.
echo Le serveur sera accessible sur: http://localhost:%PORT%
echo API STEP Import: http://localhost:%PORT%/api/step/
echo Documentation: http://localhost:%PORT%/docs
echo.
echo Appuyez Ctrl+C pour arreter le serveur
echo.
echo ============================================================
echo.

REM Demarrer uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port %PORT%

REM Si on arrive ici, le serveur s'est arrete
echo.
echo [INFO] Serveur arrete.
pause
