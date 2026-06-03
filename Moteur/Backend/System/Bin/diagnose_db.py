
import sys
import os
from pathlib import Path
from sqlalchemy import text

# Add current directory to path so we can import app
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

try:
    from app.db.database import get_db, engine, db_path
    print(f"DEBUG: Resolved DB Path: {db_path}")
    print(f"DEBUG: DB Exists: {db_path.exists()}")
    print(f"DEBUG: DB Size: {db_path.stat().st_size} bytes" if db_path.exists() else "DB Size: N/A")

    with engine.connect() as conn:
        print("DEBUG: Connection successful.")
        
        tables = ["clients", "projects", "materials", "stock", "optimization_results"]
        for t in tables:
            try:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {t}"))
                count = result.scalar()
                print(f"Table '{t}': {count} rows")
            except Exception as e:
                print(f"Table '{t}': Error - {e}")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
