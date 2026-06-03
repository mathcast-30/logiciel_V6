import sqlite3
import os
import sys

# Find database path
script_dir = os.path.dirname(os.path.abspath(__file__))
moteur_dir = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))
db_path = os.path.join(moteur_dir, "UserData", "BaseDeDonnees", "opticut.db")
db_path = os.path.normpath(db_path)

print(f"[INFO] Database path: {db_path}")

if not os.path.exists(db_path):
    print("[ERROR] Database not found!")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("[RUNNING] Adding k_metric to optimization_results...")

try:
    cursor.execute("ALTER TABLE optimization_results ADD COLUMN k_metric FLOAT")
    conn.commit()
    print("[OK] Column k_metric added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("[SKIP] Column k_metric already exists.")
    else:
        print(f"[ERROR] {e}")

conn.close()
print("[DONE] Migration complete.")
