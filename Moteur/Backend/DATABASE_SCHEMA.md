# Structure de Base de Données Relationnelle - OptiCut Pro

## Schéma Complet SQL

Voici le schéma SQL complet montrant toutes les relations Client → Projet → Modèle 3D → Pièces.

```sql
-- ============================================================================
-- SCHEMA RELATIONNEL OPTICUT PRO
-- Structure: Client → Projet → STEP Model → Parts
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. CLIENT (Point de départ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. PROJECT (Lié au client)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,  -- Lien vers client
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    start_date DATETIME,
    delivery_date DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 3. STEP_MODELS (Fichiers 3D importés pour un projet)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS step_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,  -- Lien vers projet
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_hash TEXT,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,  -- JSON: {solids_count, volume, accuracy, etc.}
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 4. MATERIALS (Catalogue des matériaux disponibles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    thickness REAL NOT NULL,
    cost_per_sqm REAL DEFAULT 0.0,
    price_type TEXT DEFAULT 'm2',  -- m2, m3, unit
    has_grain BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. PARTS (Pièces à découper - liées au projet ET optionnellement au STEP)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,       -- Lien vers projet
    material_id INTEGER,                -- Matériau assigné
    step_model_id INTEGER,              -- Lien vers STEP (si auto-extrait)
    
    name TEXT NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    
    allow_rotation BOOLEAN DEFAULT 1,
    grain_direction INTEGER DEFAULT 0,
    
    -- Informations d'extraction STEP
    auto_extracted BOOLEAN DEFAULT 0,
    extraction_metadata TEXT,  -- JSON: {thickness, volume, OBB data}
    
    notes TEXT,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    FOREIGN KEY (step_model_id) REFERENCES step_models(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEX POUR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_step_models_project ON step_models(project_id);
CREATE INDEX IF NOT EXISTS idx_step_models_hash ON step_models(file_hash);
CREATE INDEX IF NOT EXISTS idx_parts_project ON parts(project_id);
CREATE INDEX IF NOT EXISTS idx_parts_material ON parts(material_id);
CREATE INDEX IF NOT EXISTS idx_parts_step_model ON parts(step_model_id);
CREATE INDEX IF NOT EXISTS idx_parts_auto_extracted ON parts(auto_extracted);

-- ============================================================================
-- EXEMPLE DE DONNÉES
-- ============================================================================

-- Client
INSERT INTO clients (name, contact_email, contact_phone) 
VALUES ('Cuisine Martin', 'martin@example.com', '0612345678');

-- Projet pour ce client
INSERT INTO projects (client_id, name, description, status) 
VALUES (1, 'Cuisine Complète', 'Meuble bas + haut + îlot', 'draft');

-- Import d'un fichier STEP pour ce projet
INSERT INTO step_models (project_id, filename, filepath, file_hash, metadata)
VALUES (1, 'cuisine_complete.stp', '/UserData/StepFiles/1_20260114_cuisine_complete.stp', 
        'abc123hash', '{"solids_count": 12, "total_volume": 1500000}');

-- Matériau disponible
INSERT INTO materials (name, thickness, cost_per_sqm, has_grain)
VALUES ('Chêne Massif 18mm', 18.0, 85.0, 1);

-- Pièces extraites automatiquement du STEP
INSERT INTO parts (project_id, step_model_id, material_id, name, width, height, quantity, auto_extracted, extraction_metadata)
VALUES (1, 1, 1, 'Part_1', 400.0, 800.0, 1, 1, '{"thickness": 18.0, "volume_mm3": 5760000, "accuracy": 99.8}');

INSERT INTO parts (project_id, step_model_id, material_id, name, width, height, quantity, auto_extracted, extraction_metadata)
VALUES (1, 1, 1, 'Part_2', 600.0, 800.0, 2, 1, '{"thickness": 18.0, "volume_mm3": 8640000, "accuracy": 99.9}');

-- ============================================================================
-- REQUETES UTILES
-- ============================================================================

-- Liste tous les projets d'un client avec leurs modèles STEP
SELECT 
    c.name AS client,
    p.name AS projet,
    s.filename AS fichier_step,
    COUNT(parts.id) AS nb_pieces
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
LEFT JOIN step_models s ON s.project_id = p.id
LEFT JOIN parts ON parts.project_id = p.id
GROUP BY c.id, p.id, s.id;

-- Liste toutes les pièces d'un projet avec leurs matériaux
SELECT 
    p.name AS piece,
    p.width,
    p.height,
    p.quantity,
    m.name AS materiau,
    p.auto_extracted AS depuis_step
FROM parts p
LEFT JOIN materials m ON p.material_id = m.id
WHERE p.project_id = 1;

-- Statistiques par épaisseur pour un modèle STEP
SELECT 
    JSON_EXTRACT(extraction_metadata, '$.thickness') AS epaisseur,
    COUNT(*) AS nb_pieces,
    SUM(quantity) AS quantite_totale,
    m.name AS materiau_assigne
FROM parts
WHERE step_model_id = 1
GROUP BY epaisseur, m.name;
```

## Diagramme de Relations

```
┌─────────────────┐
│    Clients      │
│  ┌───────────┐  │
│  │ id (PK)   │  │
│  │ name      │  │
│  │ email     │  │
│  └───────────┘  │
└────────┬────────┘
         │ 1:N
         ↓
┌────────────────────┐
│     Projects       │
│  ┌──────────────┐  │
│  │ id (PK)      │  │
│  │ client_id FK │  │
│  │ name         │  │
│  │ status       │  │
│  └──────────────┘  │
└─────┬──────────┬───┘
      │          │
      │ 1:N      │ 1:N
      ↓          ↓
┌─────────────┐  ┌──────────────────┐
│ StepModels  │  │      Parts       │
│  ┌────────┐ │  │  ┌────────────┐  │
│  │ id PK  │ │  │  │ id (PK)    │  │
│  │ proj FK│←┼──┼──┤ project FK │  │
│  │filename│ │  │  │ material FK│──┼──→ Materials
│  │filepath│ │  │  │ step_mod FK│←─┘
│  └────────┘ │  │  │ width      │
└─────────────┘  │  │ height     │
                 │  │ auto_extrac│
                 │  └────────────┘
                 └──────────────────┘
```

## Avantages de cette Structure

1. **Traçabilité** : Chaque pièce connaît son origine (STEP ou manuelle)
2. **Intégrité** : Suppression en cascade (projet → STEP → pièces)
3. **Flexibilité** : Mix pièces auto-extraites + manuelles dans 1 projet
4. **Performance** : Index sur toutes les clés étrangères
5. **Metadata** : JSON stocké pour données techniques sans alourdir le schéma
