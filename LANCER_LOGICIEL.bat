@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR PRINCIPAL
REM =============================================================================
title OptiCut Pro - Demarrage...

SET "PROJECT_DIR=%~dp0"
SET "BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin"
SET "FRONTEND_DIR=%PROJECT_DIR%Moteur\Frontend"
SET "USERDATA_DIR=%PROJECT_DIR%Moteur\UserData"
SET "LOG_FILE=%USERDATA_DIR%\last_launch_error.log"

REM Initialisation du dossier UserData et du fichier de log
if not exist "%USERDATA_DIR%" mkdir "%USERDATA_DIR%"
echo [%DATE% %TIME%] === Tentative de lancement OptiCut Pro === > "%LOG_FILE%"

echo.
echo ============================================================
echo          OPTICUT PRO - DEMARRAGE DU SYSTEME
echo ============================================================
echo.

REM 1. Verification de l'interpreteur Python de l'environnement
SET "PYTHON_EXE=C:\Users\Mathe\anaconda3\envs\opticut_pro\python.exe"
if not exist "%PYTHON_EXE%" (
    echo [ERREUR CRITIQUE] L'interpreteur Python est introuvable : >> "%LOG_FILE%"
    echo %PYTHON_EXE% >> "%LOG_FILE%"
    echo [ERREUR CRITIQUE] L'interpreteur Python specifique est introuvable :
    echo %PYTHON_EXE%
    echo.
    echo Veuillez verifier que l'environnement conda opticut_pro est bien installe.
    pause
    exit /b 1
)

REM 2. Verification de Node.js pour le frontend
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR CRITIQUE] Node.js n'est pas installe ou n'est pas dans le PATH. >> "%LOG_FILE%"
    echo [ERREUR CRITIQUE] Node.js est introuvable.
    echo Le frontend ne peut pas demarrer sans Node.js.
    pause
    exit /b 1
)

REM 3. Verification des dependances frontend
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Premier lancement : installation des modules frontend...
    echo [INFO] Premier lancement : npm install >> "%LOG_FILE%"
    cd /d "%FRONTEND_DIR%"
    call npm install >> "%LOG_FILE%" 2>&1
)

echo [OK] Environnement verifie avec succes.
echo [1/3] Demarrage du Backend FastAPI...
echo [INFO] Lancement du backend avec %PYTHON_EXE% >> "%LOG_FILE%"

REM Creation de scripts de lancement independants et propres (evite les soucis d'echappement &)
echo @echo off > "%PROJECT_DIR%run_backend.bat"
echo title OptiCut API Backend >> "%PROJECT_DIR%run_backend.bat"
echo cd /d "%BACKEND_DIR%" >> "%PROJECT_DIR%run_backend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_backend.bat"
echo echo   OPTICUT PRO - API BACKEND (Port 8000) >> "%PROJECT_DIR%run_backend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_backend.bat"
echo "%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 >> "%PROJECT_DIR%run_backend.bat"

start "OptiCut API Backend" cmd /k "%PROJECT_DIR%run_backend.bat"

echo [2/3] Demarrage du Frontend React...
echo [INFO] Lancement du frontend npm run dev >> "%LOG_FILE%"

echo @echo off > "%PROJECT_DIR%run_frontend.bat"
echo title OptiCut Interface >> "%PROJECT_DIR%run_frontend.bat"
echo cd /d "%FRONTEND_DIR%" >> "%PROJECT_DIR%run_frontend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_frontend.bat"
echo echo   OPTICUT PRO - INTERFACE UTILISATEUR >> "%PROJECT_DIR%run_frontend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_frontend.bat"
echo npm run dev >> "%PROJECT_DIR%run_frontend.bat"

start "OptiCut Interface" cmd /k "%PROJECT_DIR%run_frontend.bat"

echo [3/3] Attente et ouverture du navigateur...
timeout /t 6 /nobreak >nul

start http://localhost:5173

echo.
echo ============================================================
echo [OK] OPTICUT PRO EST EN COURS D'EXECUTION !
echo ============================================================
echo.
echo Vous pouvez fermer cette fenetre une fois le logiciel ouvert.
echo Laissez ouvertes les fenetres du Backend et de l'Interface.
echo.
pause

