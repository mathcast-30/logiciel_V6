@echo off
title OptiCut Pro Master Launcher
color 0B
echo ============================================================
echo      OPTICUT PRO - SUITE LOGICIELLE INDUSTRIELLE
echo ============================================================
echo.

:: Check for Moteur folder
if not exist "Moteur" (
    echo [ERREUR] Dossier 'Moteur' introuvable ! 
    pause
    exit
)

:: Detection de Python
set "SYS_PYTHON=python"
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 0 (
        set "SYS_PYTHON=py"
    ) else (
        echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH.
        echo Veuillez l'installer depuis python.org
        pause
        exit
    )
)

:: 1. Lancement du Backend (API)
echo [SYSTEM] Demarrage du Moteur Backend...
start "OptiCut Backend (API)" /D "Moteur\Backend" cmd /k "System\Tools\launch_server.bat"

:: 2. Lancement du Frontend (Interface PC)
echo [SYSTEM] Demarrage de l'Interface PC...
if exist "Moteur\Frontend" (
    start "OptiCut Frontend (PC)" /D "Moteur\Frontend" cmd /k "npm run dev"
)

:: 3. Lancement du Mobile (Interface Atelier)
echo [SYSTEM] Demarrage de l'Interface Atelier (Mobile)...
if exist "Moteur\Mobile" (
    start "OptiCut Mobile (Atelier)" /D "Moteur\Mobile" cmd /k "npm run dev -- --host"
)

echo.
echo ============================================================
echo [OK] Tout est en marche ! 
echo API    : http://localhost:8000
echo PC     : http://localhost:5173
echo MOBILE : http://[VOTRE_IP]:5173 (Voir fenetre Mobile)
echo ============================================================
echo.
echo Ne fermez PAS cette fenetre si vous voulez garder les services actifs.
pause
