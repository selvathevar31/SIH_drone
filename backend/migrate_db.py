import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'qudracopter.db')

def run_migration():
    print(f"Running database migration on {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database file not found at {DB_PATH}")
        return
        
    try:
        conn = sqlite3.connect(DB_PATH)
        
        # Check if columns already exist
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(hotspots)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'min_altitude' not in columns:
            conn.execute('ALTER TABLE hotspots ADD COLUMN min_altitude FLOAT')
            print("Added min_altitude")
            
        if 'max_altitude' not in columns:
            conn.execute('ALTER TABLE hotspots ADD COLUMN max_altitude FLOAT')
            print("Added max_altitude")
            
        if 'average_altitude' not in columns:
            conn.execute('ALTER TABLE hotspots ADD COLUMN average_altitude FLOAT')
            print("Added average_altitude")
            
        conn.commit()
        print("Migration complete!")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
