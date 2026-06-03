@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Mise à jour OptiCut Pro V4

SET PROJECT_DIR=%~dp0
SET DB_PATH=%PROJECT_DIR%Moteur\UserData\BaseDeDonnees\opticut.db
SET BACKUP_DIR=%PROJECT_DIR%sauvegardes_avant_maj
SET BACKEND_DIR=%PROJECT_DIR%Moteur\Backend\System\Bin
SET FRONTEND_DIR=%PROJECT_DIR%Moteur\Frontend

echo === Mise à jour OptiCut Pro V4 ===
echo Vérification des mises à jour disponibles...
echo.

REM 2. Vérification de Git
where git >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERREUR : Git n'est pas installé. Téléchargez-le sur https://git-scm.com
    echo.
    pause
    exit /b 1
)

REM 3. Vérification que le logiciel n'est pas en cours d'exécution
netstat -ano | findstr ":8000" | find "LISTENING" >nul 2>&1
SET PORT8000_IN_USE=%ERRORLEVEL%
netstat -ano | findstr ":5173" | find "LISTENING" >nul 2>&1
SET PORT5173_IN_USE=%ERRORLEVEL%

IF %PORT8000_IN_USE% EQU 0 SET APP_RUNNING=1
IF %PORT5173_IN_USE% EQU 0 SET APP_RUNNING=1

IF DEFINED APP_RUNNING (
    echo ATTENTION : OptiCut est en cours d'utilisation. Fermez-le d'abord 
    echo via STOP_OPTICUT.bat puis relancez la mise à jour.
    echo.
    pause
    exit /b 1
)

REM Lecture des anciens hash (s'ils existent)
SET OLD_REQ_HASH=none
IF EXIST "%PROJECT_DIR%.last_requirements_hash" (
    set /p OLD_REQ_HASH=<"%PROJECT_DIR%.last_requirements_hash"
)
SET OLD_PKG_HASH=none
IF EXIST "%PROJECT_DIR%.last_package_hash" (
    set /p OLD_PKG_HASH=<"%PROJECT_DIR%.last_package_hash"
)

REM 4. Sauvegarde automatique de la base de données (si elle existe)
IF EXIST "%DB_PATH%" (
    IF NOT EXIST "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
    FOR /F "tokens=*" %%g IN ('powershell -Command "Get-Date -format 'yyyy-MM-dd_HH\hmm'"') do (SET DATETIME=%%g)
    copy "%DB_PATH%" "%BACKUP_DIR%\opticut_avant_maj_!DATETIME!.db" >nul
    IF ERRORLEVEL 1 (
        echo ERREUR : Impossible de sauvegarder opticut.db. La mise a jour est annulee.
        pause
        exit /b 1
    )
    echo Base de données sauvegardée avec succès.
)

REM 5. Mise à jour via Git
cd /d "%PROJECT_DIR%"
git pull origin main
IF ERRORLEVEL 1 (
    echo.
    echo ERREUR : La mise à jour a échoué. Votre version actuelle est conservée.
    echo Vérifiez votre connexion internet et réessayez.
    echo.
    pause
    exit /b 1
)

echo.

REM 6. Verification de requirements.txt (Python)
SET NEW_REQ_HASH=none
IF EXIST "%BACKEND_DIR%\requirements.txt" (
    FOR /F "skip=1 delims=" %%h IN ('certutil -hashfile "%BACKEND_DIR%\requirements.txt" MD5') DO (
        SET NEW_REQ_HASH=%%h
        GOTO ReqHashDone
    )
)
:ReqHashDone
SET NEW_REQ_HASH=%NEW_REQ_HASH: =%

IF NOT "%NEW_REQ_HASH%"=="%OLD_REQ_HASH%" (
    call conda activate base >nul 2>&1
    cd /d "%BACKEND_DIR%"
    call pip install -r requirements.txt >nul 2>&1
    echo %NEW_REQ_HASH%>"%PROJECT_DIR%.last_requirements_hash"
    echo Nouvelles dépendances Python installées.
)

REM 7. Verification de package.json (Node.js)
SET NEW_PKG_HASH=none
IF EXIST "%FRONTEND_DIR%\package.json" (
    FOR /F "skip=1 delims=" %%h IN ('certutil -hashfile "%FRONTEND_DIR%\package.json" MD5') DO (
        SET NEW_PKG_HASH=%%h
        GOTO PkgHashDone
    )
)
:PkgHashDone
SET NEW_PKG_HASH=%NEW_PKG_HASH: =%

IF NOT "%NEW_PKG_HASH%"=="%OLD_PKG_HASH%" (
    cd /d "%FRONTEND_DIR%"
    call npm install >nul 2>&1
    echo %NEW_PKG_HASH%>"%PROJECT_DIR%.last_package_hash"
    echo Nouvelles dépendances Node.js installées.
)

echo.
echo === Mise à jour terminée avec succès ! ===
echo Vous pouvez relancer OptiCut Pro V4 via le raccourci bureau.
echo.
pause
