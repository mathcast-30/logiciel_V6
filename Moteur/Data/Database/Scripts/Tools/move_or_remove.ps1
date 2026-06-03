param(
  [switch]$WhatIf  # si true => simulation seulement
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
# mappage: nom de fichier racine -> dossier destination relatif à Moteur\Data
$map = @{
  'BACKUP_ADVANCED.bat'               = 'Moteur\Data\Database\Scripts\Backup'
  'CHECK_HEALTH.bat'                  = 'Moteur\Data\Database\Scripts\Health'
  'RECOVERY_EMERGENCY.bat'            = 'Moteur\Data\Database\Scripts\Recovery'
  'MAINTENANCE_SCHEDULE.bat'          = 'Moteur\Data\Database\Scripts\Maintenance'
  'COMPLETE_INSTALLATION.bat'         = 'Moteur\Data\Database\Scripts\Deployment'
  'DEPLOY_STORAGE.bat'                = 'Moteur\Data\Database\Scripts\Deployment'
  'install_postgres_wsl.sh'           = 'Moteur\Data\Database\Scripts\Deployment'
  'backup_script.sh'                  = 'Moteur\Data\Database\Scripts\Tools'
  'backup_strategy.ps1'               = 'Moteur\Data\Database\Scripts\Tools'
  'deploy_advanced_storage.ps1'       = 'Moteur\Data\Database\Scripts\Tools'
  'install_docker.ps1'                = 'Moteur\Data\Database\Scripts\Tools'
  'setup_advanced_storage.ps1'        = 'Moteur\Data\Database\Scripts\Tools'
  'postgresql.conf'                   = 'Moteur\Data\Database\Configuration'
  'POSTGRESQL_CONFIG_ADVANCED.conf'   = 'Moteur\Data\Database\Configuration'
  'init-db.sql'                       = 'Moteur\Data\Database\Configuration'
  'docker-compose.yml'                = 'Moteur\Data\Database\Docker'
  'DEPLOYMENT_SUCCESS.md'             = 'Moteur\Data\Documentation\Deployment'
  'DEPLOYMENT_SUMMARY.md'             = 'Moteur\Data\Documentation\Deployment'
  'STORAGE_ARCHITECTURE_COMPLETE.md'  = 'Moteur\Data\Documentation\Architecture'
  'QUICKSTART.md'                     = 'Moteur\Data\Documentation\Deployment'
  'FINAL_SUMMARY.md'                  = 'Moteur\Data\Documentation\Reference'
  'LIVRABLES.md'                      = 'Moteur\Data\Documentation\Reference'
  'INDEX.md'                          = 'Moteur\Data\Documentation\Reference'
  'FILE_ORGANIZATION_MAP.md'          = 'Moteur\Data\Documentation\Reference'
  'PROPOSED_ARBORESCENCE.md'          = 'Moteur\Data\Archive'
  'OVERVIEW.md'                       = 'Moteur\Data'
}

# Collecte actions
$actions = @()
foreach ($name in $map.Keys) {
  $src = Join-Path $root $name
  if (-not (Test-Path $src)) { continue }
  $destDir = Join-Path $root $map[$name]
  $dest = Join-Path $destDir $name

  if (Test-Path $dest) {
    $actions += [PSCustomObject]@{ File=$name; Action='DeleteRoot'; Src=$src; Dest=$dest }
  } else {
    $actions += [PSCustomObject]@{ File=$name; Action='Move'; Src=$src; Dest=$dest }
  }
}

if ($actions.Count -eq 0) {
  Write-Host "Aucun fichier à traiter en racine." -ForegroundColor Yellow
  return
}

Write-Host "Actions planifiées:" -ForegroundColor Cyan
$actions | Format-Table -AutoSize

if ($WhatIf) {
  Write-Host "`nMode SIMULATION (-WhatIf) — aucune modification ne sera faite." -ForegroundColor Yellow
  return
}

# Exécution
foreach ($a in $actions) {
  if ($a.Action -eq 'DeleteRoot') {
    try {
      Remove-Item $a.Src -Force -ErrorAction Stop
      Write-Host "Supprimé (destination existe): $($a.File)" -ForegroundColor Green
    } catch {
      Write-Host "Erreur suppression $($a.File): $_" -ForegroundColor Red
    }
  } else {
    # créer dossier si nécessaire
    $destDirOnly = Split-Path $a.Dest -Parent
    if (-not (Test-Path $destDirOnly)) { New-Item -ItemType Directory -Path $destDirOnly -Force | Out-Null }
    try {
      Move-Item -Path $a.Src -Destination $a.Dest -Force -ErrorAction Stop
      Write-Host "Déplacé: $($a.File) -> $($a.Dest)" -ForegroundColor Green
    } catch {
      Write-Host "Erreur déplacement $($a.File): $_" -ForegroundColor Red
    }
  }
}

Write-Host "`nOpération terminée. Vérifiez Moteur\Data et la racine." -ForegroundColor Cyan
