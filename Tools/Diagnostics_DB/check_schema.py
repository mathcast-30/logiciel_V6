import sqlite3
import os

db_path = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db"

def get_table_info(table_name, f):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        f.write(f"--- Columns for {table_name} ---\n")
        for col in columns:
            f.write(f"Col {col[0]}: {col[1]} ({col[2]})\n")
        conn.close()
    except Exception as e:
        f.write(f"Error checking {table_name}: {e}\n")

with open("schema_output.txt", "w") as f:
    get_table_info("optimization_results", f)
    get_table_info("projects", f)
    get_table_info("parts", f)
    get_table_info("materials", f)
