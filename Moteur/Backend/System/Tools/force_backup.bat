@echo off
setlocal
:: Ce script effectue une sauvegarde d'urgence de la base de données
cd /d "%~dp0"
:: On remonte de System/Tools vers Moteur/Backend
cd ..\..
:: On remonte vers Moteur/ pour atteindre UserData/
set "DB_FILE=..\UserData\BaseDeDonnees\opticut.db"
set "BACKUP_DIR=..\UserData\Sauvegardes\Safe_Archives"

echo ==========================================
echo       SAUVEGARDE DE SECURITE OPTICUT
echo ==========================================

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%"

if exist "%DB_FILE%" (
    copy "%DB_FILE%" "%BACKUP_DIR%\db_prelaunch_%TIMESTAMP%.bak"
    echo [OK] Sauvegarde effectuee dans Moteur/UserData/Sauvegardes
) else (
    echo [AVERTISSEMENT] Aucune base de donnees existante a sauvegarder.
)

timeout /t 2 > nul
