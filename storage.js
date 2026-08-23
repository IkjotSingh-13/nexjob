export function getSavedJobs() {
  const saved = localStorage.getItem('savedJobs');
  return saved ? JSON.parse(saved) : [];
}

export function toggleSaveJob(jobId) {
  let savedJobs = getSavedJobs();
  if (savedJobs.includes(jobId)) {
    savedJobs = savedJobs.filter(id => id !== jobId);
  } else {
    savedJobs.push(jobId);
  }
  localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  return savedJobs;
}

export function isJobSaved(jobId) {
  const savedJobs = getSavedJobs();
  return savedJobs.includes(jobId);
}
