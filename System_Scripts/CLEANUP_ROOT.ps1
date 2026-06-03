param(
    [switch]$SkipConfirm = $false
)

$root = 'c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4'

# Liste COMPLÈTE des fichiers à supprimer (sauf LANCER_LOGICIEL.bat et package.json)
$toDelete = @(
    'BACKUP_ADVANCED.bat',
    'CHECK_HEALTH.bat',
    'COMPLETE_INSTALLATION.bat',
    'DEPLOY_STORAGE.bat',
    'MAINTENANCE_SCHEDULE.bat',
    'RECOVERY_EMERGENCY.bat',
    'backup_script.sh',
    'backup_strategy.ps1',
    'deploy_advanced_storage.ps1',
    'install_docker.ps1',
    'install_postgres_wsl.sh',
    'setup_advanced_storage.ps1',
    'postgresql.conf',
    'POSTGRESQL_CONFIG_ADVANCED.conf',
    'init-db.sql',
    'docker-compose.yml',
    'DEPLOYMENT_SUCCESS.md',
    'DEPLOYMENT_SUMMARY.md',
    'STORAGE_ARCHITECTURE_COMPLETE.md',
    'QUICKSTART.md',
    'FINAL_SUMMARY.md',
    'LIVRABLES.md',
    'INDEX.md',
    'PROPOSED_ARBORESCENCE.md',
    'FILE_ORGANIZATION_MAP.md',
    'OVERVIEW.md'
)

Write-Host '🎯 NETTOYAGE RACINE - OptiCut Pro V4' -ForegroundColor Cyan
Write-Host ''
Write-Host "📂 Répertoire: $root" -ForegroundColor Gray
Write-Host ''
Write-Host '🗑️ Fichiers à supprimer (maintenant en Moteur/Data/):' -ForegroundColor Yellow
Write-Host ''

$toDelete | ForEach-Object { Write-Host "  • $_" }

Write-Host ''
if (-not $SkipConfirm) {
    Write-Host 'Appuyez sur ENTRÉE pour confirmer la suppression...' -ForegroundColor Yellow
    $null = Read-Host
}

Write-Host ''
Write-Host 'Suppression en cours...' -ForegroundColor Cyan
Write-Host ''

$deleted = 0
$failed = 0

foreach ($file in $toDelete) {
    $path = Join-Path $root $file
    if (Test-Path $path) {
        try {
            Remove-Item $path -Force -ErrorAction Stop
            Write-Host "✓ Supprimé: $file" -ForegroundColor Green
            $deleted++
        } catch {
            Write-Host "✗ ERREUR: $file - $_" -ForegroundColor Red
            $failed++
        }
    }
}

Write-Host ''
Write-Host '═══════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '📊 RÉSUMÉ' -ForegroundColor Cyan
Write-Host '═══════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host "  ✓ Fichiers supprimés:  $deleted" -ForegroundColor Green
Write-Host "  ✗ Erreurs:             $failed" -ForegroundColor $(if($failed -eq 0) {"Green"} else {"Red"})
Write-Host ''

# Vérification finale
Write-Host '✅ Vérification racine après suppression:' -ForegroundColor Cyan
Write-Host ''

$remaining = @(Get-ChildItem $root -MaxDepth 1 -File | Where-Object {
    $_.Name -match '\.(bat|conf|sql|yml|md|sh|ps1)$' -and 
    $_.Name -ne 'LANCER_LOGICIEL.bat' -and 
    $_.Name -ne 'package.json' -and
    $_.Name -ne 'README.md' -and
    $_.Name -ne 'ORGANIZATION_COMPLETE.md' -and
    $_.Name -ne 'ORGANIZATION_COMPLETE_SUMMARY.txt'
})

if ($remaining.Count -eq 0) {
    Write-Host "✓ ✓ ✓ Parfait! ✓ ✓ ✓" -ForegroundColor Green
    Write-Host ''
    Write-Host "  Racine nettoyée avec succès!" -ForegroundColor Green
    Write-Host "  Fichiers en racine (autorisés):" -ForegroundColor Cyan
    
    Get-ChildItem $root -MaxDepth 1 -File | Where-Object {
        $_.Name -eq 'LANCER_LOGICIEL.bat' -or 
        $_.Name -eq 'package.json' -or
        $_.Name -eq 'README.md'
    } | ForEach-Object { Write-Host "    ✓ $($_.Name)" -ForegroundColor Green }
    
    Write-Host ''
    Write-Host "  Tous les autres fichiers organisés dans: Moteur/Data/" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Fichiers restants (à gérer manuellement):" -ForegroundColor Yellow
    $remaining | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Yellow }
}

Write-Host ''
Write-Host '═══════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host '📖 Point d''entrée: Moteur/Data/MASTER_INDEX.md' -ForegroundColor Cyan
Write-Host '📖 Point d''entrée racine: README.md' -ForegroundColor Cyan
Write-Host ''
