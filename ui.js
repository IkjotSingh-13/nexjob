/**
 * UI Rendering and DOM manipulation module for NexJob
 */
import { isJobSaved } from './storage.js';

/**
 * Renders list of jobs into the designated container
 * @param {Array} jobs 
 * @param {HTMLElement} containerElement 
 * @param {Object} options
 */
export const renderJobs = (jobs, containerElement, options = {}) => {
  if (!containerElement) return;
  containerElement.innerHTML = '';

  if (!jobs || jobs.length === 0) {
    containerElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No matching roles found</h3>
        <p>Try searching for different keywords, clearing your filters, or check back later.</p>
        <button type="button" class="btn outline-btn" id="reset-filters-btn">Clear all filters</button>
      </div>
    `;
    return;
  }

  const jobsHTML = jobs.map((job) => {
    const saved = isJobSaved(job.id);
    const savedClass = saved ? 'is-saved' : '';
    const bookmarkSvg = saved 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

    return `
      <article class="job-card" data-id="${job.id}" tabindex="0" role="region" aria-label="${job.title} at ${job.company}">
        <div class="job-card-top">
          <div class="job-company-badge" style="background-color: ${job.companyBg || 'var(--accent-primary)'}; color: ${job.companyColor || '#ffffff'};">
            ${job.companyInitial || job.company.charAt(0)}
          </div>
          
          <div class="job-main-info">
            <h3 class="job-title">${job.title}</h3>
            <div class="job-meta-line">
              <span class="job-company-name">${job.company}</span>
              <span class="meta-dot">•</span>
              <span class="job-location">${job.location}</span>
              <span class="meta-dot">•</span>
              <span class="job-type">${job.type}</span>
            </div>
          </div>

          <button 
            type="button" 
            class="save-btn ${savedClass}" 
            data-job-id="${job.id}"
            aria-label="${saved ? 'Remove from saved jobs' : 'Save this job'}"
            title="${saved ? 'Saved' : 'Save job'}"
          >
            ${bookmarkSvg}
          </button>
        </div>

        <div class="job-card-middle">
          <p class="job-description">${job.description}</p>
        </div>

        <div class="job-card-bottom">
          <div class="job-tags" aria-label="Skills and tags">
            ${job.tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join('')}
          </div>
          
          <div class="job-footer-meta">
            <span class="job-salary-badge">${job.salary}</span>
            <span class="job-posted-time">${job.postedTime || 'Just now'}</span>
          </div>
        </div>

        <div class="job-card-actions">
          <button type="button" class="btn outline-btn view-details-btn" data-job-id="${job.id}">View Details</button>
          <button type="button" class="btn primary-btn apply-fast-btn" data-job-id="${job.id}">Apply &rarr;</button>
        </div>
      </article>
    `;
  }).join('');

  containerElement.innerHTML = jobsHTML;
};

/**
 * Multi-factor filter function for jobs
 * @param {Array} jobs 
 * @param {Object} filters
 * @returns {Array}
 */
export const filterJobs = (jobs, { keyword = '', location = '', discipline = 'all', savedOnly = false } = {}) => {
  const normKeyword = keyword.trim().toLowerCase();
  const normLocation = location.trim().toLowerCase();
  const normDiscipline = discipline.toLowerCase();

  return jobs.filter((job) => {
    // 1. Keyword search (matches title, company, description, or tags)
    const matchesKeyword = !normKeyword || (
      job.title.toLowerCase().includes(normKeyword) ||
      job.company.toLowerCase().includes(normKeyword) ||
      job.description.toLowerCase().includes(normKeyword) ||
      job.tags.some((tag) => tag.toLowerCase().includes(normKeyword))
    );

    // 2. Location search (matches location or 'remote')
    const matchesLocation = !normLocation || (
      job.location.toLowerCase().includes(normLocation) ||
      (normLocation === 'remote' && job.location.toLowerCase().includes('remote'))
    );

    // 3. Discipline category filter
    const matchesDiscipline = normDiscipline === 'all' || 
      (job.discipline && job.discipline.toLowerCase() === normDiscipline);

    // 4. Saved only filter
    const matchesSaved = !savedOnly || isJobSaved(job.id);

    return matchesKeyword && matchesLocation && matchesDiscipline && matchesSaved;
  });
};

/**
 * Toast Notification System
 * @param {string} message 
 * @param {'success' | 'info' | 'warning'} type 
 */
export const showToast = (message, type = 'info') => {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <span class="toast-dot"></span>
    <span class="toast-text">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger entrance animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove after 3.2 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3200);
};

/**
 * Render detail view inside modal
 * @param {Object} job 
 * @param {HTMLElement} modalContentElement 
 */
export const renderJobDetailModal = (job, modalContentElement) => {
  if (!modalContentElement || !job) return;

  const saved = isJobSaved(job.id);

  modalContentElement.innerHTML = `
    <div class="modal-header">
      <div class="modal-company-info">
        <div class="job-company-badge large" style="background-color: ${job.companyBg || 'var(--accent-primary)'}; color: ${job.companyColor || '#ffffff'};">
          ${job.companyInitial || job.company.charAt(0)}
        </div>
        <div>
          <h2 id="modal-job-title" class="modal-title">${job.title}</h2>
          <p class="modal-subtitle">${job.company} • ${job.location} • ${job.type}</p>
        </div>
      </div>
      <button type="button" class="modal-close-btn" id="close-modal-btn" aria-label="Close dialog">✕</button>
    </div>

    <div class="modal-body">
      <div class="modal-tags">
        <span class="modal-salary-pill">${job.salary}</span>
        <span class="modal-discipline-pill">${job.discipline || 'Engineering'}</span>
        ${job.tags.map((t) => `<span class="tag-pill">${t}</span>`).join('')}
      </div>

      <div class="modal-section">
        <h4>About the Role</h4>
        <p>${job.description}</p>
      </div>

      ${job.requirements && job.requirements.length > 0 ? `
        <div class="modal-section">
          <h4>Requirements & Qualifications</h4>
          <ul class="modal-requirements-list">
            ${job.requirements.map((req) => `<li>${req}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <form id="application-form" class="application-form">
        <h4>Apply for this position</h4>
        <div class="form-group">
          <label for="applicant-name">Full Name</label>
          <input type="text" id="applicant-name" required placeholder="Jane Doe">
        </div>
        <div class="form-group">
          <label for="applicant-email">Email Address</label>
          <input type="email" id="applicant-email" required placeholder="jane@example.com">
        </div>
        <div class="form-group">
          <label for="applicant-portfolio">Portfolio / GitHub / LinkedIn URL</label>
          <input type="url" id="applicant-portfolio" placeholder="https://github.com/janedoe">
        </div>
        <div class="form-group">
          <label for="applicant-note">Brief note or cover letter</label>
          <textarea id="applicant-note" rows="3" placeholder="Why you're excited about this role..."></textarea>
        </div>
        
        <div class="modal-footer-actions">
          <button type="button" class="btn outline-btn" id="modal-save-toggle-btn" data-job-id="${job.id}">
            ${saved ? '★ Bookmarked' : '☆ Save Role'}
          </button>
          <button type="submit" class="btn primary-btn submit-app-btn">Submit Application</button>
        </div>
      </form>
    </div>
  `;
};
