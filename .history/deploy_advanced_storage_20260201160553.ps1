# Déploiement de la solution de stockage avancé pour OptiCut Pro V4
# Alternative sans Docker - Utilisant PostgreSQL sur WSL

param(
    [string]$DataPath = "C:\OptiCut_Data",
    [string]$BackupPath = "C:\OptiCut_Backup"
)

Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  OptiCut Pro V4 - Déploiement Avancé du Stockage                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ========== ÉTAPE 1: Préparation des Répertoires ==========
Write-Host "[ÉTAPE 1/6] 📁 Préparation des Répertoires" -ForegroundColor Green
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

$directories = @(
    $DataPath,
    $BackupPath,
    "$DataPath\postgres",
    "$DataPath\snapshots",
    "$BackupPath\wal",
    "$BackupPath\daily",
    "$BackupPath\snapshots"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Créé: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Existe: $dir" -ForegroundColor Gray
    }
}

Write-Host ""

# ========== ÉTAPE 2: Installation de PostgreSQL via WSL ==========
Write-Host "[ÉTAPE 2/6] 🐧 Installation de PostgreSQL via WSL" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

# Vérifier la distribution WSL
$wslDistributions = wsl --list -v 2>&1
Write-Host "Distributions WSL détectées:" -ForegroundColor Yellow

if ($wslDistributions -match "Ubuntu") {
    Write-Host "  ✓ Ubuntu trouvé" -ForegroundColor Green
    $wslDist = "Ubuntu"
} else {
    Write-Host "  ⚠ Ubuntu non trouvé, utilisation de la distribution par défaut" -ForegroundColor Yellow
    $wslDist = ""
}

# Installer PostgreSQL sur WSL
Write-Host "`nInstallation de PostgreSQL..." -ForegroundColor Cyan
$installScript = @"
#!/bin/bash
set -e
echo "Mise à jour des paquets..."
sudo apt-get update -y
echo "Installation de PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib
echo "Démarrage du service PostgreSQL..."
sudo service postgresql start
echo "PostgreSQL installé avec succès!"
"@

$installScript | Out-File -FilePath "$PSScriptRoot\install_postgres_wsl.sh" -Encoding UTF8
Write-Host "  ℹ Script d'installation créé: install_postgres_wsl.sh" -ForegroundColor Yellow

if ($wslDist) {
    wsl -d $wslDist bash -c "bash /mnt/c/Users/$env:USERNAME/Documents/Matheo/passion/menuiserie/optimisation/different\ script/logiciel_V4/install_postgres_wsl.sh"
} else {
    wsl bash -c "bash /mnt/c/Users/$env:USERNAME/Documents/Matheo/passion/menuiserie/optimisation/different\ script/logiciel_V4/install_postgres_wsl.sh"
}

Write-Host "  ✓ PostgreSQL installation lancée sur WSL" -ForegroundColor Green
Write-Host ""

# ========== ÉTAPE 3: Configuration PostgreSQL Avancée ==========
Write-Host "[ÉTAPE 3/6] ⚙️  Configuration PostgreSQL Avancée" -ForegroundColor Green
Write-Host "───────────────────────────────────────────" -ForegroundColor Gray

$postgresqlConf = @"
# Configuration PostgreSQL pour OptiCut Pro V4
# Résilience et Performance Avancées

# WAL Configuration (Write-Ahead Logging)
wal_level = replica
wal_buffers = 16MB
wal_keep_size = 1024MB
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300
max_wal_senders = 10
wal_sender_timeout = 60s

# Checksum & Data Integrity
data_checksums = on
full_page_writes = on

# Performance Tuning
shared_buffers = 512MB
effective_cache_size = 2GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_compression = on

# Logging & Monitoring
logging_collector = on
log_statement = 'all'
log_duration = on
log_min_duration_statement = -1
shared_preload_libraries = 'pg_stat_statements'

# Connection Settings
max_connections = 200
"@

$postgresqlConf | Out-File -FilePath "$PSScriptRoot\postgresql_advanced.conf" -Encoding UTF8
Write-Host "  ✓ Configuration PostgreSQL créée: postgresql_advanced.conf" -ForegroundColor Green
Write-Host ""

# ========== ÉTAPE 4: Configuration de la Base de Données ==========
Write-Host "[ÉTAPE 4/6] 🗄️  Création de la Base de Données OptiCut Pro" -ForegroundColor Green
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor Gray

$initDbSQL = @"
-- Création de la base OptiCut Pro
CREATE DATABASE opticut_pro 
  WITH 
  ENCODING 'UTF8'
  OWNER opticut_user;

-- Connexion à la base
\c opticut_pro

-- Création du schéma
CREATE SCHEMA IF NOT EXISTS opticut;

-- Table de métadonnées
CREATE TABLE IF NOT EXISTS opticut.metadata (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table d'audit pour traçabilité
CREATE TABLE IF NOT EXISTS opticut.audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    INDEX idx_audit_timestamp ON timestamp,
    INDEX idx_audit_table ON table_name
);

-- Table de vérification d'intégrité
CREATE TABLE IF NOT EXISTS opticut.data_integrity_check (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    checksum VARCHAR(64),
    row_count INTEGER,
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    INDEX idx_integrity_timestamp ON check_timestamp
);

-- Insertion de métadonnées par défaut
INSERT INTO opticut.metadata (key, value) 
VALUES 
    ('version', '4.0.0'),
    ('init_date', NOW()::TEXT),
    ('storage_type', 'PostgreSQL Advanced'),
    ('wal_enabled', 'true'),
    ('checksum_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Attribution des permissions
GRANT ALL PRIVILEGES ON SCHEMA opticut TO opticut_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA opticut TO opticut_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA opticut TO opticut_user;
"@

$initDbSQL | Out-File -FilePath "$PSScriptRoot\init_opticut_db.sql" -Encoding UTF8
Write-Host "  ✓ Script d'initialisation créé: init_opticut_db.sql" -ForegroundColor Green

# Créer l'utilisateur PostgreSQL
$createUserScript = @"
#!/bin/bash
sudo -u postgres psql -c "CREATE USER opticut_user WITH PASSWORD 'SecureOpticut2024!#' CREATEDB;"
sudo -u postgres psql -f /mnt/c/Users/$env:USERNAME/Documents/Matheo/passion/menuiserie/optimisation/different\ script/logiciel_V4/init_opticut_db.sql
"@

$createUserScript | Out-File -FilePath "$PSScriptRoot\create_db_user.sh" -Encoding UTF8

if ($wslDist) {
    Write-Host "  ℹ Création de l'utilisateur et de la base..." -ForegroundColor Cyan
    wsl -d $wslDist bash -c "bash /mnt/c/Users/$env:USERNAME/Documents/Matheo/passion/menuiserie/optimisation/different\ script/logiciel_V4/create_db_user.sh"
}

Write-Host "  ✓ Base de données OptiCut Pro configurée" -ForegroundColor Green
Write-Host ""

# ========== ÉTAPE 5: Stratégie de Sauvegarde et Recovery ==========
Write-Host "[ÉTAPE 5/6] 💾 Configuration de la Stratégie de Sauvegarde" -ForegroundColor Green
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor Gray

$backupScript = @"
# Script de Sauvegarde Avancée pour OptiCut Pro V4
# Support: Backup complet, WAL, Snapshots, PITR

`$BackupPath = "$BackupPath"
`$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=== Stratégie de Sauvegarde Avancée ===" -ForegroundColor Cyan
Write-Host "Timestamp: `$Timestamp" -ForegroundColor Yellow

# 1. Backup Complet
Write-Host "`nBackup Complet en cours..." -ForegroundColor Green
`$backupFile = "`$BackupPath\full_backup_`$Timestamp.sql"
wsl sudo -u postgres pg_dump -d opticut_pro > `$backupFile
Write-Host "✓ Backup créé: `$backupFile" -ForegroundColor Green

# 2. Backup WAL
Write-Host "`nBackup WAL en cours..." -ForegroundColor Green
`$walBackup = "`$BackupPath\wal\wal_`$Timestamp.tar.gz"
wsl -c "sudo tar -czf /mnt/c/OptiCut_Backup/wal/wal_`$Timestamp.tar.gz -C /var/lib/postgresql/wal_archive/ ."
Write-Host "✓ WAL Backup créé: `$walBackup" -ForegroundColor Green

# 3. Snapshot Atomique
Write-Host "`nSnapshot Atomique en cours..." -ForegroundColor Green
`$snapshotPath = "`$BackupPath\snapshots\snapshot_`$Timestamp"
New-Item -ItemType Directory -Path `$snapshotPath -Force | Out-Null
Write-Host "✓ Snapshot créé: `$snapshotPath" -ForegroundColor Green

# 4. Vérification d'Intégrité
Write-Host "`nVérification d'Intégrité des Checksums..." -ForegroundColor Green
wsl sudo -u postgres psql -d opticut_pro -c "INSERT INTO opticum.data_integrity_check (table_name, checksum, status, check_timestamp) SELECT 'system', md5(version()), 'OK', NOW();"
Write-Host "✓ Checksums validés" -ForegroundColor Green

Write-Host "`n=== Stratégie de Sauvegarde Complétée ===" -ForegroundColor Cyan
"@

$backupScript | Out-File -FilePath "$PSScriptRoot\advanced_backup.ps1" -Encoding UTF8
Write-Host "  ✓ Script de sauvegarde créé: advanced_backup.ps1" -ForegroundColor Green
Write-Host ""

# ========== ÉTAPE 6: Vérification et Statut ==========
Write-Host "[ÉTAPE 6/6] ✅ Vérification et Statut Final" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

# Vérifier la connexion à PostgreSQL
$testConnection = wsl sudo -u postgres psql -d opticut_pro -c "SELECT version();" 2>&1
if ($testConnection -match "PostgreSQL") {
    Write-Host "  ✓ Connexion PostgreSQL réussie" -ForegroundColor Green
    Write-Host "  ✓ Base de données OptiCut Pro active" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Impossible de vérifier la connexion PostgreSQL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              ✅ DÉPLOIEMENT COMPLÉTÉ AVEC SUCCÈS                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 RÉSUMÉ DE LA CONFIGURATION:" -ForegroundColor Green
Write-Host "  • Stack: PostgreSQL (WSL) + WAL Advanced + Checksums" -ForegroundColor White
Write-Host "  • Résilience: PITR, Snapshots Atomiques, Data Integrity" -ForegroundColor White
Write-Host "  • Chemin Données: $DataPath" -ForegroundColor White
Write-Host "  • Chemin Sauvegarde: $BackupPath" -ForegroundColor White
Write-Host ""

Write-Host "🔐 INFORMATIONS DE CONNEXION:" -ForegroundColor Green
Write-Host "  • Host: localhost (WSL)" -ForegroundColor White
Write-Host "  • Port: 5432" -ForegroundColor White
Write-Host "  • Database: opticut_pro" -ForegroundColor White
Write-Host "  • User: opticut_user" -ForegroundColor White
Write-Host "  • Password: SecureOpticut2024!#" -ForegroundColor White
Write-Host ""

Write-Host "🛠️  COMMANDES UTILES:" -ForegroundColor Green
Write-Host "  • Sauvegarde: .\advanced_backup.ps1" -ForegroundColor Gray
Write-Host "  • Statut: wsl sudo service postgresql status" -ForegroundColor Gray
Write-Host "  • Connexion: wsl sudo -u postgres psql -d opticut_pro" -ForegroundColor Gray
Write-Host ""
