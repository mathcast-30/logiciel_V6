@echo off
REM =============================================================================
REM OPTICUT PRO - LANCEUR PRINCIPAL (Usage Quotidien)
REM Backend FastAPI sert aussi le frontend statique sur le port 8000
REM =============================================================================
title OptiCut Pro - Demarrage...

SET "PROJECT_DIR=%~dp0"
SET "BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin"
SET "USERDATA_DIR=%PROJECT_DIR%Moteur\UserData"
SET "LOG_FILE=%USERDATA_DIR%\last_launch_error.log"

if not exist "%USERDATA_DIR%" mkdir "%USERDATA_DIR%"
echo [%DATE% %TIME%] === Lancement OptiCut Pro (Port 8000) === > "%LOG_FILE%"

echo.
echo ============================================================
echo          OPTICUT PRO - DEMARRAGE DU SYSTEME
echo ============================================================
echo.

REM ---------------------------------------------------------------------------
REM 1. Interpreteur Python de l'environnement opticut_pro (chemin fixe, fiable)
REM ---------------------------------------------------------------------------
SET "PYTHON_EXE="

if defined OPTICUT_CONDA_ENV (
    if exist "%OPTICUT_CONDA_ENV%\python.exe" (
        SET "PYTHON_EXE=%OPTICUT_CONDA_ENV%\python.exe"
    ) else if exist "%OPTICUT_CONDA_ENV%" (
        SET "PYTHON_EXE=%OPTICUT_CONDA_ENV%"
    )
)

if not defined PYTHON_EXE (
    if exist "C:\Users\Mathe\anaconda3\envs\opticut_pro\python.exe" (
        SET "PYTHON_EXE=C:\Users\Mathe\anaconda3\envs\opticut_pro\python.exe"
    )
)

if not defined PYTHON_EXE (
    echo [ERREUR CRITIQUE] Environnement Conda 'opticut_pro' introuvable ! >> "%LOG_FILE%"
    echo ============================================================
    echo [ERREUR CRITIQUE] L'environnement Conda 'opticut_pro' est introuvable !
    echo ============================================================
    echo.
    echo Pour creer et configurer cet environnement, veuillez executer setup_env.bat
    echo ou definir la variable d'environnement OPTICUT_CONDA_ENV.
    echo.
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [ERREUR CRITIQUE] Interpreteur introuvable : %PYTHON_EXE% >> "%LOG_FILE%"
    echo [ERREUR CRITIQUE] Interpreteur introuvable : %PYTHON_EXE%
    echo.
    echo Veuillez executer setup_env.bat pour reinitialiser l'environnement.
    pause
    exit /b 1
)

echo [OK] Environnement Python detecte : %PYTHON_EXE%
echo [INFO] Python : %PYTHON_EXE% >> "%LOG_FILE%"

REM ---------------------------------------------------------------------------
REM 2a. Generation du wrapper VBS pour le backend principal (port 8000)
REM ---------------------------------------------------------------------------
SET "VBS_BACKEND=%PROJECT_DIR%run_backend_hidden.vbs"

> "%VBS_BACKEND%" echo Set sh = CreateObject("WScript.Shell")
>>"%VBS_BACKEND%" echo sh.Run "cmd /c cd /d ""%BACKEND_DIR%"" && ""%PYTHON_EXE%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000", 0, False

echo [1/3] Demarrage du backend OptiCut Pro (arriere-plan, invisible)...
start "" cscript //nologo "%VBS_BACKEND%"

REM ---------------------------------------------------------------------------
REM 2b. Generation du wrapper VBS pour le micro-serveur de chargement (port 8090)
REM ---------------------------------------------------------------------------
SET "VBS_LOADING=%PROJECT_DIR%run_loading_hidden.vbs"

> "%VBS_LOADING%" echo Set sh = CreateObject("WScript.Shell")
>>"%VBS_LOADING%" echo sh.CurrentDirectory = "%PROJECT_DIR%"
>>"%VBS_LOADING%" echo sh.Run """%PYTHON_EXE%"" Tools\loading_server.py", 0, False

echo [2/3] Demarrage du serveur de chargement (port 8090, arriere-plan)...
start "" cscript //nologo "%VBS_LOADING%"

REM Courte pause (600ms) pour que le micro-serveur 8090 ait le temps de lier le port
REM avant que Chrome ne s'ouvre (Python stdlib demarre en <200ms)
powershell -NoProfile -Command "Start-Sleep -Milliseconds 600"

REM ---------------------------------------------------------------------------
REM 3. Ouverture IMMEDIATE de Chrome sur la page d'attente (port 8090)
REM    C'est le JS de la page qui poll /health du backend - pas le .bat
REM ---------------------------------------------------------------------------
echo [3/3] Ouverture de l'application dans Chrome...
SET "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" SET "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" "http://localhost:8090/"
) else (
    start "" "http://localhost:8090/"
)

exit /b 0
