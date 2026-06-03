@echo off
setlocal enabledelayedexpansion
title OptiCut Backend Manager

echo ============================================================
echo.

:: Ensure we are in the Backend root directory
cd /d "%~dp0\..\.."

:: 1. Detect System Python
set "SYS_PYTHON="
for %%V in (3.12 3.11 3.10 3.9) do (
    if not defined SYS_PYTHON (
        py -%%V --version >nul 2>&1
        if not errorlevel 1 set "SYS_PYTHON=py -%%V"
    )
)

if not defined SYS_PYTHON (
    python --version >nul 2>&1
    if not errorlevel 1 set "SYS_PYTHON=python"
)

if not defined SYS_PYTHON (
    py --version >nul 2>&1
    if not errorlevel 0 (
        set "SYS_PYTHON=py"
    )
)

if not defined SYS_PYTHON (
    echo [ERREUR] Python introuvable sur le systeme.
    pause
    exit /b 1
)

:: 2. Environment Health Check
set "VENV_PATH=System\Runtime\venv"
set "VENV_PYTHON=%VENV_PATH%\Scripts\python.exe"
set "REPAIR_NEEDED=0"

if not exist "%VENV_PYTHON%" (
    echo [INFO] Environnement virtuel inexistant. Creation...
    set "REPAIR_NEEDED=1"
) else (
    "%VENV_PYTHON%" -m pip --version >nul 2>&1
    if errorlevel 1 (
        echo [ALERTE] Pip est corrompu dans l'environnement virtuel.
        set "REPAIR_NEEDED=1"
    ) else (
        rem Verifier si le venv est en 3.14 (experimental) pour forcer la migration
        "%VENV_PYTHON%" -c "import sys; sys.exit(0 if '3.14' in sys.version else 1)" >nul 2>&1
        if not errorlevel 1 (
            echo [ALERTE] Environnement Python 3.14 detecte ^(non supporte^).
            set "REPAIR_NEEDED=1"
        )
    )
)

:: 3. Execute Repair if needed
if "%REPAIR_NEEDED%"=="1" (
    echo [REPARATION] Nettoyage de l'ancien environnement...
    powershell -Command "Stop-Process -Name 'python', 'uvicorn' -ErrorAction SilentlyContinue"
    powershell -Command "if (Test-Path '%VENV_PATH%') { Remove-Item -Path '%VENV_PATH%' -Recurse -Force -ErrorAction SilentlyContinue }"
    
    rem Wait a bit for file locks to release
    timeout /t 2 /nobreak >nul
    
    echo [REPARATION] Creation du nouvel environnement...
    %SYS_PYTHON% -m venv "%VENV_PATH%"
    if errorlevel 1 (
        echo [ERREUR] Echec de la creation de l'environnement virtuel.
        pause
        exit /b 1
    )
    echo [OK] Environnement cree.
)

:: 4. Install/Update Dependencies
echo [SYSTEM] Verification des dependances...
"%VENV_PYTHON%" -m pip install --upgrade pip >nul 2>&1
"%VENV_PYTHON%" -m pip install -r System\Bin\requirements.txt
if errorlevel 1 (
    echo [ERREUR] Echec de l'installation des dependances.
    pause
    exit /b 1
)

:: 5. Launch Server
echo [SYSTEM] Nettoyage du port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1

echo [SYSTEM] Demarrage du serveur Uvicorn...
"%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir System/Bin
if errorlevel 1 (
    echo [ERREUR] Le serveur s'est arrete de maniere inattendue.
    pause
)
