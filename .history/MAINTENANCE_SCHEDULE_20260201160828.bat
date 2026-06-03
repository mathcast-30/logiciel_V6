@echo off
REM OptiCut Pro V4 - Maintenance Schedule
REM Taches de maintenance programmees

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════════════
echo   OptiCut Pro V4 - Taches de Maintenance
echo ════════════════════════════════════════════════════════════════════
echo.

REM Obtenir l'heure actuelle
for /f "tokens=1-2 delims=/:" %%A in ('time /t') do (set "current_hour=%%A")
for /f "tokens=3 delims=/:" %%A in ('time /t') do (set "current_min=%%A")

echo Heure actuelle: %current_hour%:%current_min%
echo.

REM QUOTIDIEN - Vacuum et Analyze (08:00)
if "%current_hour%"=="08" (
    echo [QUOTIDIEN] Nettoyage de la base (Vacuum)...
    wsl sudo -u postgres vacuumdb -d opticut_pro -z
    echo [OK] Vacuum complete
)

REM TOUS LES 3 JOURS - Full Backup (19:00)
if "%current_hour%"=="19" (
    echo [3 JOURS] Backup complet en cours...
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set "mydate=%%c%%a%%b"
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do set "mytime=%%a%%b"
    wsl sudo -u postgres pg_dump -d opticut_pro > "C:\OptiCut_Backup\full_backup_!mydate!_!mytime!.sql"
    echo [OK] Backup complete
)

REM HEBDO - Verification de checksums (Dimanche 02:00)
for /f "tokens=1" %%A in ('powershell -Command "Get-Date -Format 'ddd'"') do set "day=%%A"
if "%day%"=="Sun" if "%current_hour%"=="02" (
    echo [HEBDO] Verification des checksums...
    wsl sudo -u postgres pg_verify_checksums -D /var/lib/postgresql/data
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Checksums valides
    ) else (
        echo [ALERTE] Probleme de checksum !
    )
)

REM MENSUEL - Nettoyage et archivage (1er jour a 03:00)
for /f "tokens=1" %%A in ('powershell -Command "Get-Date -Format 'dd'"') do set "day=%%A"
if "%day%"=="01" if "%current_hour%"=="03" (
    echo [MENSUEL] Maintenance globale...
    
    REM Archiver les anciens backups
    echo   - Archivage des backups de plus de 30 jours...
    powershell -Command "Get-ChildItem 'C:\OptiCut_Backup\*.sql' | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Move-Item -Destination 'C:\OptiCut_Backup\archived'"
    
    REM Nettoyer les snapshots anciens
    echo   - Suppression des snapshots de plus de 8 semaines...
    powershell -Command "Get-ChildItem 'C:\OptiCut_Data\snapshots' -Directory | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-56)} | Remove-Item -Recurse -Force"
    
    echo [OK] Nettoyage complet
)

REM Logs de maintenance
echo.
echo [LOG] Tache executee a %date% %time% >> C:\OptiCut_Logs\maintenance.log

echo Maintenance programmee verifiee.
echo.
pause
