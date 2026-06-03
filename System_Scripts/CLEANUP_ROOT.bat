@echo off
REM Nettoyage racine - OptiCut Pro V4
REM Supprime tous les fichiers qui ont été déplacés vers Moteur/Data/

echo 🎯 NETTOYAGE RACINE - OptiCut Pro V4
echo ═════════════════════════════════════
echo.

cd /d "c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4"

echo Suppression des fichiers...
echo.

REM Fichiers .bat
del /F /Q BACKUP_ADVANCED.bat 2>nul
del /F /Q CHECK_HEALTH.bat 2>nul
del /F /Q COMPLETE_INSTALLATION.bat 2>nul
del /F /Q DEPLOY_STORAGE.bat 2>nul
del /F /Q MAINTENANCE_SCHEDULE.bat 2>nul
del /F /Q RECOVERY_EMERGENCY.bat 2>nul

REM Fichiers shell/PowerShell
del /F /Q backup_script.sh 2>nul
del /F /Q backup_strategy.ps1 2>nul
del /F /Q deploy_advanced_storage.ps1 2>nul
del /F /Q install_docker.ps1 2>nul
del /F /Q install_postgres_wsl.sh 2>nul
del /F /Q setup_advanced_storage.ps1 2>nul

REM Configuration
del /F /Q postgresql.conf 2>nul
del /F /Q POSTGRESQL_CONFIG_ADVANCED.conf 2>nul
del /F /Q init-db.sql 2>nul
del /F /Q docker-compose.yml 2>nul

REM Documentation
del /F /Q DEPLOYMENT_SUCCESS.md 2>nul
del /F /Q DEPLOYMENT_SUMMARY.md 2>nul
del /F /Q STORAGE_ARCHITECTURE_COMPLETE.md 2>nul
del /F /Q QUICKSTART.md 2>nul
del /F /Q FINAL_SUMMARY.md 2>nul
del /F /Q LIVRABLES.md 2>nul
del /F /Q INDEX.md 2>nul
del /F /Q PROPOSED_ARBORESCENCE.md 2>nul
del /F /Q FILE_ORGANIZATION_MAP.md 2>nul
del /F /Q OVERVIEW.md 2>nul

echo.
echo ✅ Nettoyage termInE!
echo.
echo Fichiers restants en racine (autorisés):
echo   ✓ LANCER_LOGICIEL.bat
echo   ✓ package.json
echo   ✓ README.md
echo   ✓ ORGANIZATION_COMPLETE.md
echo   ✓ ORGANIZATION_COMPLETE_SUMMARY.txt
echo.
echo Tous les autres fichiers sont maintenant organisés dans: Moteur/Data/
echo.
echo 📖 Consulter: Moteur/Data/MASTER_INDEX.md pour la navigation
echo.
pause
