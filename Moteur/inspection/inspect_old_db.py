import sqlite3
import os

db_path = r'..\logiciel_V4 - Copie\backend\opticut.db'

if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
    exit()

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # List tables
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in c.fetchall()]
    print(f"Tables found: {tables}")
    
    # Dump content of each table to see if we find "maia"
    for table in tables:
        # print(f"\n--- Content of {table} ---")
        try:
            c.execute(f"SELECT * FROM {table}")
            rows = c.fetchall()
            for row in rows:
                if "maia" in str(row).lower():
                    print(f"\n!!! FOUND 'maia' in table '{table}': {row} !!!\n")
                # print(row) 
        except Exception as e:
            print(f"Error reading {table}: {e}")
            
    conn.close()

except Exception as e:
    print(f"Global Error: {e}")
