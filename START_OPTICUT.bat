@echo off
title Lancement OptiCut Pro V6

echo ETAPE 1 - Definition des dossiers
SET "BACKEND_DIR=%~dp0Moteur\Backend\System\Bin"
SET "FRONTEND_DIR=%~dp0Moteur\Frontend"

echo ETAPE 2 - Configuration de Conda
SET "CONDA_BAT=C:\Users\Mathe\anaconda3\Scripts\activate.bat"
IF NOT EXIST "%CONDA_BAT%" SET "CONDA_BAT=C:\ProgramData\anaconda3\Scripts\activate.bat"
CALL "%CONDA_BAT%" base

echo ETAPE 3 - Lancement du Backend
SET "UVICORN=C:\Users\Mathe\anaconda3\Scripts\uvicorn.exe"
start "OptiCut - Backend" /D "%BACKEND_DIR%" cmd /k "%UVICORN% app.main:app --host 127.0.0.1 --port 8000"

echo ETAPE 4 - Lancement du Frontend
start "OptiCut - Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev -- --host 127.0.0.1"

echo ETAPE 5 - Attente de 8 secondes
timeout /t 8 /nobreak

echo ETAPE 6 - Ouverture du navigateur
start http://127.0.0.1:5173

pause
