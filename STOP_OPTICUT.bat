@echo off
chcp 65001 >nul
title Arrêt d'OptiCut Pro V4

echo ============================================================
echo             ARRET D'OPTICUT PRO V4
echo ============================================================
echo.

echo [INFO] Etape 1 : Demande d'arret propre du Backend...
echo        (Cela permet de declencher la sauvegarde SQLite et le ZIP)
curl -m 5 -s http://localhost:8000/api/shutdown >nul 2>&1

echo [INFO] Attente de 3 secondes pour laisser la sauvegarde se terminer...
timeout /t 3 /nobreak >nul

echo.
echo [INFO] Etape 2 : Fermeture des processus...

REM 1. Fermeture precise par les ports pour eviter de tuer d'autres instances Node/Python
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":8000" ^| find "LISTENING"') DO (
    taskkill /F /PID %%P /T >nul 2>&1
)
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":5173" ^| find "LISTENING"') DO (
    taskkill /F /PID %%P /T >nul 2>&1
)

REM 2. Fermeture des fenetres de console CMD que nous avions ouvertes
taskkill /F /FI "WINDOWTITLE eq Backend - OptiCut Pro V4*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend - OptiCut Pro V4*" /T >nul 2>&1

echo.
echo ============================================================
echo [OK] OptiCut Pro V4 est completement arrete !
echo ============================================================
echo.
pause
