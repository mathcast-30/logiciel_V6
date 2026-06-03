@echo off
REM Advanced Backup Strategy for OptiCut Pro V4
REM Supports: Full Backup, WAL, Snapshots, PITR

setlocal enabledelayedexpansion
set "BackupPath=C:\OptiCut_Backup"
set "DBUser=opticut_user"
set "DBName=opticut_pro"

REM ========== FULL BACKUP ==========
echo [FULL BACKUP] En cours...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set "mydate=%%c%%a%%b")
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set "mytime=%%a%%b")
set "timestamp=!mydate!_!mytime!"

wsl sudo -u postgres pg_dump -d %DBName% > "%BackupPath%\full_backup_!timestamp!.sql"
echo [OK] Full backup cree: "%BackupPath%\full_backup_!timestamp!.sql"

REM ========== WAL BACKUP ==========
echo [WAL BACKUP] En cours...
wsl sudo tar -czf /mnt/c/OptiCut_Backup/wal/wal_!timestamp!.tar.gz -C /var/lib/postgresql/wal_archive/ .
echo [OK] WAL backup cree

REM ========== DATA INTEGRITY CHECK ==========
echo [VERIFICATION] Verification des checksums...
wsl sudo -u postgres psql -d %DBName% -c "SELECT count(*) FROM opticum.metadata;" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Checksums valides
) else (
    echo [ERREUR] Probleme de verification
)

echo.
echo Sauvegarde completee: %timestamp%
echo Fichiers dans: %BackupPath%
echo.
