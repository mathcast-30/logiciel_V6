@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR MODE DEVELOPPEMENT (HOT-RELOAD VITE)
REM Backend avec --reload (Port 8000) + Frontend Vite Dev Server (Port 5173)
REM =============================================================================
title OptiCut Pro - Mode Developpement...

SET "PROJECT_DIR=%~dp0"
SET "BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin"
SET "FRONTEND_DIR=%PROJECT_DIR%Moteur\Frontend"
SET "USERDATA_DIR=%PROJECT_DIR%Moteur\UserData"
SET "LOG_FILE=%USERDATA_DIR%\last_dev_launch_error.log"

REM Initialisation du dossier UserData et du fichier de log
if not exist "%USERDATA_DIR%" mkdir "%USERDATA_DIR%"
echo [%DATE% %TIME%] === Lancement Mode Developpement === > "%LOG_FILE%"

echo.
echo ============================================================
echo      OPTICUT PRO - DEMARRAGE EN MODE DEVELOPPEMENT
echo ============================================================
echo.

REM 1. Detection dynamique de l'interpreteur Python
SET "PYTHON_EXE="

if defined OPTICUT_CONDA_ENV (
    if exist "%OPTICUT_CONDA_ENV%\python.exe" (
        SET "PYTHON_EXE=%OPTICUT_CONDA_ENV%\python.exe"
    ) else if exist "%OPTICUT_CONDA_ENV%" (
        SET "PYTHON_EXE=%OPTICUT_CONDA_ENV%"
    )
)

if not defined PYTHON_EXE (
    for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$found = ''; try { $lines = & conda env list 2>$null; foreach ($line in $lines) { $t = $line.Trim(); if ($t -match 'opticut_pro' -and (-not $t.StartsWith('#'))) { $parts = $t -split '\s+'; $target = $parts[-1]; if (Test-Path \"$target\python.exe\") { $found = \"$target\python.exe\"; break } } } } catch {}; if (-not $found) { $common = @(\"$env:USERPROFILE\anaconda3\envs\opticut_pro\python.exe\", \"$env:USERPROFILE\miniconda3\envs\opticut_pro\python.exe\", \"$env:LOCALAPPDATA\anaconda3\envs\opticut_pro\python.exe\", \"$env:LOCALAPPDATA\miniconda3\envs\opticut_pro\python.exe\", \"C:\ProgramData\anaconda3\envs\opticut_pro\python.exe\", \"C:\ProgramData\miniconda3\envs\opticut_pro\python.exe\", \"C:\anaconda3\envs\opticut_pro\python.exe\", \"C:\miniconda3\envs\opticut_pro\python.exe\"); foreach ($p in $common) { if (Test-Path $p) { $found = $p; break } } }; Write-Output $found"`) do (
        SET "PYTHON_EXE=%%I"
    )
)

if not defined PYTHON_EXE (
    echo [ERREUR CRITIQUE] Environnement Conda 'opticut_pro' introuvable !
    pause
    exit /b 1
)

REM 2. Verification de Node.js pour Vite Dev Server
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR CRITIQUE] Node.js est introuvable pour le serveur Vite.
    pause
    exit /b 1
)

REM 3. Verification node_modules
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Installation des modules frontend...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

echo [OK] Environnement de developpement verifie.
echo [1/3] Demarrage Backend FastAPI (Port 8000 --reload)...

echo @echo off > "%PROJECT_DIR%run_backend_dev.bat"
echo title OptiCut API Backend (Dev) >> "%PROJECT_DIR%run_backend_dev.bat"
echo cd /d "%BACKEND_DIR%" >> "%PROJECT_DIR%run_backend_dev.bat"
echo "%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 >> "%PROJECT_DIR%run_backend_dev.bat"

start "OptiCut API Backend (Dev)" cmd /k "%PROJECT_DIR%run_backend_dev.bat"

:wait_backend
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_backend
)
echo [OK] Backend operationnel sur http://localhost:8000 !
goto start_frontend

:start_frontend
echo [2/3] Demarrage Frontend Vite (Port 5173 npm run dev)...

echo @echo off > "%PROJECT_DIR%run_frontend_dev.bat"
echo title OptiCut Vite Dev Server >> "%PROJECT_DIR%run_frontend_dev.bat"
echo cd /d "%FRONTEND_DIR%" >> "%PROJECT_DIR%run_frontend_dev.bat"
echo npm run dev >> "%PROJECT_DIR%run_frontend_dev.bat"

start "OptiCut Vite Dev Server" cmd /k "%PROJECT_DIR%run_frontend_dev.bat"

:wait_frontend
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_frontend
)
echo [OK] Serveur Vite pret sur http://localhost:5173 !
goto open_browser

:open_browser
echo [3/3] Ouverture de http://localhost:5173...
start http://localhost:5173

echo.
echo ============================================================
echo [OK] MODE DEVELOPPEMENT ACTIF (HOT-RELOAD VITE)
echo ============================================================
echo.
pause
