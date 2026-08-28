@echo off
chcp 65001 >nul
title Arrêt d'OptiCut Pro V6

echo ============================================================
echo             ARRET D'OPTICUT PRO V6
echo ============================================================
echo.

SET "USERDATA_DIR=%~dp0Moteur\UserData"

echo [INFO] Etape 1 : Demande d'arret propre du Backend...
echo        (Declenchement de la sauvegarde et terminaison controlee)
curl -m 5 -s http://localhost:8000/api/shutdown >nul 2>&1

echo [INFO] Attente de 2 secondes...
timeout /t 2 /nobreak >nul

echo.
echo [INFO] Etape 2 : Fermeture ciblee des processus par PID...

REM 1. Arret du Backend via PID
IF EXIST "%USERDATA_DIR%\opticut_backend.pid" (
    SET /P BACKEND_PID=<"%USERDATA_DIR%\opticut_backend.pid"
    IF DEFINED BACKEND_PID (
        echo [INFO] Arret du Backend (PID: %BACKEND_PID%)...
        taskkill /F /T /PID %BACKEND_PID% >nul 2>&1
    )
    del "%USERDATA_DIR%\opticut_backend.pid" >nul 2>&1
)

REM 2. Arret du Frontend via PID
IF EXIST "%USERDATA_DIR%\opticut_frontend.pid" (
    SET /P FRONTEND_PID=<"%USERDATA_DIR%\opticut_frontend.pid"
    IF DEFINED FRONTEND_PID (
        echo [INFO] Arret du Frontend (PID: %FRONTEND_PID%)...
        taskkill /F /T /PID %FRONTEND_PID% >nul 2>&1
    )
    del "%USERDATA_DIR%\opticut_frontend.pid" >nul 2>&1
)

REM 3. Arret du serveur de logs via PID
IF EXIST "%USERDATA_DIR%\opticut_logs.pid" (
    SET /P LOGS_PID=<"%USERDATA_DIR%\opticut_logs.pid"
    IF DEFINED LOGS_PID (
        echo [INFO] Arret du Serveur de Logs (PID: %LOGS_PID%)...
        taskkill /F /T /PID %LOGS_PID% >nul 2>&1
    )
    del "%USERDATA_DIR%\opticut_logs.pid" >nul 2>&1
)

REM 4. Filet de securite : verification et fermeture des ports dedies uniquement
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":8000" ^| find "LISTENING"') DO (
    taskkill /F /PID %%P /T >nul 2>&1
)
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":5173" ^| find "LISTENING"') DO (
    taskkill /F /PID %%P /T >nul 2>&1
)

REM 5. Fermeture des fenetres de console specifiques
taskkill /F /FI "WINDOWTITLE eq OptiCut*" /T >nul 2>&1

echo.
echo ============================================================
echo [OK] OptiCut Pro est completement arrete en toute securite !
echo ============================================================
echo.
pause
