import sqlite3
import json
import os

db_path = r"Moteur\UserData\BaseDeDonnees\opticut.db"

def populate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add some default hardware if it doesn't exist
    hardware_items = [
        ("REF-CHAR-01", "Charnière Invisible 110°", "hinge", 2.50, "Blum", "https://www.blum.com"),
        ("REF-COUL-450", "Coulisse à billes 450mm", "slide", 12.00, "Hettich", "https://www.hettich.com"),
        ("REF-VIS-4x45", "Vis VBA 4x45mm (Boite 200)", "screw", 8.50, "Spax", "https://www.spax.com"),
        ("REF-TOUR-8", "Tourillon Hêtre 8mm", "other", 0.05, "Générique", None)
    ]
    
    for ref, name, cat, cost, supplier, url in hardware_items:
        cursor.execute("SELECT id FROM hardware WHERE reference = ?", (ref,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO hardware (reference, name, category, cost_unit, supplier, product_url, stock_quantity, min_stock)
                VALUES (?, ?, ?, ?, ?, ?, 100, 10)
            """, (ref, name, cat, cost, supplier, url))
    
    conn.commit()
    
    # Get IDs
    cursor.execute("SELECT id, name FROM hardware")
    hw_map = {name: id for id, name in cursor.fetchall()}
    
    # 2. Add calculation rules
    # Rule for Hinges (Height based)
    # Note: The engine supports multiple rules. We can use conditions to split them.
    # OR we can use a complex formula if the engine supported it.
    # Given evaluate_condition current state, it's better to have multiple rules.
    
    rules = [
        ("Charnières (Petite porte < 900)", "2 charnières pour portes < 900mm", 
         json.dumps({"keywords": ["porte"], "max_height": 900}),
         json.dumps([{"hardware_id": hw_map["Charnière Invisible 110°"], "quantity": 2}])),
         
        ("Charnières (Moyenne porte 900-1600)", "3 charnières pour portes entre 900 et 1600mm", 
         json.dumps({"keywords": ["porte"], "min_height": 900, "max_height": 1600}),
         json.dumps([{"hardware_id": hw_map["Charnière Invisible 110°"], "quantity": 3}])),

        ("Coulisses Tiroir", "1 paire de coulisses; Longueur = Profondeur - 50mm", 
         json.dumps({"keywords": ["tiroir", "cote"]}),
         json.dumps([{"hardware_id": hw_map["Coulisse à billes 450mm"], "quantity": 1, "formula": "1"}])),
         
        ("Tourillons Assemblage", "1 tourillon tous les 150mm", 
         json.dumps({"keywords": ["cote", "dessus", "dessous"]}),
         json.dumps([{"hardware_id": hw_map["Tourillon Hêtre 8mm"], "quantity": 2, "formula": "max(2, ceil(height / 150))"}]))
    ]
    
    for name, desc, cond, items in rules:
        cursor.execute("SELECT id FROM hardware_assemblies WHERE name = ?", (name,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO hardware_assemblies (name, description, conditions, items)
                VALUES (?, ?, ?, ?)
            """, (name, desc, cond, items))
            
    conn.commit()
    conn.close()
    print("Default hardware and rules populated.")

if __name__ == "__main__":
    populate()
