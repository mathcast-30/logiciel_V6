@echo off
REM =============================================================================
REM OPTICUT PRO - INSTALLATION COMPLETE
REM =============================================================================
REM Ce script execute le setup automatique dans Anaconda Prompt
REM =============================================================================

echo.
echo ============================================================
echo    OPTICUT PRO - INSTALLATION
echo ============================================================
echo.

SET CONDA_ENV=opticut_pro
SET PROJECT_DIR=%~dp0

echo [INFO] Ce script va installer tous les composants STEP Import
echo [INFO] Repertoire: %PROJECT_DIR%
echo.

REM Activer Conda
echo [1/2] Activation de l'environnement Conda...
CALL conda activate %CONDA_ENV%
IF ERRORLEVEL 1 (
    echo [ERREUR] Environnement "%CONDA_ENV%" introuvable
    echo.
    echo Creez-le d'abord avec:
    echo   conda create -n opticut_pro python=3.9
    echo   conda activate opticut_pro
    echo   conda install -c conda-forge pythonocc-core numpy
    echo.
    pause
    exit /b 1
)
echo [OK] Environnement active
echo.

REM Executer le script d'installation
echo [2/2] Execution de setup_opticut.py...
echo.
cd /d "%PROJECT_DIR%"
python setup_opticut.py

echo.
echo ============================================================
echo    INSTALLATION TERMINEE
echo ============================================================
echo.
echo Vous pouvez maintenant lancer le serveur avec:
echo   - Double-cliquer sur: start_pro.bat
echo   - Ou manuellement dans Anaconda Prompt
echo.
pause
