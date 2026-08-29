@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR PRINCIPAL (Usage Quotidien)
REM Servir Backend FastAPI + Frontend React directement sur le port 8000
REM =============================================================================
title OptiCut Pro - Demarrage...

SET "PROJECT_DIR=%~dp0"
SET "BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin"
SET "USERDATA_DIR=%PROJECT_DIR%Moteur\UserData"
SET "LOG_FILE=%USERDATA_DIR%\last_launch_error.log"

REM Initialisation du dossier UserData et du fichier de log
if not exist "%USERDATA_DIR%" mkdir "%USERDATA_DIR%"
echo [%DATE% %TIME%] === Lancement OptiCut Pro (Port 8000) === > "%LOG_FILE%"

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

echo [OK] Environnement Python detecte : %PYTHON_EXE%
echo [1/2] Demarrage du Serveur OptiCut Pro (Backend + Frontend sur Port 8000)...
echo [INFO] Lancement du serveur avec %PYTHON_EXE% >> "%LOG_FILE%"

REM Creation du script de lancement backend
echo @echo off > "%PROJECT_DIR%run_backend.bat"
echo title OptiCut Pro Server (Port 8000) >> "%PROJECT_DIR%run_backend.bat"
echo cd /d "%BACKEND_DIR%" >> "%PROJECT_DIR%run_backend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_backend.bat"
echo echo   OPTICUT PRO - SERVEUR APPLICATION (Port 8000) >> "%PROJECT_DIR%run_backend.bat"
echo echo ============================================================ >> "%PROJECT_DIR%run_backend.bat"
echo "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "%PROJECT_DIR%run_backend.bat"

start "OptiCut Pro Server" cmd /k "%PROJECT_DIR%run_backend.bat"

echo [2/2] Attente de la disponibilite du serveur (http://localhost:8000)...

:wait_server
powershell -NoProfile -Command "try { $res = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL% equ 0 (
    echo [OK] Serveur operationnel sur http://localhost:8000 !
    echo [OK] Serveur operationnel >> "%LOG_FILE%"
    goto open_browser
)
timeout /t 1 /nobreak >nul
goto wait_server

:open_browser
echo Ouverture de l'application dans votre navigateur...
start http://localhost:8000

echo.
echo ============================================================
echo [OK] OPTICUT PRO EST EN COURS D'EXECUTION !
echo ============================================================
echo.
echo URL d'acces : http://localhost:8000
echo.
echo Vous pouvez minimiser cette fenetre.
echo Laissez ouverte la fenetre du serveur.
echo.
pause
