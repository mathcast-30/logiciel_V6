import sqlite3
from pathlib import Path

backend_path = Path(__file__).parent
base_engine_dir = backend_path.parent
db_path = base_engine_dir / "UserData" / "BaseDeDonnees" / "opticut.db"
if not db_path.exists():
    # Maybe it's somewhere else?
    print(f"Could not find DB at {db_path}")
else:
    print(f"Connecting to {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE optimization_results ADD COLUMN file_path VARCHAR(255);")
        conn.commit()
        print("Successfully added file_path column.")
    except Exception as e:
        print(f"Error adding column (maybe it already exists?): {e}")
    finally:
        conn.close()
