# -*- coding: utf-8 -*-
"""
Migration script to add k_metric column to optimization_results
"""
import sqlite3
import os
import sys

# Force UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Find database path
script_dir = os.path.dirname(os.path.abspath(__file__))
# app/main.py -> app -> Bin -> System -> Backend
# Structure: logiciel_V4/Moteur/Backend/System/Bin/add_k_metric_column.py
moteur_dir = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))
db_path = os.path.join(moteur_dir, "UserData", "BaseDeDonnees", "opticut.db")
db_path = os.path.normpath(db_path)

print(f"[INFO] Database path: {db_path}")

if not os.path.exists(db_path):
    print("[ERROR] Database not found!")
    sys.exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n[RUNNING] Adding k_metric column to optimization_results...\n")

try:
    cursor.execute("ALTER TABLE optimization_results ADD COLUMN k_metric FLOAT DEFAULT NULL")
    print("[OK] Column 'k_metric' added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("[SKIP] Column 'k_metric' already exists.")
    else:
        print(f"[ERROR] {e}")

conn.commit()
conn.close()
print("\n[DONE] Migration complete!")
