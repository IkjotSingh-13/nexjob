import { toggleSaveJob, isJobSaved } from './storage.js';

export function renderJobs(jobs, containerElement) {
  containerElement.innerHTML = '';

  if (jobs.length === 0) {
    containerElement.innerHTML = `<div class="no-results">No jobs found. Try adjusting your search.</div>`;
    return;
  }

  const jobsHTML = jobs.map(job => {
    const savedClass = isJobSaved(job.id) ? 'saved' : '';
    const saveIcon = isJobSaved(job.id) ? '★' : '☆';

    return `
      <article class="job-card glass-panel" data-id="${job.id}">
        <div class="job-card-header">
          <div>
            <h3 class="job-title">${job.title}</h3>
            <p class="job-company">${job.company}</p>
          </div>
          <button class="save-btn ${savedClass}" aria-label="Save Job" onclick="window.handleSave(${job.id})">
            <span class="icon">${saveIcon}</span>
          </button>
        </div>
        <div class="job-details">
          <span class="badge location"><i class="icon">📍</i> ${job.location}</span>
          <span class="badge type"><i class="icon">💼</i> ${job.type}</span>
          <span class="badge salary"><i class="icon">💰</i> ${job.salary}</span>
        </div>
        <p class="job-description">${job.description}</p>
        <div class="job-tags">
          ${job.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <div class="job-actions">
          <button class="btn primary-btn">Apply Now</button>
        </div>
      </article>
    `;
  }).join('');

  containerElement.innerHTML = jobsHTML;
}

export function filterJobs(jobs, searchTerm, typeFilter) {
  return jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || job.type.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });
}
