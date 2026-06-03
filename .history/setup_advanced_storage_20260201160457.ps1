# Script de configuration avancée du stockage pour OptiCut Pro V4

param(
    [string]$DataPath = "C:\OptiCut_Data",
    [string]$BackupPath = "C:\OptiCut_Backup",
    [string]$DBPort = "5432"
)

Write-Host "=== Configuration Avancée du Stockage OptiCut Pro V4 ===" -ForegroundColor Cyan
Write-Host ""

# 1. Créer les répertoires nécessaires
Write-Host "[1/5] Création des répertoires..." -ForegroundColor Yellow
$directories = @($DataPath, $BackupPath, "$DataPath\postgres", "$DataPath\snapshots", "$BackupPath\wal", "$BackupPath\daily")

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Créé: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Existe déjà: $dir" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[2/5] Vérification de Docker..." -ForegroundColor Yellow

# 2. Vérifier si Docker est disponible
$dockerCheck = docker --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Docker n'est pas installé ou accessible" -ForegroundColor Red
    Write-Host "  Veuillez installer Docker Desktop depuis: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Docker est disponible: $dockerCheck" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] Configuration du docker-compose.yml avec WAL avancé..." -ForegroundColor Yellow

# 3. Créer une configuration docker-compose.yml avancée
$dockerComposeContent = @"
version: '3.8'

services:
  postgres-opticut:
    image: postgres:latest
    container_name: opticut-postgres
    environment:
      POSTGRES_DB: opticut_pro
      POSTGRES_USER: opticut_user
      POSTGRES_PASSWORD: SecurePassword123!@#
      POSTGRES_INITDB_ARGS: >
        -c wal_level=replica
        -c archive_mode=on
        -c archive_command='cp %p /var/lib/postgresql/wal_archive/%f'
        -c max_wal_senders=10
        -c wal_keep_size=1024MB
        -c hot_standby=on
        -c shared_preload_libraries=pg_stat_statements
    ports:
      - "${DBPort}:5432"
    volumes:
      - postgres-data:$DataPath\postgres\data
      - postgres-wal:$DataPath\postgres\wal_archive
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command:
      - "postgres"
      - "-c"
      - "config_file=/etc/postgresql/postgresql.conf"
    networks:
      - opticut-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opticut_user -d opticut_pro"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbackrest:
    image: pgbackrest/pgbackrest:latest
    container_name: opticut-pgbackrest
    environment:
      PGBACKREST_STANZA: opticut-stanza
      PGBACKREST_REPO1_PATH: /var/lib/pgbackrest
    volumes:
      - postgres-backup:$BackupPath
      - postgres-data:$DataPath\postgres\data:ro
      - ./pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro
    networks:
      - opticut-network
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local
  postgres-wal:
    driver: local
  postgres-backup:
    driver: local

networks:
  opticut-network:
    driver: bridge
"@

$dockerComposeContent | Out-File -FilePath "$PSScriptRoot\docker-compose.yml" -Encoding UTF8
Write-Host "  ✓ docker-compose.yml créé" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] Création des fichiers de configuration PostgreSQL..." -ForegroundColor Yellow

# 4. Créer le fichier postgresql.conf
$postgresqlConfContent = @"
# Configuration PostgreSQL pour OptiCut Pro V4
# Résilience et Performance Avancées

# WAL Configuration
wal_level = replica
wal_buffers = 16MB
wal_keep_size = 1024MB
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300

# Replication Settings
max_wal_senders = 10
wal_sender_timeout = 60s
hot_standby = on

# Performance Tuning
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_compression = on

# Logging
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql.log'
log_statement = 'all'
log_duration = on

# Extensions
shared_preload_libraries = 'pg_stat_statements'
"@

$postgresqlConfContent | Out-File -FilePath "$PSScriptRoot\postgresql.conf" -Encoding UTF8
Write-Host "  ✓ postgresql.conf créé" -ForegroundColor Green

# 5. Créer le fichier pgbackrest.conf
$pgbackrestConfContent = @"
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=7
repo1-retention-full-type=day
backup-type=incr

[opticut-stanza]
pg1-path=/var/lib/postgresql/data
"@

$pgbackrestConfContent | Out-File -FilePath "$PSScriptRoot\pgbackrest.conf" -Encoding UTF8
Write-Host "  ✓ pgbackrest.conf créé" -ForegroundColor Green

# 6. Créer le fichier init-db.sql
$initDbContent = @"
-- Initialisation de la base OptiCut Pro
CREATE SCHEMA IF NOT EXISTS opticut;

-- Extension TimescaleDB si nécessaire
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Extension pgvector pour IA
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Table de métadonnées
CREATE TABLE IF NOT EXISTS opticut.metadata (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserts de données par défaut
INSERT INTO opticut.metadata (key, value) VALUES ('version', '4.0.0') ON CONFLICT DO NOTHING;
INSERT INTO opticut.metadata (key, value) VALUES ('init_date', NOW()::TEXT) ON CONFLICT DO NOTHING;

GRANT ALL PRIVILEGES ON SCHEMA opticut TO opticut_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA opticut TO opticut_user;
"@

$initDbContent | Out-File -FilePath "$PSScriptRoot\init-db.sql" -Encoding UTF8
Write-Host "  ✓ init-db.sql créé" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Lancement des services Docker..." -ForegroundColor Yellow

# Lancer docker-compose
try {
    docker-compose up -d
    Write-Host "  ✓ Services lancés avec succès" -ForegroundColor Green
    Start-Sleep -Seconds 10
} catch {
    Write-Host "  ✗ Erreur lors du lancement: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Configuration Complétée ===" -ForegroundColor Green
Write-Host ""
Write-Host "Informations de connexion:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: $DBPort" -ForegroundColor White
Write-Host "  Database: opticut_pro" -ForegroundColor White
Write-Host "  Username: opticut_user" -ForegroundColor White
Write-Host ""
Write-Host "Emplacements:" -ForegroundColor Cyan
Write-Host "  Données: $DataPath" -ForegroundColor White
Write-Host "  Sauvegardes: $BackupPath" -ForegroundColor White
Write-Host ""
Write-Host "Vérifier le statut:" -ForegroundColor Cyan
Write-Host "  docker-compose ps" -ForegroundColor Gray
Write-Host ""
