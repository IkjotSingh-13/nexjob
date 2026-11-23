"""
NexJob API: FastAPI + MySQL.

Start it from this folder:
    uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs to try every endpoint in the browser.
"""
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import execute, fetch_all

app = FastAPI(title="NexJob API")

# Let the React site call this API: npm run dev (5173) and npm run preview (4173).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Job(BaseModel):
    """What the React site sends to POST /jobs and PUT /jobs/{id}."""
    title: str
    companyId: str
    companyName: str | None = None
    location: str
    remote: bool = False
    type: str = "Full-time"
    discipline: str
    level: str
    salaryMin: int
    salaryMax: int
    postedHoursAgo: int = 0
    featured: bool = False
    summary: str = ""
    tags: list[str] = []
    responsibilities: list[str] = []
    requirements: list[str] = []
    status: str = "open"        # "open" or "closed"
    postedBy: str | None = None  # the employer's user id; empty for the sample jobs


def job_from_row(row):
    """MySQL gives back 1/0 and JSON text. Turn them into true/false and lists."""
    row["remote"] = bool(row["remote"])
    row["featured"] = bool(row["featured"])
    row["tags"] = json.loads(row["tags"])
    row["responsibilities"] = json.loads(row["responsibilities"])
    row["requirements"] = json.loads(row["requirements"])
    return row


def company_from_row(row):
    """Turn the perks JSON text back into a list."""
    row["perks"] = json.loads(row["perks"])
    return row


@app.get("/")
def home():
    fetch_all("SELECT 1")  # fails here if MySQL cannot be reached
    return {"message": "NexJob API is running and MySQL is connected"}


@app.get("/companies")
def list_companies():
    rows = fetch_all("SELECT * FROM companies ORDER BY name")
    return [company_from_row(row) for row in rows]


@app.get("/jobs")
def list_jobs():
    rows = fetch_all("SELECT * FROM jobs ORDER BY id")
    return [job_from_row(row) for row in rows]


@app.get("/jobs/{job_id}")
def get_job(job_id: int):
    rows = fetch_all("SELECT * FROM jobs WHERE id = %s", (job_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_from_row(rows[0])


@app.post("/jobs", status_code=201)
def create_job(job: Job):
    new_id = execute(
        """INSERT INTO jobs (title, companyId, companyName, location, remote, type, discipline, level,
                             salaryMin, salaryMax, postedHoursAgo, featured, summary,
                             tags, responsibilities, requirements, status, postedBy)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (job.title, job.companyId, job.companyName, job.location, job.remote, job.type,
         job.discipline, job.level, job.salaryMin, job.salaryMax, job.postedHoursAgo,
         job.featured, job.summary, json.dumps(job.tags), json.dumps(job.responsibilities),
         json.dumps(job.requirements), job.status, job.postedBy),
    )
    return get_job(new_id)


@app.put("/jobs/{job_id}")
def update_job(job_id: int, job: Job):
    get_job(job_id)  # sends 404 if the job does not exist
    execute(
        """UPDATE jobs
           SET title = %s, companyId = %s, companyName = %s, location = %s, remote = %s,
               type = %s, discipline = %s, level = %s, salaryMin = %s, salaryMax = %s,
               postedHoursAgo = %s, featured = %s, summary = %s, tags = %s,
               responsibilities = %s, requirements = %s, status = %s, postedBy = %s
           WHERE id = %s""",
        (job.title, job.companyId, job.companyName, job.location, job.remote, job.type,
         job.discipline, job.level, job.salaryMin, job.salaryMax, job.postedHoursAgo,
         job.featured, job.summary, json.dumps(job.tags), json.dumps(job.responsibilities),
         json.dumps(job.requirements), job.status, job.postedBy, job_id),
    )
    return get_job(job_id)


@app.delete("/jobs/{job_id}")
def delete_job(job_id: int):
    get_job(job_id)  # sends 404 if the job does not exist
    execute("DELETE FROM jobs WHERE id = %s", (job_id,))
    return {"message": f"Job {job_id} deleted"}
