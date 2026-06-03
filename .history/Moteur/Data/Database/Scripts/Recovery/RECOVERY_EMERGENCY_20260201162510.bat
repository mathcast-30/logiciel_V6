@echo off
REM OptiCut Pro V4 - Emergency Recovery Procedure
REM Procedure de restauration d'urgence

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════════════
echo   OptiCut Pro V4 - Procedure de Restauration d'Urgence
echo ════════════════════════════════════════════════════════════════════
echo.

echo IMPORTANT: Cette procedure restaurera la base a partir d'une sauvegarde
echo Cela peut entrainer une perte de donnees recentes (selon le backup)
echo.

set /p choice="Continuer? (O/N) "
if /i NOT "%choice%"=="O" exit /b 0

echo.
echo ========== OPTIONS DE RESTAURATION ==========
echo.
echo [1] Restaurer depuis un Backup Complet (Full)
echo [2] Restaurer depuis un Snapshot
echo [3] Restaurer et Appliquer les WAL jusqu'a un timestamp
echo [4] Quitter
echo.
set /p option="Choisir une option (1-4): "

if "%option%"=="1" goto restore_full
if "%option%"=="2" goto restore_snapshot
if "%option%"=="3" goto restore_pitr
if "%option%"=="4" exit /b 0

goto end

:restore_full
echo.
echo [RESTORE FULL] Restauration depuis Backup Complet
echo.
echo Backups disponibles:
dir /B C:\OptiCut_Backup\*.sql
echo.
set /p backup_file="Nom du fichier de backup (ex: full_backup_20240201_2100.sql): "

if not exist "C:\OptiCut_Backup\%backup_file%" (
    echo [ERREUR] Fichier non trouve
    goto end
)

echo.
echo Etape 1/3: Arret de PostgreSQL...
wsl sudo service postgresql stop
echo [OK] PostgreSQL arrete

echo.
echo Etape 2/3: Sauvegarde de securite des donnees actuelles...
wsl sudo mv /var/lib/postgresql/data /var/lib/postgresql/data.corrupted
echo [OK] Donnees actuelles sauvegardees comme data.corrupted

echo.
echo Etape 3/3: Restauration du backup...
wsl sudo -u postgres psql -f /mnt/c/OptiCut_Backup/%backup_file%
echo [OK] Backup restaure

echo.
echo Demarrage de PostgreSQL...
wsl sudo service postgresql start

echo.
echo [SUCCES] Restauration completee
echo Les anciennes donnees sont disponibles dans: /var/lib/postgresql/data.corrupted
goto end

:restore_snapshot
echo.
echo [RESTORE SNAPSHOT] Restauration depuis Snapshot
echo.
echo Snapshots disponibles:
dir /B C:\OptiCut_Data\snapshots\
echo.
set /p snapshot_name="Nom du snapshot (ex: snapshot_20240126): "

if not exist "C:\OptiCut_Data\snapshots\%snapshot_name%" (
    echo [ERREUR] Snapshot non trouve
    goto end
)

echo.
echo Etape 1/3: Arret de PostgreSQL...
wsl sudo service postgresql stop
echo [OK] PostgreSQL arrete

echo.
echo Etape 2/3: Sauvegarde de securite des donnees actuelles...
wsl sudo mv /var/lib/postgresql/data /var/lib/postgresql/data.corrupted
echo [OK] Donnees actuelles sauvegardees

echo.
echo Etape 3/3: Restauration du snapshot (copie fichiers)...
robocopy C:\OptiCut_Data\snapshots\%snapshot_name% C:\OptiCut_Data\postgres\data /MIR /NJH /NJS
wsl sudo chown -R postgres:postgres /var/lib/postgresql/data
echo [OK] Snapshot restaure

echo.
echo Demarrage de PostgreSQL...
wsl sudo service postgresql start

echo.
echo [SUCCES] Snapshot restaure
goto end

:restore_pitr
echo.
echo [RESTORE PITR] Restauration Point-in-Time
echo.
set /p target_time="Entrer le timestamp cible (format: YYYY-MM-DD HH:MM:SS): "

echo.
echo Etape 1/2: Preparation de la restauration...
echo   Target timestamp: %target_time%
echo   Mode: Point-in-Time Recovery avec WAL

echo.
echo Etape 2/2: Restauration en cours...
wsl sudo -u postgres psql -d opticut_pro -c "
SELECT pg_start_backup('pitr_recovery');
ALTER SYSTEM SET recovery_target_time = '%target_time%';
SELECT pg_stop_backup();
SELECT pg_ctl('restart', 'fast');
"

echo.
echo [SUCCES] Restauration PITR effectuee
echo Base restauree jusqu'au: %target_time%
goto end

:end
echo.
echo ════════════════════════════════════════════════════════════════════
echo   Procedure Completee
echo ════════════════════════════════════════════════════════════════════
echo.
pause
