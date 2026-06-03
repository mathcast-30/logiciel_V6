
import sqlite3
import os
from pathlib import Path

def check_db(path):
    print(f"--- Checking {path} ---")
    if not os.path.exists(path):
        print("File does not exist.")
        return
    
    print(f"Size: {os.path.getsize(path)} bytes")
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Get tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Tables: {tables}")
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"Table '{table}': {count} rows")
            except Exception as e:
                print(f"Error reading table {table}: {e}")
        
        conn.close()
    except Exception as e:
        print(f"Failed to connect: {e}")

# Check current DB
db1 = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db"
check_db(db1)

# Check old DB
db2 = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db.old"
check_db(db2)
