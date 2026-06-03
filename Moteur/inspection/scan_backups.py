import sqlite3
import os
import glob

# Search in safe_backups
search_root = r'backend\safe_backups'
backups = glob.glob(os.path.join(search_root, "*.db*")) # .db.bak or others
backups.sort(key=os.path.getmtime, reverse=True)

print(f"Scanning {len(backups)} backups in {search_root}...")

for db_path in backups:
    filename = os.path.basename(db_path)
    # print(f"Checking {filename}...")
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # List tables
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in c.fetchall()]
        
        counts = []
        found_keywords = False
        
        for table in tables:
            try:
                c.execute(f"SELECT COUNT(*) FROM {table}")
                count = c.fetchone()[0]
                if count > 0:
                    counts.append(f"{table}: {count}")
                
                # Deep search
                c.execute(f"SELECT * FROM {table}")
                rows = c.fetchall()
                for row in rows:
                    if "maia" in str(row).lower():
                        print(f"\n!!!!!! FOUND 'maia' in {filename} -> table '{table}': {row} !!!!!!\n")
                        found_keywords = True
            except: pass
        
        if counts and (found_keywords or "clients" in str(counts) or "projects" in str(counts) or "projets" in str(counts)):
             print(f"[{filename}] Contains data: {', '.join(counts)}")
             
        conn.close()
    except Exception as e:
         pass # print(f"Error reading {db_path}: {e}")
