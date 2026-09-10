import sqlite3
import pandas as pd
import json

db_path = r"c:\projects\drone\data\qudracopter.db"
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in DB: {tables}")
    for table in tables:
        table_name = table[0]
        df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
        print(f"\n--- Table: {table_name} ---")
        print(f"Rows: {len(df)}")
        print(f"Columns: {list(df.columns)}")
        print(f"Data Types:\n{df.dtypes}")
        if len(df) > 0:
            print("\nDescribe:")
            print(df.describe(include='all').to_string())
except Exception as e:
    print(f"Error: {e}")
