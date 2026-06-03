import sqlite3
import os

db_path = r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db"

def check_table(cursor, table_name):
    print(f"\nChecking table: {table_name}")
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        cols = cursor.fetchall()
        if not cols:
            print(f"Table {table_name} does not exist!")
        else:
            for col in cols:
                print(f"  Column: {col[1]} ({col[2]})")
    except Exception as e:
        print(f"Error checking {table_name}: {e}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    check_table(cursor, "hardware")
    check_table(cursor, "hardware_assemblies")
    
    conn.close()
except Exception as e:
    print(f"An error occurred: {e}")
