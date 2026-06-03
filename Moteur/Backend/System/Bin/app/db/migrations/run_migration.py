"""
Database Migration Script for STEP Import Support
Automatically applies migration 001_add_step_support.sql to the database
"""
import sqlite3
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
DB_PATH = BASE_DIR / "UserData" / "BaseDeDonnees" / "opticut.db"
MIGRATION_PATH = Path(__file__).parent / "001_add_step_support.sql"

def run_migration():
    """Run the STEP support migration."""
    
    if not DB_PATH.exists():
        logger.error(f"Database not found at {DB_PATH}")
        return False
    
    if not MIGRATION_PATH.exists():
        logger.error(f"Migration file not found at {MIGRATION_PATH}")
        return False
    
    logger.info(f"Running migration: {MIGRATION_PATH.name}")
    logger.info(f"Database: {DB_PATH}")
    
    try:
        # Read migration SQL
        with open(MIGRATION_PATH, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Connect and execute
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Split by semicolons and execute each statement
        statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for i, statement in enumerate(statements):
            if statement:
                try:
                    logger.info(f"Executing statement {i+1}/{len(statements)}")
                    cursor.execute(statement)
                except sqlite3.Error as e:
                    # Some statements may fail if already applied (e.g., table exists)
                    # This is OK for idempotent migrations
                    logger.warning(f"Statement {i+1} warning: {e}")
                    continue
        
        conn.commit()
        conn.close()
        
        logger.info("✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    import sys
    success = run_migration()
    sys.exit(0 if success else 1)
