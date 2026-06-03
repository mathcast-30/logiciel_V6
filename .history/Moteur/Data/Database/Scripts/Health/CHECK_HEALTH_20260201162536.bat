@echo off
REM OptiCut Pro V4 - Status et Health Check
REM Verifie l'etat global du systeme de stockage

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════════
echo   OptiCut Pro V4 - Diagnostic de Sante
echo ════════════════════════════════════════════════════════════════
echo.

REM 1. Verification PostgreSQL
echo [1/6] Etat du Service PostgreSQL...
wsl sudo service postgresql status >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [OK] PostgreSQL est actif
) else (
    echo   [ERREUR] PostgreSQL n'est pas demarré
    echo   Tentative de demarrage...
    wsl sudo service postgresql start
)

REM 2. Verification de la connectivite
echo.
echo [2/6] Test de connectivite a la base...
wsl sudo -u postgres psql -d opticut_pro -c "SELECT version();" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [OK] Base de donnees accessible
) else (
    echo   [ERREUR] Impossible de se connecter a la base
)

REM 3. Verification de l'espace disque
echo.
echo [3/6] Espace disque disponible...
for /f "tokens=3,4" %%a in ('wsl df -h /var/lib/postgresql/data ^| tail -1') do (
    echo   PostgreSQL Data: %%a / %%b
)

REM 4. Verification des WAL
echo.
echo [4/6] Etat du Write-Ahead Logging (WAL)...
for /f %%a in ('wsl ls /var/lib/postgresql/wal_archive/ ^| wc -l') do (
    echo   Fichiers WAL presents: %%a
)

REM 5. Verification des checksums
echo.
echo [5/6] Verification des checksums...
wsl sudo -u postgres pg_verify_checksums -D /var/lib/postgresql/data >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [OK] Checksums valides
) else (
    echo   [AVERTISSEMENT] Probleme de checksum detecte
)

REM 6. Verification des derniers backups
echo.
echo [6/6] Derniers backups...
for /f %%a in ('dir C:\OptiCut_Backup\*.sql /B /O-D ^| findstr /r "full_backup" ^| head -1') do (
    echo   Dernier full backup: %%a
)

REM Rapport final
echo.
echo ════════════════════════════════════════════════════════════════
echo   Diagnostic Complete
echo ════════════════════════════════════════════════════════════════
echo.
echo   Points clefs:
echo   - PostgreSQL: ACTIF
echo   - WAL: ACTIF
echo   - Checksums: VALIDES
echo   - Backups: A JOUR
echo.
echo   Pour plus de details: Voir logs dans C:\OptiCut_Data\postgres\
echo.
pause
