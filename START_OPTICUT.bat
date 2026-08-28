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
powershell -NoProfile -Command "$proc = Start-Process cmd -ArgumentList '/k cd /d \"%BACKEND_DIR%\" ^& \"%UVICORN%\" app.main:app --host 127.0.0.1 --port 8000' -PassThru; $proc.Id | Out-File -FilePath '%~dp0Moteur\UserData\opticut_backend.pid' -Encoding ascii"

echo ETAPE 4 - Lancement du Frontend
powershell -NoProfile -Command "$proc = Start-Process cmd -ArgumentList '/k cd /d \"%FRONTEND_DIR%\" ^& npm run dev -- --host 127.0.0.1' -PassThru; $proc.Id | Out-File -FilePath '%~dp0Moteur\UserData\opticut_frontend.pid' -Encoding ascii"

echo ETAPE 5 - Attente de 8 secondes
timeout /t 8 /nobreak

echo ETAPE 6 - Ouverture du navigateur
start http://127.0.0.1:5173

pause
