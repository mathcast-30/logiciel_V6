import sqlite3
from pathlib import Path

DB_PATH = Path(r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\BaseDeDonnees\opticut.db")

def list_clients():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM clients")
        clients = cursor.fetchall()
        print("CLIENTS IN DATABASE:")
        for c in clients:
            print(f"ID: {c['id']}, Name: {c['name']}")
            
        cursor.execute("SELECT id, name, client_id FROM projects")
        projects = cursor.fetchall()
        print("\nPROJECTS IN DATABASE:")
        for p in projects:
            print(f"ID: {p['id']}, Name: {p['name']}, ClientID: {p['client_id']}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_clients()
