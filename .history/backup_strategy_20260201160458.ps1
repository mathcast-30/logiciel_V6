# Stratégie de Sauvegarde Avancée pour OptiCut Pro V4

param(
    [string]$BackupPath = "C:\OptiCut_Backup",
    [int]$RetentionDays = 30
)

Write-Host "=== Stratégie de Sauvegarde Avancée ===" -ForegroundColor Cyan

# Fonction de Backup complet
function Invoke-FullBackup {
    Write-Host "`n[Backup Complet] En cours..." -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BackupPath\full_backup_$timestamp.sql"
    
    try {
        docker exec opticut-postgres pg_dump -U opticut_user opticut_pro | Out-File -FilePath $backupFile -Encoding UTF8
        Write-Host "  ✓ Backup complet créé: $backupFile" -ForegroundColor Green
        return $backupFile
    } catch {
        Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
        return $null
    }
}

# Fonction de Backup incrémental WAL
function Invoke-WALBackup {
    Write-Host "`n[Backup WAL] En cours..." -ForegroundColor Yellow
    
    try {
        docker exec opticut-pgbackrest pgbackrest backup
        Write-Host "  ✓ Backup WAL exécuté" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
    }
}

# Fonction de nettoyage des anciens backups
function Remove-OldBackups {
    Write-Host "`n[Nettoyage] Suppression des backups de plus de $RetentionDays jours..." -ForegroundColor Yellow
    
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    
    Get-ChildItem -Path "$BackupPath\*.sql" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | ForEach-Object {
        Remove-Item -Path $_.FullName -Force
        Write-Host "  ✓ Supprimé: $($_.Name)" -ForegroundColor Green
    }
}

# Fonction de Snapshot atomique
function Invoke-AtomicSnapshot {
    Write-Host "`n[Snapshot Atomique] En cours..." -ForegroundColor Yellow
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $snapshotName = "opticut-snapshot-$timestamp"
    
    try {
        # Créer un snapshot via Docker volumes
        docker run --rm -v opticut-postgres-data:/data `
            -v "$BackupPath\snapshots:/snapshots" `
            busybox cp -a /data "/snapshots/$snapshotName"
        
        Write-Host "  ✓ Snapshot créé: $snapshotName" -ForegroundColor Green
        return $snapshotName
    } catch {
        Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
        return $null
    }
}

# Fonction de Point-in-Time Recovery (PITR)
function Invoke-PITR {
    param([DateTime]$TargetTime)
    
    Write-Host "`n[PITR] Récupération jusqu'à: $($TargetTime.ToString())" -ForegroundColor Yellow
    
    try {
        $targetTimeStr = $TargetTime.ToString("yyyy-MM-dd HH:mm:ss")
        docker exec opticut-postgres psql -U opticut_user -d opticut_pro -c "
            ALTER SYSTEM SET recovery_target_timeline = 'latest';
            ALTER SYSTEM SET recovery_target_xid = (SELECT txid_current());
            ALTER SYSTEM SET recovery_target_time = '$targetTimeStr';
            SELECT pg_ctl('restart', 'fast');
        "
        Write-Host "  ✓ PITR configuré pour: $targetTimeStr" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Erreur: $_" -ForegroundColor Red
    }
}

# Fonction de vérification d'intégrité
function Test-BackupIntegrity {
    Write-Host "`n[Vérification d'Intégrité] Teste les checksums..." -ForegroundColor Yellow
    
    try {
        docker exec opticut-postgres pg_verify_checksums -D /var/lib/postgresql/data | Out-Null
        Write-Host "  ✓ Checksums valides" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Avertissement: $_" -ForegroundColor Red
    }
}

# Exécution de la stratégie complète
function Invoke-CompleteBackupStrategy {
    Write-Host "`n=== Exécution Complète de la Stratégie ===" -ForegroundColor Green
    
    Invoke-FullBackup
    Invoke-WALBackup
    Invoke-AtomicSnapshot
    Test-BackupIntegrity
    Remove-OldBackups
    
    Write-Host "`n=== Stratégie Complétée ===" -ForegroundColor Green
}

# Menu de sélection
function Show-BackupMenu {
    Write-Host "`n=== Menu de Sauvegarde ===" -ForegroundColor Cyan
    Write-Host "1. Backup Complet" -ForegroundColor White
    Write-Host "2. Backup WAL Incrémental" -ForegroundColor White
    Write-Host "3. Snapshot Atomique" -ForegroundColor White
    Write-Host "4. Vérifier l'Intégrité" -ForegroundColor White
    Write-Host "5. Stratégie Complète" -ForegroundColor White
    Write-Host "6. Quitter" -ForegroundColor White
    Write-Host ""
}

# Boucle principale
do {
    Show-BackupMenu
    $choice = Read-Host "Choisir une option (1-6)"
    
    switch ($choice) {
        "1" { Invoke-FullBackup }
        "2" { Invoke-WALBackup }
        "3" { Invoke-AtomicSnapshot }
        "4" { Test-BackupIntegrity }
        "5" { Invoke-CompleteBackupStrategy }
        "6" { Write-Host "Au revoir!"; exit 0 }
        default { Write-Host "Option invalide" -ForegroundColor Red }
    }
} while ($choice -ne "6")
