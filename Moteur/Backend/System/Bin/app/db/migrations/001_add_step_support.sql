-- Migration: Add STEP Import Support
-- Version: 001
-- Date: 2026-01-14
-- Description: Add tables and columns for STEP 3D model import and tracking

-- ============================================================================
-- 1. Create step_models table
-- ============================================================================
CREATE TABLE IF NOT EXISTS step_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_hash TEXT,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,  -- JSON: {solids_count, total_volume, extraction_accuracy, etc.}
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. Add STEP tracking columns to parts table
-- ============================================================================
-- SQLite doesn't support adding multiple columns in one statement
ALTER TABLE parts ADD COLUMN step_model_id INTEGER REFERENCES step_models(id);
ALTER TABLE parts ADD COLUMN auto_extracted BOOLEAN DEFAULT 0;
ALTER TABLE parts ADD COLUMN extraction_metadata TEXT;  -- JSON: OBB data, orientation, volume, etc.

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_step_models_project ON step_models(project_id);
CREATE INDEX IF NOT EXISTS idx_step_models_hash ON step_models(file_hash);
CREATE INDEX IF NOT EXISTS idx_parts_step_model ON parts(step_model_id);
CREATE INDEX IF NOT EXISTS idx_parts_auto_extracted ON parts(auto_extracted);

-- ============================================================================
-- 4. Update existing data (if needed)
-- ============================================================================
-- Mark all existing parts as manually created (not auto-extracted)
UPDATE parts SET auto_extracted = 0 WHERE auto_extracted IS NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The database is now ready for STEP import functionality
-- New features enabled:
--   - Import STEP files and link to projects
--   - Automatic part extraction with OBB calculations
--   - Track which parts came from STEP vs manual entry
--   - Store extraction metadata for future reference
