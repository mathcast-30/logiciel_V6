# -*- coding: utf-8 -*-
"""
Simple Migration Script - Uses only standard library
No external dependencies required
"""
import sqlite3
import os
import sys

# Force UTF-8 output
reconfigure = getattr(sys.stdout, 'reconfigure', None)
if reconfigure is not None:
    reconfigure(encoding='utf-8', errors='replace')

# Find database path - use absolute path to be safe
# Structure: logiciel_V4/Moteur/Backend/System/Bin/migrate_db.py
# Database: logiciel_V4/Moteur/UserData/BaseDeDonnees/opticut.db
script_dir = os.path.dirname(os.path.abspath(__file__))

# Go up 3 levels from Bin to Moteur
moteur_dir = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))
db_path = os.path.join(moteur_dir, "UserData", "BaseDeDonnees", "opticut.db")
db_path = os.path.normpath(db_path)

print(f"[INFO] Script location: {script_dir}")
print(f"[INFO] Moteur dir: {moteur_dir}")
print(f"[INFO] Database path: {db_path}")
print(f"[INFO] Exists: {os.path.exists(db_path)}")

if not os.path.exists(db_path):
    print("[ERROR] Database not found! Check path.")
    sys.exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n[RUNNING] Applying STEP Import migration...\n")

# Migration statements
migrations = [
    # 1. Create step_models table
    """
    CREATE TABLE IF NOT EXISTS step_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_hash TEXT,
        import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """,
    
    # 2. Add columns to parts - using try/except for ALTER TABLE
    "ALTER TABLE parts ADD COLUMN step_model_id INTEGER REFERENCES step_models(id)",
    "ALTER TABLE parts ADD COLUMN auto_extracted BOOLEAN DEFAULT 0",
    "ALTER TABLE parts ADD COLUMN extraction_metadata TEXT",
    
    # 3. Create indexes
    "CREATE INDEX IF NOT EXISTS idx_step_models_project ON step_models(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_step_models_hash ON step_models(file_hash)",
    "CREATE INDEX IF NOT EXISTS idx_parts_step_model ON parts(step_model_id)",
    "CREATE INDEX IF NOT EXISTS idx_parts_auto_extracted ON parts(auto_extracted)",
    
    # 4. Update existing parts
    "UPDATE parts SET auto_extracted = 0 WHERE auto_extracted IS NULL",
    
    # 5. Add k_metric column to optimization_results (fixes missing column error)
    "ALTER TABLE optimization_results ADD COLUMN k_metric REAL",
    
    # 6. Fix NULL created_at in hardware table (fixes Pydantic validation error)
    "UPDATE hardware SET created_at = datetime('now') WHERE created_at IS NULL"
]

success_count = 0
for i, sql in enumerate(migrations, 1):
    try:
        _ = cursor.execute(sql)
        print(f"[OK] Statement {i}/{len(migrations)}: Success")
        success_count += 1
    except sqlite3.OperationalError as e:
        err_msg = str(e).lower()
        if "duplicate column name" in err_msg:
            print(f"[SKIP] Statement {i}/{len(migrations)}: Already applied (column exists)")
            success_count += 1
        elif "already exists" in err_msg:
            print(f"[SKIP] Statement {i}/{len(migrations)}: Already applied (table/index exists)")
            success_count += 1
        else:
            print(f"[WARN] Statement {i}/{len(migrations)}: Warning - {e}")

# Commit changes
conn.commit()

# Verify
print("\n[VERIFY] Checking migration...\n")

# Check if step_models table exists
_ = cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='step_models'")
if cursor.fetchone():
    print("[OK] Table 'step_models' exists")
else:
    print("[ERROR] Table 'step_models' NOT found")

# Check parts columns
_ = cursor.execute("PRAGMA table_info(parts)")
columns: list[str] = [str(row[1]) for row in cursor.fetchall()]
expected_cols = ['step_model_id', 'auto_extracted', 'extraction_metadata']
for col in expected_cols:
    if col in columns:
        print(f"[OK] Column 'parts.{col}' exists")
    else:
        print(f"[ERROR] Column 'parts.{col}' NOT found")

conn.close()

print(f"\n[DONE] Migration complete! {success_count}/{len(migrations)} statements executed successfully.")
print("\n>>> Vous pouvez maintenant demarrer le serveur backend.")
