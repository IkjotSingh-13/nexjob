/**
 * Talks to the FastAPI + MySQL backend in backend/.
 *
 * Every function returns a Promise: `.then` gets the answer, `.catch` gets
 * the error (backend not running, job not found ...).
 */

const API_URL = 'http://127.0.0.1:8000';

/* The backend runs on your own computer. On GitHub Pages there is none,
   so there the site reads the JSON files in public/data instead. */
export const hasBackend = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const request = (path, method = 'GET', body) => {
  if (!hasBackend) return Promise.reject(new Error('The backend only runs on your own computer.'));

  return fetch(API_URL + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  }).then((response) => {
    if (!response.ok) throw new Error(`${method} ${path} — HTTP ${response.status}`);
    return response.json();
  });
};

export const getJobs = () => request('/jobs');

export const getCompanies = () => request('/companies');

export const createJob = (job) => request('/jobs', 'POST', job);

export const updateJob = (job) => request(`/jobs/${job.id}`, 'PUT', job);

export const deleteJob = (id) => request(`/jobs/${id}`, 'DELETE');
