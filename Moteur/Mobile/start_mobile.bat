@echo off
echo ============================================
echo   OPTICUT PRO - VERSION MOBILE ATELIER
echo ============================================
echo.
echo Demarrage de l'application mobile...
echo.
echo Sur votre telephone Samsung Galaxy A54:
echo   1. Connectez-vous au meme WiFi que ce PC
echo   2. Ouvrez Chrome sur le telephone
echo   3. Entrez l'adresse affichee ci-dessous
echo.
echo ============================================

cd /d "%~dp0"
cmd /c "npm run dev -- --host"
