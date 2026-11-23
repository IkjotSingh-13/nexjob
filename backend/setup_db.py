"""
Creates the nexjob database and its two tables, then fills them
from the JSON files in public/data.

Run it once from this folder:
    python setup_db.py

Running it again is safe. Tables that already exist are kept, and rows
that are already in the database are skipped (INSERT IGNORE).

The column names are the same as the keys in the JSON files (salaryMin,
companyId ...), so the API sends the React site the shape it already reads.
Lists, like a job's tags, are stored in JSON columns.
"""
import json
from pathlib import Path

from database import DB_NAME, get_connection
from sqlite_copy import save_copy

DATA_FOLDER = Path(__file__).parent.parent / "public" / "data"

# 1. Create the database.
with get_connection(database=None) as conn:
    conn.cursor().execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")

# 2. Create the tables and fill them.
with get_connection() as conn:
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id       VARCHAR(50) PRIMARY KEY,
            name     VARCHAR(100) NOT NULL,
            initial  VARCHAR(5),
            brandBg  VARCHAR(20),
            brandFg  VARCHAR(20),
            industry VARCHAR(100),
            size     VARCHAR(50),
            hq       VARCHAR(100),
            founded  INT,
            site     VARCHAR(100),
            tagline  VARCHAR(255),
            about    TEXT,
            perks    JSON
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            title            VARCHAR(150) NOT NULL,
            companyId        VARCHAR(50) NOT NULL,
            companyName      VARCHAR(100),
            location         VARCHAR(100),
            remote           BOOLEAN DEFAULT FALSE,
            type             VARCHAR(50),
            discipline       VARCHAR(50),
            level            VARCHAR(50),
            salaryMin        INT,
            salaryMax        INT,
            postedHoursAgo   INT DEFAULT 0,
            featured         BOOLEAN DEFAULT FALSE,
            summary          TEXT,
            tags             JSON,
            responsibilities JSON,
            requirements     JSON,
            status           VARCHAR(20) DEFAULT 'open',
            postedBy         VARCHAR(50)
        )
    """)

    companies = json.loads((DATA_FOLDER / "companies.json").read_text(encoding="utf-8"))
    for c in companies:
        cursor.execute(
            """INSERT IGNORE INTO companies (id, name, initial, brandBg, brandFg, industry, size,
                                             hq, founded, site, tagline, about, perks)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (c["id"], c["name"], c["initial"], c["brandBg"], c["brandFg"], c["industry"], c["size"],
             c["hq"], c["founded"], c["site"], c["tagline"], c["about"], json.dumps(c["perks"])),
        )

    jobs = json.loads((DATA_FOLDER / "jobs.json").read_text(encoding="utf-8"))
    for j in jobs:
        cursor.execute(
            """INSERT IGNORE INTO jobs (id, title, companyId, location, remote, type, discipline, level,
                                        salaryMin, salaryMax, postedHoursAgo, featured, summary,
                                        tags, responsibilities, requirements)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (j["id"], j["title"], j["companyId"], j["location"], j["remote"], j["type"],
             j["discipline"], j["level"], j["salaryMin"], j["salaryMax"], j["postedHoursAgo"],
             j["featured"], j["summary"], json.dumps(j["tags"]),
             json.dumps(j["responsibilities"]), json.dumps(j["requirements"])),
        )

    conn.commit()

# 3. Write the SQLite copy, backend/nexjob.db, for DB Browser.
save_copy()

print(f"Done. {len(companies)} companies and {len(jobs)} jobs are in the '{DB_NAME}' database.")
print("A copy for DB Browser for SQLite is in backend/nexjob.db")
