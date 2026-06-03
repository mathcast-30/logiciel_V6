#!/bin/bash
# Script d'installation PostgreSQL pour OptiCut Pro V4
# À exécuter dans WSL Ubuntu

set -e

echo "════════════════════════════════════════════════════════════════════"
echo "   OptiCut Pro V4 - Installation PostgreSQL sur WSL"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# 1. Mise à jour du système
echo "[1/6] Mise à jour des paquets système..."
sudo apt-get update -y >/dev/null 2>&1
sudo apt-get upgrade -y >/dev/null 2>&1
echo "  ✓ Système à jour"

# 2. Installation de PostgreSQL
echo "[2/6] Installation de PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib >/dev/null 2>&1
echo "  ✓ PostgreSQL installé"

# 3. Démarrage du service
echo "[3/6] Démarrage du service PostgreSQL..."
sudo service postgresql start >/dev/null 2>&1
echo "  ✓ PostgreSQL démarré"

# 4. Création de l'utilisateur
echo "[4/6] Création de l'utilisateur opticut_user..."
sudo -u postgres psql -c "CREATE USER opticut_user WITH PASSWORD 'SecureOpticut2024!#' CREATEDB;" >/dev/null 2>&1 || true
echo "  ✓ Utilisateur créé"

# 5. Création de la base de données
echo "[5/6] Création de la base de données opticut_pro..."
sudo -u postgres psql -c "CREATE DATABASE opticut_pro OWNER opticut_user;" >/dev/null 2>&1 || true
echo "  ✓ Base de données créée"

# 6. Initialisation du schéma
echo "[6/6] Initialisation du schéma..."
sudo -u postgres psql -d opticut_pro <<EOF
CREATE SCHEMA IF NOT EXISTS opticum;

CREATE TABLE IF NOT EXISTS opticum.metadata (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opticum.audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    operation VARCHAR(10),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS opticum.data_integrity_check (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    checksum VARCHAR(64),
    row_count INTEGER,
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20)
);

INSERT INTO opticum.metadata (key, value) 
VALUES 
    ('version', '4.0.0'),
    ('init_date', NOW()::TEXT),
    ('storage_type', 'PostgreSQL Advanced'),
    ('wal_enabled', 'true'),
    ('checksum_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

GRANT ALL PRIVILEGES ON SCHEMA opticum TO opticum_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA opticum TO opticum_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA opticum TO opticum_user;
EOF
echo "  ✓ Schéma initialisé"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "   ✅ Installation Complétée Avec Succès"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "   Informations de connexion:"
echo "   - Host: localhost"
echo "   - Port: 5432"
echo "   - Database: opticut_pro"
echo "   - User: opticut_user"
echo "   - Password: SecureOpticut2024!#"
echo ""
echo "   Commandes de test:"
echo "   wsl sudo -u postgres psql -d opticut_pro -c 'SELECT version();'"
echo ""
