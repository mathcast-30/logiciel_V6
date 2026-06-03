@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR FINAL
REM =============================================================================
REM Ce script lance le Backend et le Frontend dans des fenetres separees.
REM =============================================================================

title OptiCut Pro - Initialisation...

echo.
echo ============================================================
echo       OPTICUT PRO - DEMARRAGE
echo ============================================================
echo.

SET CONDA_ENV=opticut_pro
SET PROJECT_DIR=%~dp0
SET BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin
SET FRONTEND_DIR=%PROJECT_DIR%Moteur\Frontend
SET BACKEND_PORT=8000
SET FRONTEND_PORT=5173

REM =============================================================================
REM CHECK 1: NODE.JS
REM =============================================================================
where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERREUR] Node.js n'est pas installe !
    echo Le logiciel ne peut pas demarrer sans Node.js.
    echo.
    echo 1. Telechargez-le ici: https://nodejs.org/
    echo 2. Installez-le
    echo 3. Redemarrez votre ordinateur
    echo.
    pause
    exit /b 1
)

REM =============================================================================
REM CHECK 2: ANACONDA
REM =============================================================================
where conda >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERREUR] Veuillez lancer ce script via "Anaconda Prompt"
    pause
    exit /b 1
)

echo [OK] Environnement systeme verifie
echo.

REM =============================================================================
REM INSTALLATION AUTO (Si necessaire)
REM =============================================================================
IF NOT EXIST "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Premier lancement detecte: Installation du Frontend...
    cd /d "%FRONTEND_DIR%"
    call npm install
    echo [OK] Frontend installe
    echo.
)

REM =============================================================================
REM LANCEMENT BACKEND (Fenetre separee)
REM =============================================================================
echo [1/3] Lancement du Backend...

REM On cree un mini-script temporaire pour lancer le backend proprement
echo @echo off > run_backend.bat
echo title OptiCut API Backend >> run_backend.bat
echo call conda activate %CONDA_ENV% >> run_backend.bat
echo echo Backend en cours d'execution... >> run_backend.bat
echo uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --reload >> run_backend.bat

REM Lance le script dans une nouvelle fenetre
start "OptiCut Backend" cmd /c "cd /d "%BACKEND_DIR%" && "%PROJECT_DIR%run_backend.bat""

REM Attendre un peu que le port s'ouvre
timeout /t 4 /nobreak >nul

REM =============================================================================
REM LANCEMENT FRONTEND (Fenetre separee)
REM =============================================================================
echo [2/3] Lancement du Frontend...

echo @echo off > run_frontend.bat
echo title OptiCut Interface >> run_frontend.bat
echo cd /d "%FRONTEND_DIR%" >> run_frontend.bat
echo echo Interface en cours d'execution... >> run_frontend.bat
echo npm run dev >> run_frontend.bat

start "OptiCut Frontend" cmd /c "%PROJECT_DIR%run_frontend.bat"

REM Attendre un peu
timeout /t 4 /nobreak >nul

REM Nettoyage des scripts temporaires (optionnel, on les garde pour debug si besoin)
REM del run_backend.bat
REM del run_frontend.bat

REM =============================================================================
REM OUVERTURE NAVIGATEUR
REM =============================================================================
echo [3/3] Ouverture du navigateur...
echo.

start http://localhost:%FRONTEND_PORT%

echo ============================================================
echo    LOGICIEL LANCE !
echo ============================================================
echo.
echo Si l'interface ne s'ouvre pas, allez sur:
echo http://localhost:%FRONTEND_PORT%
echo.
echo Ne fermez pas les 2 autres fenetres noires qui se sont ouvertes.
echo.
pause
