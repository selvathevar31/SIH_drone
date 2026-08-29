import sqlite3
import os

def fix_database():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'qudracopter.db')
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    try:
        conn.execute('ALTER TABLE readings ADD COLUMN altitude_reference VARCHAR DEFAULT "RELATIVE_HOME"')
        print("Successfully added 'altitude_reference' column to readings table.")
    except sqlite3.OperationalError as e:
        print(f"Error (column might already exist): {e}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_database()
