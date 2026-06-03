import sqlite3
import os
from pathlib import Path

db_path = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db"
db_old_path = db_path + ".old"

def check_db(path, output_file):
    if not os.path.exists(path):
        with open(output_file, "a") as f:
            f.write(f"File {path} does not exist.\n")
        return
    
    size = os.path.getsize(path)
    with open(output_file, "a") as f:
        f.write(f"\nChecking database: {path}\n")
        f.write(f"Size: {size / 1024:.2f} KB\n")
    
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        with open(output_file, "a") as f:
            f.write(f"Tables: {', '.join(tables)}\n")
        
        if 'projects' in tables:
            cursor.execute("SELECT COUNT(*) FROM projects")
            count = cursor.fetchone()[0]
            with open(output_file, "a") as f:
                f.write(f"Number of projects: {count}\n")
        else:
            with open(output_file, "a") as f:
                f.write("Table 'projects' not found.\n")
            
        conn.close()
    except Exception as e:
        with open(output_file, "a") as f:
            f.write(f"Error checking database: {e}\n")

output_file = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\db_diag_results.txt"
if os.path.exists(output_file):
    os.remove(output_file)

check_db(db_path, output_file)
check_db(db_old_path, output_file)

