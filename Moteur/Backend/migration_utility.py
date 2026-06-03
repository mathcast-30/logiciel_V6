import os
import shutil
import sqlite3
from pathlib import Path

# Path Discovery
BASE_DIR = Path(__file__).resolve().parent # Backend
USER_DATA_ROOT = BASE_DIR.parent / "UserData" # Moteur/UserData
CLIENTS_ROOT = USER_DATA_ROOT / "Clients"
DB_PATH = USER_DATA_ROOT / "BaseDeDonnees" / "opticut.db"

def sanitize(name):
    if not name:
        return "Sans_Nom"
    # Match the logic in the main app to ensure paths match
    clean = "".join([c for c in name if c.isalnum() or c in (' ', '-', '_')]).strip()
    clean = clean.replace(' ', '_')
    return clean or "Sans_Nom"

def get_db_info():
    """Returns a mapping of sanitized_client -> sanitized_project -> project_id"""
    mapping = {}
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all projects with their clients
        cursor.execute("""
            SELECT p.id, p.name as proj_name, c.name as client_name 
            FROM projects p 
            LEFT JOIN clients c ON p.client_id = c.id
        """)
        rows = cursor.fetchall()
        
        for row in rows:
            c_name = sanitize(row['client_name'] or "Inconnu")
            p_name = sanitize(row['proj_name'])
            
            if c_name not in mapping:
                mapping[c_name] = {}
            mapping[c_name][p_name] = row['id']
            
        conn.close()
    except Exception as e:
        print(f"Error reading database: {e}")
    return mapping

def move_item(source, target):
    """Moves a file or directory, merging if target exists."""
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.is_dir():
        if target.exists():
            # Merge contents
            for sub_item in source.iterdir():
                move_item(sub_item, target / sub_item.name)
            # Remove empty source
            try:
                source.rmdir()
            except:
                pass
        else:
            shutil.move(str(source), str(target))
    else:
        # File: overwrite if exists but usually these are unique
        shutil.copy2(str(source), str(target))
        # source.unlink() # We keep originals for safety for now? 
        # User asked to "range" (arrange/tidy), implying moving. 
        # But per implementation plan, we redo from scratch. 
        # Actually copying is safer until verification.

def migrate_category(source_root, category_name, db_mapping):
    if not source_root.exists():
        return

    print(f"\n--- Migrating {source_root.name} -> {category_name} ---")
    
    # Iterate over potential client folders
    for client_folder in source_root.iterdir():
        if not client_folder.is_dir(): continue
        
        s_client = sanitize(client_folder.name)
        if s_client not in db_mapping and client_folder.name not in db_mapping:
            if client_folder.name.lower() != 'labels':
                print(f"Skipping non-client folder: {client_folder.name}")
            continue

        # Iterate over project folders
        for project_folder in client_folder.iterdir():
            if not project_folder.is_dir(): continue
            
            s_project = sanitize(project_folder.name)
            # Find the match in mapping (either exact or sanitized)
            project_id = None
            client_map = db_mapping.get(s_client) or db_mapping.get(client_folder.name)
            if client_map:
                project_id = client_map.get(s_project) or client_map.get(project_folder.name)

            if not project_id:
                print(f"  Skipping non-project folder: {client_folder.name}/{project_folder.name}")
                continue

            print(f"  Processing {client_folder.name}/{project_folder.name}...")
            
            # Destination Project Root
            target_proj_root = CLIENTS_ROOT / s_client / s_project / category_name
            
            # Now, move EVERYTHING inside project_folder to target_proj_root
            # PRESERVING subfolders (timestamps/runs)
            for item in project_folder.iterdir():
                target_path = target_proj_root / item.name
                try:
                    move_item(item, target_path)
                    print(f"    - {item.name}")
                except Exception as e:
                    print(f"    !! Error moving {item.name}: {e}")

def update_db_paths():
    """Update optimization results file_path to new structure (relative)"""
    print("\nUpdating database file paths...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # We look into the new Clients folder and match results
        for client_dir in CLIENTS_ROOT.iterdir():
            if not client_dir.is_dir(): continue
            for proj_dir in client_dir.iterdir():
                if not proj_dir.is_dir(): continue
                
                optim_dir = proj_dir / "Optimisations"
                if not optim_dir.exists(): continue
                
                # Each subfolder in Optimisations is a run
                for run_dir in optim_dir.iterdir():
                    if not run_dir.is_dir(): continue
                    
                    # Search for representative files (PDF/PNG) to set as file_path
                    # We pick the first PDF or PNG found in the run folder
                    for f in run_dir.glob("*.pdf"):
                        rel_path = str(f.relative_to(USER_DATA_ROOT)).replace("\\", "/")
                        # Try to find recent matching project_id
                        # Optimization results usually have project_id. 
                        # This is tricky without knowing which run is which, 
                        # but we can at least fill nulls for the project.
                        cursor.execute("""
                            UPDATE optimization_results 
                            SET file_path = ? 
                            WHERE project_id IN (SELECT id FROM projects WHERE name = ?) 
                            AND (file_path IS NULL OR file_path = '')
                        """, (rel_path, proj_dir.name))
                        break
        
        conn.commit()
        conn.close()
        print("Database paths updated.")
    except Exception as e:
        print(f"Error updating DB: {e}")

def main():
    print("Starting Isolated Data Migration (Structure Preserving)...")
    
    # 1. Load DB info to identify real targets
    db_mapping = get_db_info()
    
    # 2. Migrate categories
    migrate_category(USER_DATA_ROOT / "Exports", "Fiches_de_Debit", db_mapping)
    migrate_category(USER_DATA_ROOT / "Optimisations", "Optimisations", db_mapping)
    
    # 3. Update DB
    update_db_paths()
    
    print("\nMigration complete. Data isolated by project/run.")

if __name__ == "__main__":
    main()
