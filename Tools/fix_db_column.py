import sqlite3
import os

# Path to the database
db_path = r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db"

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(hardware)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "product_url" in columns:
        print("Column 'product_url' already exists.")
    else:
        print("Adding column 'product_url'...")
        cursor.execute("ALTER TABLE hardware ADD COLUMN product_url VARCHAR")
        conn.commit()
        print("Column added successfully.")
        
    conn.close()
except Exception as e:
    print(f"An error occurred: {e}")
