import os
import sqlite3
import shutil
import re
from pathlib import Path

def slugify(text):
    if not text:
        return "inconnu"
    text = str(text)
    # Replace spaces with _
    text = text.replace(" ", "_")
    # Remove special chars and accents (basic ascii conversion)
    import unicodedata
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    # Remove remaining non-alphanumeric chars (except _ and -)
    text = re.sub(r'[^a-zA-Z0-9_\-]', '', text)
    return text.strip('_')

def main():
    root_dir = Path(__file__).resolve().parent
    moteur_dir = root_dir / "Moteur"
    db_path = moteur_dir / "UserData" / "BaseDeDonnees" / "opticut.db"
    old_storage_dirs = [
        moteur_dir / "UserData" / "Optimisations",
        moteur_dir / "UserData" / "Clients",
        moteur_dir / "UserData" / "StepFiles",
    ]
    new_root_dir = moteur_dir / "clients"

    if not db_path.exists():
        print(f"[ERROR] Database not found at {db_path}")
        return

    print(f"[INFO] Connecting to database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all projects with client info
    query = """
        SELECT p.id as project_id, p.name as project_name, 
               c.id as client_id, c.name as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
    """
    cursor.execute(query)
    projects = cursor.fetchall()
    conn.close()

    if not projects:
        print("[INFO] No projects found in database.")
        return

    # Categories structure
    categories = ['devis', 'optimisations', 'pieces', 'materiaux']

    # Project mappings for file matching
    project_mappings = []

    print("[INFO] Creating new deterministic storage tree...")
    for proj in projects:
        c_id = proj['client_id'] or 0
        c_name = slugify(proj['client_name'] or "Sans Client")
        p_id = proj['project_id']
        p_name = slugify(proj['project_name'] or "Sans Projet")

        client_folder = f"{c_id}_{c_name}"
        project_folder = f"{p_id}_{p_name}"
        project_path = new_root_dir / client_folder / project_folder

        for cat in categories:
            cat_path = project_path / cat
            cat_path.mkdir(parents=True, exist_ok=True)
        
        project_mappings.append({
            'client_folder': client_folder,
            'project_folder': project_folder,
            'project_path': project_path,
            'p_id': p_id,
            'p_name': p_name,
            'c_name': c_name,
            # Matchers (ID prefix, or exact slugified name, etc)
            'matchers': [str(p_id), p_name, proj['project_name']]
        })

    print(f"[INFO] Scanning old storage directories for orphan files...")
    
    def determine_category(filename):
        ext = filename.lower().split('.')[-1]
        if ext == 'pdf':
            # Could be devis or optimisations. We check if 'devis' is in name.
            if 'devis' in filename.lower():
                return 'devis'
            return 'optimisations'
        elif ext in ['png', 'jpg', 'jpeg', 'svg']:
            return 'optimisations'
        elif ext in ['csv', 'step', 'stp', 'dxf']:
            return 'pieces'
        elif ext == 'json':
            if 'materiau' in filename.lower() or 'synth' in filename.lower():
                return 'materiaux'
            return 'optimisations'
        return 'optimisations' # Default fallback

    moved_count = 0
    for old_dir in old_storage_dirs:
        if not old_dir.exists():
            continue
            
        print(f"[INFO] Scanning {old_dir}...")
        for root, dirs, files in os.walk(str(old_dir)):
            for file in files:
                file_path = Path(root) / file
                # Skip db files
                if file.endswith('.db') or file.endswith('.sqlite'):
                    continue
                
                # Identify project
                matched_proj = None
                
                # Check if it's already structured in UserData/Clients/[ClientName]/[ProjectName]
                rel_path_parts = Path(root).relative_to(old_dir).parts if old_dir.name == "Clients" else []
                
                if len(rel_path_parts) >= 2:
                    c_name_part = slugify(rel_path_parts[0])
                    p_name_part = slugify(rel_path_parts[1])
                    for pm in project_mappings:
                        if pm['p_name'] == p_name_part and pm['c_name'] == c_name_part:
                            matched_proj = pm
                            break
                
                # Fallback: regex matching based on prefix "ID_" or just name
                if not matched_proj:
                    for pm in project_mappings:
                        p_id_str = str(pm['p_id'])
                        if file.startswith(f"{p_id_str}_") or pm['p_name'] in slugify(file):
                            matched_proj = pm
                            break
                
                if matched_proj:
                    category = determine_category(file)
                    dest_path = matched_proj['project_path'] / category / file
                    
                    # Ensure no overwrite issues by appending timestamp if exists
                    if dest_path.exists() and not dest_path.samefile(file_path):
                        import time
                        dest_path = matched_proj['project_path'] / category / f"{int(time.time())}_{file}"
                        
                    try:
                        shutil.move(str(file_path), str(dest_path))
                        print(f"  [OK] Moved {file} -> {dest_path.relative_to(new_root_dir)}")
                        moved_count += 1
                    except Exception as e:
                        print(f"  [ERROR] Failed to move {file}: {e}")

    print(f"[INFO] Migration complete. {moved_count} files moved to {new_root_dir}.")

if __name__ == "__main__":
    main()
