"""
Tests for the NexJob API.

1. Start the API in one terminal:   uvicorn main:app
2. Run this in another terminal:    python test_api.py

It adds a test job, changes it and deletes it again,
so the database ends up the same as before.
"""
import json
import urllib.error
import urllib.request
from pathlib import Path

URL = "http://127.0.0.1:8000"
DATA_FOLDER = Path(__file__).parent.parent / "public" / "data"
results = []


def call(method, path, body=None):
    """Send a request to the API and return (status code, JSON reply)."""
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(URL + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:  # 404, 422 and so on
        return error.code, json.load(error)


def check(name, ok):
    """Print PASS or FAIL for one test."""
    print(("PASS  " if ok else "FAIL  ") + name)
    results.append(ok)


def same_as_file(from_api, from_file):
    """True when every field in the JSON file has the same value in the API's answer."""
    return all(from_api.get(key) == value for key, value in from_file.items())


test_job = {
    "title": "Test Job",
    "companyId": "stripe",
    "location": "Remote",
    "remote": True,
    "discipline": "Engineering",
    "level": "Junior",
    "salaryMin": 50000,
    "salaryMax": 70000,
    "tags": ["Python", "MySQL"],
    "postedBy": "test-user",
}

# Reading
status, body = call("GET", "/")
check("GET / says MySQL is connected", status == 200 and "connected" in body["message"])

status, companies = call("GET", "/companies")
check(f"GET /companies returns companies ({len(companies)})", status == 200 and len(companies) > 0)

file_companies = json.loads((DATA_FOLDER / "companies.json").read_text(encoding="utf-8"))
api_stripe = next(c for c in companies if c["id"] == "stripe")
file_stripe = next(c for c in file_companies if c["id"] == "stripe")
check("A company from the API matches companies.json", same_as_file(api_stripe, file_stripe))

status, jobs = call("GET", "/jobs")
check(f"GET /jobs returns jobs ({len(jobs)})", status == 200 and len(jobs) > 0)

file_jobs = json.loads((DATA_FOLDER / "jobs.json").read_text(encoding="utf-8"))
status, job = call("GET", "/jobs/1")
check("GET /jobs/1 matches jobs.json", status == 200 and same_as_file(job, file_jobs[0]))

status, body = call("GET", "/jobs/999999")
check("GET /jobs/999999 gives 404", status == 404)

# Adding
status, new_job = call("POST", "/jobs", test_job)
check("POST /jobs adds a job", status == 201 and same_as_file(new_job, test_job))
new_id = new_job["id"]

status, body = call("POST", "/jobs", {"title": "No other fields"})
check("POST /jobs with missing fields gives 422", status == 422)

status, jobs_now = call("GET", "/jobs")
check("GET /jobs now has one more job", len(jobs_now) == len(jobs) + 1)

# Changing (this is how an employer closes a role)
changed = {**test_job, "status": "closed"}
status, job = call("PUT", f"/jobs/{new_id}", changed)
check(f"PUT /jobs/{new_id} closes the job", status == 200 and job["status"] == "closed")

status, body = call("PUT", "/jobs/999999", changed)
check("PUT /jobs/999999 gives 404", status == 404)

# Deleting
status, body = call("DELETE", f"/jobs/{new_id}")
check(f"DELETE /jobs/{new_id} deletes the job", status == 200)

status, body = call("GET", f"/jobs/{new_id}")
check(f"GET /jobs/{new_id} gives 404 after delete", status == 404)

status, body = call("DELETE", f"/jobs/{new_id}")
check(f"DELETE /jobs/{new_id} again gives 404", status == 404)

status, jobs_now = call("GET", "/jobs")
check("GET /jobs is back to the starting count", len(jobs_now) == len(jobs))

print(f"\n{results.count(True)} of {len(results)} tests passed")
