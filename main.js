import { fetchJobs } from './api.js';
import { renderJobs, filterJobs } from './ui.js';
import { toggleSaveJob } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const jobsContainer = document.getElementById('jobs-container');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');

  // Show loading state
  jobsContainer.innerHTML = '<div class="loader"></div>';

  // Fetch jobs
  let allJobs = await fetchJobs();

  // Initial render
  renderJobs(allJobs, jobsContainer);

  // Global save handler for inline onclick events
  window.handleSave = (jobId) => {
    toggleSaveJob(jobId);
    // Re-render to update the save icon state while keeping current filters
    const searchTerm = searchInput.value;
    const typeValue = typeFilter.value;
    const filteredJobs = filterJobs(allJobs, searchTerm, typeValue);
    renderJobs(filteredJobs, jobsContainer);
  };

  // Handle Search and Filter
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    const searchTerm = searchInput.value;
    const typeValue = typeFilter.value;
    
    const filteredJobs = filterJobs(allJobs, searchTerm, typeValue);
    renderJobs(filteredJobs, jobsContainer);
  });

  // Real-time filtering on input change
  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value;
    const typeValue = typeFilter.value;
    
    const filteredJobs = filterJobs(allJobs, searchTerm, typeValue);
    renderJobs(filteredJobs, jobsContainer);
  });

  typeFilter.addEventListener('change', () => {
    const searchTerm = searchInput.value;
    const typeValue = typeFilter.value;
    
    const filteredJobs = filterJobs(allJobs, searchTerm, typeValue);
    renderJobs(filteredJobs, jobsContainer);
  });
});
