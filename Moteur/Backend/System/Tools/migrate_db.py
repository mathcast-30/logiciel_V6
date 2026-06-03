"""
Script de migration pour mettre à jour la base de données OptiCut
Ajoute les colonnes manquantes sans perdre les données existantes
"""
import sqlite3
import os
from pathlib import Path

# Professional Data Pathing
# Tree: Moteur/Backend/System/Tools/migrate_db.py
# Parents: 1:Tools, 2:System, 3:Backend, 4:Moteur
base_engine_path = Path(__file__).resolve().parent.parent.parent.parent
DB_PATH = base_engine_path / "UserData" / "BaseDeDonnees" / "opticut.db"

def column_exists(cursor, table, column):
    """Vérifie si une colonne existe dans une table"""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns

def migrate_database():
    """Applique toutes les migrations nécessaires"""
    if not os.path.exists(DB_PATH):
        print(f"[ERREUR] Base de donnees {DB_PATH} introuvable!")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    migrations_applied = []
    
    try:
        # Migration 1: Ajouter is_panel à materials
        if not column_exists(cursor, 'materials', 'is_panel'):
            print(">> Ajout de la colonne 'is_panel' a la table 'materials'...")
            cursor.execute("ALTER TABLE materials ADD COLUMN is_panel INTEGER DEFAULT 1")
            migrations_applied.append("materials.is_panel")
        
        # Migration 2: Ajouter supplier_ref à materials
        if not column_exists(cursor, 'materials', 'supplier_ref'):
            print(">> Ajout de la colonne 'supplier_ref' a la table 'materials'...")
            cursor.execute("ALTER TABLE materials ADD COLUMN supplier_ref TEXT")
            migrations_applied.append("materials.supplier_ref")
        
        # Migration 3: Ajouter has_grain à materials
        if not column_exists(cursor, 'materials', 'has_grain'):
            print(">> Ajout de la colonne 'has_grain' a la table 'materials'...")
            cursor.execute("ALTER TABLE materials ADD COLUMN has_grain INTEGER DEFAULT 0")
            migrations_applied.append("materials.has_grain")
        
        # Migration 4: Ajouter les colonnes edge_*_id à parts
        edge_columns = ['edge_top_id', 'edge_bottom_id', 'edge_left_id', 'edge_right_id']
        for col in edge_columns:
            if not column_exists(cursor, 'parts', col):
                print(f">> Ajout de la colonne '{col}' a la table 'parts'...")
                cursor.execute(f"ALTER TABLE parts ADD COLUMN {col} INTEGER")
                cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_parts_{col} ON parts({col})")
                migrations_applied.append(f"parts.{col}")
        
        # Migration 5: Ajouter notes à parts
        if not column_exists(cursor, 'parts', 'notes'):
            print(">> Ajout de la colonne 'notes' a la table 'parts'...")
            cursor.execute("ALTER TABLE parts ADD COLUMN notes TEXT")
            migrations_applied.append("parts.notes")

        # Migration 6: Ajouter grain_direction à stock
        if not column_exists(cursor, 'stock', 'grain_direction'):
            print(">> Ajout de la colonne 'grain_direction' a la table 'stock'...")
            cursor.execute("ALTER TABLE stock ADD COLUMN grain_direction INTEGER DEFAULT 1")
            migrations_applied.append("stock.grain_direction")

        # Migration 7: Ajouter grain_direction à parts
        if not column_exists(cursor, 'parts', 'grain_direction'):
            print(">> Ajout de la colonne 'grain_direction' a la table 'parts'...")
            cursor.execute("ALTER TABLE parts ADD COLUMN grain_direction INTEGER DEFAULT 0")
            migrations_applied.append("parts.grain_direction")

        # Migration 8: Ajouter is_validated à optimization_results
        if not column_exists(cursor, 'optimization_results', 'is_validated'):
            print(">> Ajout de la colonne 'is_validated' a la table 'optimization_results'...")
            cursor.execute("ALTER TABLE optimization_results ADD COLUMN is_validated BOOLEAN DEFAULT 0")
            migrations_applied.append("optimization_results.is_validated")
        
        # Commit des changements
        conn.commit()
        
        if migrations_applied:
            print(f"\n[OK] Migration reussie ! {len(migrations_applied)} colonnes ajoutees:")
            for migration in migrations_applied:
                print(f"   - {migration}")
        else:
            print("\n[OK] Base de donnees deja a jour, aucune migration necessaire!")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n[ERREUR] Erreur lors de la migration : {e}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  MIGRATION BASE DE DONNEES OPTICUT PRO")
    print("=" * 60)
    print()
    
    success = migrate_database()
    
    print()
    if success:
        print("[SUCCESS] Migration terminee avec succes!")
        print("   Vous pouvez maintenant redemarrer le serveur.")
    else:
        print("[WARNING] La migration a echoue. Verifiez les erreurs ci-dessus.")
    print()
