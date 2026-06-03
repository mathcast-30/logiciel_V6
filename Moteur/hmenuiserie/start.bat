@echo off
echo.
echo ===============================================
echo    H MENUISERIE - DEMARRAGE PWA
echo ===============================================
echo.

:: Vérifier si les certificats existent
if not exist "cert.pem" (
    echo [!] Certificats HTTPS non trouvés
    echo.
    echo     Pour les générer:
    echo     mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.0.34
    echo.
    pause
    exit /b 1
)

:: Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js n'est pas installé
    echo.
    echo     Téléchargez Node.js sur: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Démarrer le backend en arrière-plan
echo [1/2] Démarrage du backend...
start "Backend OptiCut" cmd /k "cd ..\backend && py -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: Démarrer le serveur PWA
echo [2/2] Démarrage du serveur PWA HTTPS...
echo.
echo     Ouvrez sur votre téléphone:
echo     https://192.168.0.34:4443
echo.
echo     Ou sur votre PC:
echo     https://localhost:4443
echo.
node server.js

pause

