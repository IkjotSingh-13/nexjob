"""
The MySQL connection.

Your MySQL login is read from the .env file in this folder.
Copy .env.example to .env and put your own password in it.
"""
import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "nexjob")


def get_connection(database=DB_NAME):
    """Open a new connection to MySQL."""
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=database,
    )


def fetch_all(sql, params=()):
    """Run a SELECT and return the rows as a list of dicts."""
    with get_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        return cursor.fetchall()


def execute(sql, params=()):
    """Run an INSERT, UPDATE or DELETE, save it, and return the new row's id."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
