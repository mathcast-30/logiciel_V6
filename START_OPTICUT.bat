@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR RAPIDE
REM =============================================================================
title OptiCut Pro - Demarrage...

SET "PROJECT_DIR=%~dp0"
SET "BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin"
SET "FRONTEND_DIR=%PROJECT_DIR%Moteur\Frontend"
SET "USERDATA_DIR=%PROJECT_DIR%Moteur\UserData"
SET "LOG_FILE=%USERDATA_DIR%\last_launch_error.log"

REM Initialisation du dossier UserData et du fichier de log
if not exist "%USERDATA_DIR%" mkdir "%USERDATA_DIR%"
echo [%DATE% %TIME%] === Lancement via START_OPTICUT.bat === > "%LOG_FILE%"

echo.
echo ============================================================
echo          OPTICUT PRO - DEMARRAGE DU SYSTEME
echo ============================================================
echo.

REM 1. Detection dynamique de l'interpreteur Python de l'environnement
SET "PYTHON_EXE="

REM Etape 1.1 : Variable d'environnement prioritaire
if defined OPTICUT_CONDA_ENV (
    if exist "%OPTICUT_CONDA_ENV%\python.exe" (
        SET "PYTHON_EXE=%OPTICUT_CONDA_ENV%\python.exe"
    ) else if exist "%OPTICUT_CONDA_ENV%" (
        SET "PYTHON_EXE=%OPTICUT_CONDA_ENV%"
    )
)

REM Etape 1.2 : Recherche via 'conda env list' ou chemins d'installation standards (Anaconda/Miniconda)
if not defined PYTHON_EXE (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$found = ''; try { $lines = & conda env list 2>$null; foreach ($line in $lines) { $t = $line.Trim(); if ($t -match 'opticut_pro' -and (-not $t.StartsWith('#'))) { $parts = $t -split '\s+'; $target = $parts[-1]; if (Test-Path \"$target\python.exe\") { $found = \"$target\python.exe\"; break } } } } catch {}; if (-not $found) { $common = @(\"$env:USERPROFILE\anaconda3\envs\opticut_pro\python.exe\", \"$env:USERPROFILE\miniconda3\envs\opticut_pro\python.exe\", \"$env:LOCALAPPDATA\anaconda3\envs\opticut_pro\python.exe\", \"$env:LOCALAPPDATA\miniconda3\envs\opticut_pro\python.exe\", \"C:\ProgramData\anaconda3\envs\opticut_pro\python.exe\", \"C:\ProgramData\miniconda3\envs\opticut_pro\python.exe\", \"C:\anaconda3\envs\opticut_pro\python.exe\", \"C:\miniconda3\envs\opticut_pro\python.exe\"); foreach ($p in $common) { if (Test-Path $p) { $found = $p; break } } }; Write-Output $found"`) do (
        SET "PYTHON_EXE=%%I"
    )
)

if not defined PYTHON_EXE (
    echo [ERREUR CRITIQUE] Environnement Conda 'opticut_pro' introuvable ! >> "%LOG_FILE%"
    echo.
    echo ============================================================
    echo [ERREUR CRITIQUE] L'environnement Conda 'opticut_pro' est introuvable !
    echo ============================================================
    echo.
    echo L'interpreteur Python de l'environnement opticut_pro n'a pas pu etre detecte.
    echo.
    echo Pour creer et configurer cet environnement, veuillez executer :
    echo     setup_env.bat
    echo ou definir la variable d'environnement OPTICUT_CONDA_ENV.
    echo.
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [ERREUR CRITIQUE] Le fichier interpreteur specifie est introuvable : >> "%LOG_FILE%"
    echo %PYTHON_EXE% >> "%LOG_FILE%"
    echo [ERREUR CRITIQUE] Le fichier interpreteur est introuvable : %PYTHON_EXE%
    echo.
    echo Veuillez executer setup_env.bat pour reinitialiser l'environnement.
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

echo [OK] Environnement verifie avec succes.
echo [1/3] Demarrage du Backend FastAPI...
echo [INFO] Lancement du backend avec %PYTHON_EXE% >> "%LOG_FILE%"

REM Creation de scripts de lancement independants
echo @echo off > "%PROJECT_DIR%run_backend.bat"
echo title OptiCut API Backend >> "%PROJECT_DIR%run_backend.bat"
echo cd /d "%BACKEND_DIR%" >> "%PROJECT_DIR%run_backend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_backend.bat"
echo echo   OPTICUT PRO - API BACKEND (Port 8000) >> "%PROJECT_DIR%run_backend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_backend.bat"
echo "%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 >> "%PROJECT_DIR%run_backend.bat"

start "OptiCut API Backend" cmd /k "%PROJECT_DIR%run_backend.bat"

echo [INFO] Attente de la disponibilite du Backend (port 8000)...
SET /A BACKEND_ATTEMPTS=0

:wait_backend
powershell -NoProfile -Command "try { $res = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL% equ 0 (
    echo [OK] Backend operationnel sur http://localhost:8000 !
    echo [OK] Backend operationnel >> "%LOG_FILE%"
    goto start_frontend
)
SET /A BACKEND_ATTEMPTS+=1
if %BACKEND_ATTEMPTS% geq 30 (
    echo [AVERTISSEMENT] Le backend n'a pas repondu apres 30 secondes. >> "%LOG_FILE%"
    echo [AVERTISSEMENT] Le backend met du temps a demarrer (30s). Continuation...
    goto start_frontend
)
timeout /t 1 /nobreak >nul
goto wait_backend

:start_frontend
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

echo [INFO] Attente de la disponibilite du Frontend (port 5173)...
SET /A FRONTEND_ATTEMPTS=0

:wait_frontend
powershell -NoProfile -Command "try { $res = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }"
if %ERRORLEVEL% equ 0 (
    echo [OK] Interface Web prete sur http://localhost:5173 !
    echo [OK] Frontend operationnel >> "%LOG_FILE%"
    goto open_browser
)
SET /A FRONTEND_ATTEMPTS+=1
if %FRONTEND_ATTEMPTS% geq 30 (
    echo [AVERTISSEMENT] Le frontend n'a pas repondu apres 30 secondes. >> "%LOG_FILE%"
    echo [AVERTISSEMENT] Le frontend met du temps a demarrer (30s). Tentative d'ouverture...
    goto open_browser
)
timeout /t 1 /nobreak >nul
goto wait_frontend

:open_browser
echo [3/3] Ouverture de l'application dans votre navigateur...
start http://localhost:5173

echo.
echo ============================================================
echo [OK] OPTICUT PRO EST EN COURS D'EXECUTION !
echo ============================================================
echo.
pause

