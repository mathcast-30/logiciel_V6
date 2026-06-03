import sqlite3
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "Moteur" / "UserData" / "BaseDeDonnees" / "opticut.db"

def fix_schema():
    print(f"Connecting to database: {DB_PATH}")
    if not DB_PATH.exists():
        print("Database not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if material_id is already nullable
        cursor.execute("PRAGMA table_info(parts)")
        columns = cursor.fetchall()
        material_col = next((c for c in columns if c[1] == 'material_id'), None)
        
        if material_col:
            # material_col[3] is 'notnull' flag (1=True, 0=False)
            if material_col[3] == 0:
                print("Schema is already correct (material_id allows NULL).")
                return
            
        print("Fixing schema: Making parts.material_id nullable...")
        
        # 1. Rename existing table
        cursor.execute("ALTER TABLE parts RENAME TO parts_old")
        
        # 2. Create new table with nullable material_id
        # We need to reconstruct the CREATE statement. 
        # Ideally we use the updated definition, but here is a safe assumption relative to current state.
        create_sql = """
        CREATE TABLE parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            material_id INTEGER,  -- Changed from NOT NULL to NULLABLE
            name VARCHAR NOT NULL,
            width FLOAT NOT NULL,
            height FLOAT NOT NULL,
            quantity INTEGER DEFAULT 1,
            allow_rotation BOOLEAN DEFAULT 1,
            grain_direction INTEGER DEFAULT 0,
            edge_top_id INTEGER,
            edge_bottom_id INTEGER,
            edge_left_id INTEGER,
            edge_right_id INTEGER,
            notes TEXT,
            step_model_id INTEGER,
            auto_extracted BOOLEAN DEFAULT 0,
            extraction_metadata TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id),
            FOREIGN KEY(material_id) REFERENCES materials(id),
            FOREIGN KEY(edge_top_id) REFERENCES edge_bands(id),
            FOREIGN KEY(edge_bottom_id) REFERENCES edge_bands(id),
            FOREIGN KEY(edge_left_id) REFERENCES edge_bands(id),
            FOREIGN KEY(edge_right_id) REFERENCES edge_bands(id),
            FOREIGN KEY(step_model_id) REFERENCES step_models(id)
        )
        """
        cursor.execute(create_sql)
        
        # 3. Copy data
        # We map columns explicitly to be safe
        cursor.execute("""
            INSERT INTO parts (
                id, project_id, material_id, name, width, height, quantity, 
                allow_rotation, grain_direction, edge_top_id, edge_bottom_id, 
                edge_left_id, edge_right_id, notes, step_model_id, auto_extracted, extraction_metadata
            )
            SELECT 
                id, project_id, material_id, name, width, height, quantity, 
                allow_rotation, grain_direction, edge_top_id, edge_bottom_id, 
                edge_left_id, edge_right_id, notes, step_model_id, auto_extracted, extraction_metadata
            FROM parts_old
        """)
        
        # 4. Drop old table
        cursor.execute("DROP TABLE parts_old")
        
        # 5. Restore Indices
        cursor.execute("CREATE INDEX idx_parts_step_model ON parts(step_model_id)")
        cursor.execute("CREATE INDEX idx_parts_project_id ON parts(project_id)")
        cursor.execute("CREATE INDEX idx_parts_material_id ON parts(material_id)")
        cursor.execute("CREATE INDEX idx_parts_name ON parts(name)")

        conn.commit()
        print("Schema fixed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error executing migration: {e}")
        # If we failed after rename but before drop, we might want to restore?
        # Simpler: User might need to restore backup if this critical fail happens.
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema()
