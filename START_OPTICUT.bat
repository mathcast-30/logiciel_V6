@echo off
title Lancement OptiCut Pro V4

echo === Lancement OptiCut Pro V4 ===
echo.

SET "BACKEND_DIR=%~dp0Moteur\Backend\System\Bin"
IF EXIST "%~dp0Moteur\Backend\app\main.py" SET "BACKEND_DIR=%~dp0Moteur\Backend"

SET "FRONTEND_DIR=%~dp0Moteur\Frontend"

IF NOT EXIST "%BACKEND_DIR%\app\main.py" (
    echo ERREUR : Le dossier Backend ou app\main.py est introuvable.
    pause
    exit /b 1
)

IF NOT EXIST "%FRONTEND_DIR%\package.json" (
    echo ERREUR : Le dossier Frontend ou package.json est introuvable.
    pause
    exit /b 1
)

IF NOT EXIST "%FRONTEND_DIR%\node_modules" (
    echo INFO : node_modules introuvable. Installation de npm en cours...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

IF NOT EXIST "%BACKEND_DIR%\requirements.txt" (
    echo AVERTISSEMENT : requirements.txt est introuvable dans le Backend.
)

start "OptiCut - Backend" /D "%BACKEND_DIR%" cmd /k "call conda activate base && uvicorn app.main:app --reload --port 8000"

start "OptiCut - Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul

start http://localhost:5173

echo.
echo OptiCut Pro V4 est lance. Fermez les terminaux pour arreter.
pause
