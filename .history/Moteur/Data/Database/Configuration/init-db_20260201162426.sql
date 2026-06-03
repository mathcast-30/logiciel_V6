-- Initialisation de la base OptiCut Pro V4
-- Schéma et tables fondamentales

-- Créer le schéma
CREATE SCHEMA IF NOT EXISTS opticum;

-- Table de métadonnées
CREATE TABLE IF NOT EXISTS opticum.metadata (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table d'audit pour la traçabilité
CREATE TABLE IF NOT EXISTS opticum.audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    operation VARCHAR(10),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255)
);

-- Table de vérification d'intégrité des données
CREATE TABLE IF NOT EXISTS opticum.data_integrity_check (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    checksum VARCHAR(64),
    row_count INTEGER,
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20)
);

-- Inserts de données par défaut
INSERT INTO opticum.metadata (key, value) VALUES ('version', '4.0.0') ON CONFLICT (key) DO NOTHING;
INSERT INTO opticum.metadata (key, value) VALUES ('init_date', NOW()::TEXT) ON CONFLICT (key) DO NOTHING;
INSERT INTO opticum.metadata (key, value) VALUES ('storage_architecture', 'PostgreSQL + WAL + Snapshots') ON CONFLICT (key) DO NOTHING;

-- Accorder les droits
GRANT ALL PRIVILEGES ON SCHEMA opticum TO opticut_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA opticum TO opticut_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA opticum TO opticut_user;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON opticum.audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_table ON opticum.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_integrity_timestamp ON opticum.data_integrity_check(check_timestamp);
