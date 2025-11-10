"""
Migration script to add archived and archived_at fields to detection_events table
"""
import sqlite3
from pathlib import Path

# Database path
db_path = Path(__file__).parent / "ppe_compliance.db"

def migrate():
    """Add archived fields to detection_events table"""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(detection_events)")
        columns = [row[1] for row in cursor.fetchall()]

        # Add archived column if it doesn't exist
        if 'archived' not in columns:
            print("Adding 'archived' column to detection_events table...")
            cursor.execute("ALTER TABLE detection_events ADD COLUMN archived BOOLEAN DEFAULT 0 NOT NULL")
            print("[OK] 'archived' column added")
        else:
            print("[OK] 'archived' column already exists")

        # Add archived_at column if it doesn't exist
        if 'archived_at' not in columns:
            print("Adding 'archived_at' column to detection_events table...")
            cursor.execute("ALTER TABLE detection_events ADD COLUMN archived_at DATETIME")
            print("[OK] 'archived_at' column added")
        else:
            print("[OK] 'archived_at' column already exists")

        # Create index on archived field if it doesn't exist
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='index' AND name='ix_detection_events_archived'
        """)
        if not cursor.fetchone():
            print("Creating index on 'archived' column...")
            cursor.execute("CREATE INDEX ix_detection_events_archived ON detection_events (archived)")
            print("[OK] Index created")
        else:
            print("[OK] Index already exists")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Running migration: Add archived fields to detection_events")
    print("=" * 60)
    migrate()
