"""
A copy of the MySQL data in backend/nexjob.db (SQLite), so you can open it
in DB Browser for SQLite.

MySQL is still the real database. After every change the API calls
save_copy(), which rewrites nexjob.db from MySQL. Changes made inside
DB Browser are not sent back to MySQL.
"""
import sqlite3
from pathlib import Path

from database import fetch_all

DB_FILE = Path(__file__).parent / "nexjob.db"


def save_copy():
    """Copy the companies and jobs tables from MySQL into nexjob.db."""
    try:
        copy = sqlite3.connect(DB_FILE)
        for table in ["companies", "jobs"]:
            columns = [column["Field"] for column in fetch_all(f"SHOW COLUMNS FROM {table}")]
            rows = fetch_all(f"SELECT * FROM {table}")

            copy.execute(f"DROP TABLE IF EXISTS {table}")
            copy.execute(f"CREATE TABLE {table} ({', '.join(columns)})")

            marks = ", ".join(["?"] * len(columns))  # one ? per column
            copy.executemany(f"INSERT INTO {table} VALUES ({marks})",
                             [[row[column] for column in columns] for row in rows])
        copy.commit()
        copy.close()
    except sqlite3.Error as error:
        # e.g. nexjob.db is locked by unsaved edits in DB Browser. MySQL already has the change.
        print("Could not update nexjob.db:", error)
