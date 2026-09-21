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
REM 2. Generation du wrapper VBS (lance le backend sans aucune fenetre visible)
REM ---------------------------------------------------------------------------
SET "VBS_FILE=%PROJECT_DIR%run_backend_hidden.vbs"

> "%VBS_FILE%" echo Set sh = CreateObject("WScript.Shell")
>>"%VBS_FILE%" echo sh.CurrentDirectory = "%BACKEND_DIR%"
>>"%VBS_FILE%" echo sh.Run """%PYTHON_EXE%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000", 0, False

echo [1/2] Demarrage du serveur OptiCut Pro (arriere-plan, invisible)...
start "" cscript //nologo "%VBS_FILE%"

REM ---------------------------------------------------------------------------
REM 3. Ouverture de la page de chargement (servie par le backend, pas en file://)
REM ---------------------------------------------------------------------------
echo [2/2] Ouverture de la page de chargement...
SET "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" SET "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" "http://localhost:8000/loading.html"
) else (
    start "" "http://localhost:8000/loading.html"
)

exit /b 0
