"""
Database migration script to add raw wood support fields.

Adds:
- materials.species (VARCHAR)
- stock.defects (TEXT/JSON)

Run with: python migrate_raw_wood_support.py
"""

import sqlite3
import os
from pathlib import Path

# Robustly find 'Moteur' anchor and DB path
current_path = Path(__file__).resolve()
try:
    moteur_index = current_path.parts.index("Moteur")
    base_engine_dir = Path(*current_path.parts[:moteur_index+1])
except ValueError:
    # Fallback
    base_engine_dir = current_path.parent.parent.parent.parent.parent
    
DB_PATH = base_engine_dir / "UserData" / "BaseDeDonnees" / "opticut.db"

def migrate():
    """Add fields for raw wood optimizer support."""
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(materials)")
        material_columns = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(stock)")
        stock_columns = [col[1] for col in cursor.fetchall()]
        
        # Add species to materials if not exists
        if "species" not in material_columns:
            print("[OK] Adding 'species' column to materials table...")
            cursor.execute("ALTER TABLE materials ADD COLUMN species VARCHAR(50)")
        else:
            print("[INFO] 'species' column already exists in materials")
        
        # Add defects to stock if not exists
        # Add defects to stock if not exists
        if "defects" not in stock_columns:
            print("[OK] Adding 'defects' column to stock table...")
            cursor.execute("ALTER TABLE stock ADD COLUMN defects TEXT")
        
        # Add quality_score to stock
        if "quality_score" not in stock_columns:
            print("[OK] Adding 'quality_score' column to stock table...")
            cursor.execute("ALTER TABLE stock ADD COLUMN quality_score FLOAT DEFAULT 1.0")

        # Add label to stock
        if "label" not in stock_columns:
            print("[OK] Adding 'label' column to stock table...")
            cursor.execute("ALTER TABLE stock ADD COLUMN label VARCHAR(255)")

        # Add is_offcut to stock
        if "is_offcut" not in stock_columns:
             print("[OK] Adding 'is_offcut' column to stock table...")
             cursor.execute("ALTER TABLE stock ADD COLUMN is_offcut BOOLEAN DEFAULT 0")

        # Add grain_direction to stock
        if "grain_direction" not in stock_columns:
             print("[OK] Adding 'grain_direction' column to stock table...")
             cursor.execute("ALTER TABLE stock ADD COLUMN grain_direction INTEGER DEFAULT 1")
             
        # Check completeness
        print(f"[INFO] Stock columns checked: defects, quality_score, label, is_offcut, grain_direction")
        
        conn.commit()
        print("\n[OK] Migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"\n[ERROR] Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=== Raw Wood Optimizer - Database Migration ===\n")
    migrate()
