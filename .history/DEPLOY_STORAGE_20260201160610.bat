@echo off
REM Deployment Script for OptiCut Pro V4 Advanced Storage Architecture
REM Platform: Windows 10/11 with WSL2

setlocal enabledelayedexpansion
set "DataPath=C:\OptiCut_Data"
set "BackupPath=C:\OptiCut_Backup"

echo.
echo ════════════════════════════════════════════════════════════════════
echo   OptiCut Pro V4 - Deployment de l'Architecture de Stockage Avancee
echo ════════════════════════════════════════════════════════════════════
echo.

REM ========== ETAPE 1: Preparation des Repertoires ==========
echo [ETAPE 1/5] Creation des Repertoires...
if not exist "%DataPath%" mkdir "%DataPath%"
if not exist "%DataPath%\postgres" mkdir "%DataPath%\postgres"
if not exist "%DataPath%\snapshots" mkdir "%DataPath%\snapshots"
if not exist "%BackupPath%" mkdir "%BackupPath%"
if not exist "%BackupPath%\wal" mkdir "%BackupPath%\wal"
if not exist "%BackupPath%\daily" mkdir "%BackupPath%\daily"
if not exist "%BackupPath%\snapshots" mkdir "%BackupPath%\snapshots"
echo   [OK] Repertoires crees

echo.
echo [ETAPE 2/5] Verification de WSL...
wsl --list --verbose >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERREUR] WSL n'est pas installe. Veuillez installer WSL2
    pause
    exit /b 1
)
echo   [OK] WSL detecte

echo.
echo [ETAPE 3/5] Installation de PostgreSQL sur WSL...
echo   Execution de mise a jour...
wsl sudo apt-get update -y >nul 2>&1
echo   Installation de PostgreSQL...
wsl sudo apt-get install -y postgresql postgresql-contrib >nul 2>&1
echo   [OK] PostgreSQL installe

echo.
echo [ETAPE 4/5] Configuration de la Base de Donnees...
wsl sudo service postgresql start >nul 2>&1
echo   Creation de l'utilisateur opticut_user...
wsl sudo -u postgres psql -c "CREATE USER opticut_user WITH PASSWORD 'SecureOpticut2024!#' CREATEDB;" >nul 2>&1
echo   Creation de la base opticut_pro...
wsl sudo -u postgres psql -c "CREATE DATABASE opticut_pro OWNER opticut_user;" >nul 2>&1
echo   [OK] Base de donnees configuree

echo.
echo [ETAPE 5/5] Configuration des Parametres Avances...
wsl sudo -u postgres psql -d opticut_pro -c "CREATE SCHEMA IF NOT EXISTS opticut;" >nul 2>&1
wsl sudo -u postgres psql -d opticut_pro -c "CREATE TABLE IF NOT EXISTS opticut.metadata (id SERIAL PRIMARY KEY, key VARCHAR(255) UNIQUE, value TEXT, created_at TIMESTAMP DEFAULT NOW());" >nul 2>&1
wsl sudo -u postgres psql -d opticut_pro -c "INSERT INTO opticut.metadata (key, value) VALUES ('version', '4.0.0'), ('storage_type', 'PostgreSQL Advanced'), ('wal_enabled', 'true');" >nul 2>&1
echo   [OK] Schema et tables crees

echo.
echo ════════════════════════════════════════════════════════════════════
echo   DEPLOYMENT REUSSI !
echo ════════════════════════════════════════════════════════════════════
echo.
echo   Informations de connexion:
echo   - Host: localhost (via WSL)
echo   - Port: 5432
echo   - Database: opticut_pro
echo   - User: opticut_user
echo   - Password: SecureOpticut2024!#
echo.
echo   Donnees: %DataPath%
echo   Sauvegardes: %BackupPath%
echo.
echo   Commandes WSL utiles:
echo   - Demarrer PG: wsl sudo service postgresql start
echo   - Connexion: wsl sudo -u postgres psql -d opticut_pro
echo   - Sauvegarde: wsl sudo -u postgres pg_dump -d opticut_pro ^> backup.sql
echo.
pause
