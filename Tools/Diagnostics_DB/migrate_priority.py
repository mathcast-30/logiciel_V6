
import sqlite3
import os

DB_PATH = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database file not found at {DB_PATH}")
        return

    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if table 'parts' exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='parts';")
        if not cursor.fetchone():
            print("ERROR: Table 'parts' not found in database.")
            return

        # Check if column 'priority' exists
        cursor.execute("PRAGMA table_info(parts);")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'priority' not in columns:
            print("Adding column 'priority' to table 'parts'...")
            cursor.execute("ALTER TABLE parts ADD COLUMN priority INTEGER DEFAULT 0;")
            conn.commit()
            print("Migration successful: Column 'priority' added.")
        else:
            print("Column 'priority' already exists. Skipping.")

    except Exception as e:
        print(f"An error occurred during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
