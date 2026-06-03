@echo off
REM Completion Script - OptiCut Pro V4 Advanced Storage
REM Finalise l'installation PostgreSQL sur WSL

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════════════
echo   OptiCut Pro V4 - Finalisation Installation PostgreSQL
echo ════════════════════════════════════════════════════════════════════
echo.

REM Vérifier que Ubuntu est installé
echo [VERIFICATION] Vérification d'Ubuntu sur WSL...
wsl --list -v | find "Ubuntu" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERREUR] Ubuntu n'est pas installé sur WSL
    echo   Veuillez d'abord exécuter: wsl --install -d Ubuntu
    pause
    exit /b 1
)
echo   [OK] Ubuntu détecté

echo.
echo [INSTALLATION] Installation de PostgreSQL via WSL...
wsl bash /mnt/c/Users/Mathe/Documents/Matheo/passion/menuiserie/optimisation/different\ script/logiciel_V4/install_postgres_wsl.sh

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCES] PostgreSQL installé et configuré
    
    REM Créer les répertoires de sauvegarde
    if not exist C:\OptiCut_Backup mkdir C:\OptiCut_Backup
    if not exist C:\OptiCut_Backup\wal mkdir C:\OptiCut_Backup\wal
    if not exist C:\OptiCut_Backup\daily mkdir C:\OptiCut_Backup\daily
    if not exist C:\OptiCut_Data mkdir C:\OptiCut_Data
    if not exist C:\OptiCut_Data\snapshots mkdir C:\OptiCut_Data\snapshots
    
    echo.
    echo ════════════════════════════════════════════════════════════════════
    echo   Installation OptiCut Pro V4 Advanced Storage
    echo   ✅ COMPLÉTÉE ET PRÊTE POUR LA PRODUCTION
    echo ════════════════════════════════════════════════════════════════════
    echo.
    echo   Prochaines étapes:
    echo   1. Vérifier la santé: .\CHECK_HEALTH.bat
    echo   2. Créer un backup: .\BACKUP_ADVANCED.bat
    echo   3. Lire la documentation: QUICKSTART.md
    echo.
    echo   Base de données disponible à: localhost:5432
    echo   User: opticut_user
    echo   Password: SecureOpticut2024!#
    echo.
) else (
    echo.
    echo [ERREUR] Problème lors de l'installation
    echo Vérifiez les logs WSL
)

echo.
pause
