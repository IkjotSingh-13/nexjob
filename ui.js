/**
 * Rendering and DOM output.
 *
 * Every function here takes data and a target element and writes markup.
 * Nothing in this module reads application state or binds events —
 * that stays in main.js.
 */
import { isJobSaved } from './storage.js';

/** Escape text before it goes into innerHTML. */
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

const bookmarkIcon = (filled) => `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
  </svg>`;

/** A listing is "recent" when it was posted within the last day. */
const isRecent = (postedTime = '') => /\bh\b|hour|min|just now/i.test(postedTime);

const jobMarkup = (job) => {
  const saved = isJobSaved(job.id);
  const badge = esc(job.companyInitial || job.company.charAt(0));

  const flag = job.featured
    ? '<span class="job-flag job-flag--featured">Featured</span>'
    : isRecent(job.postedTime)
      ? `<span class="job-flag job-flag--recent">${esc(job.postedTime)}</span>`
      : '';

  return `
    <article class="job${job.featured ? ' is-featured' : ''}" data-id="${esc(job.id)}">
      <div class="job-top">
        <span class="job-badge" aria-hidden="true"
              style="background:${esc(job.companyBg || '#12503b')};color:${esc(job.companyColor || '#ffffff')}">${badge}</span>

        <div class="job-head">
          <h3 class="job-title">${esc(job.title)}</h3>
          <p class="job-org">${esc(job.company)}</p>
        </div>

        ${flag}

        <button type="button" class="job-save${saved ? ' is-saved' : ''}" data-save="${esc(job.id)}"
                aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${esc(job.title)} at ${esc(job.company)}">
          ${bookmarkIcon(saved)}
        </button>
      </div>

      <p class="job-blurb">${esc(job.description)}</p>

      <dl class="job-facts">
        <div class="fact fact--pay">
          <dt>Pay</dt>
          <dd>${esc(job.salary)}</dd>
        </div>
        <div class="fact fact--loc">
          <dt>Location</dt>
          <dd>${esc(job.location)}</dd>
        </div>
        <div class="fact fact--type">
          <dt>Type</dt>
          <dd>${esc(job.type)}</dd>
        </div>
      </dl>

      <div class="job-tags">
        ${(job.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}
      </div>

      <div class="job-actions">
        <button type="button" class="btn btn--outline btn--sm" data-open="${esc(job.id)}">Details</button>
      </div>
    </article>`;
};

/**
 * Write the listing set into its container.
 * @param {Array} jobs
 * @param {HTMLElement} target
 */
export const renderJobs = (jobs, target) => {
  if (!target) return;
  target.setAttribute('aria-busy', 'false');

  if (!jobs || jobs.length === 0) {
    target.innerHTML = `
      <div class="empty">
        <h3>No roles match those filters</h3>
        <p>Try a different keyword, widen the location, or switch back to all disciplines.</p>
        <button type="button" class="btn btn--outline" data-reset>Clear filters</button>
      </div>`;
    return;
  }

  target.innerHTML = jobs.map(jobMarkup).join('');
};

/**
 * Filter listings against the current query.
 * @param {Array} jobs
 * @param {{keyword?: string, location?: string, discipline?: string, savedOnly?: boolean}} query
 * @returns {Array}
 */
export const filterJobs = (jobs, { keyword = '', location = '', discipline = 'all', savedOnly = false } = {}) => {
  const kw = keyword.trim().toLowerCase();
  const loc = location.trim().toLowerCase();
  const disc = discipline.toLowerCase();

  return jobs.filter((job) => {
    const haystack = [job.title, job.company, job.description, ...(job.tags || [])]
      .join(' ')
      .toLowerCase();

    return (!kw || haystack.includes(kw))
      && (!loc || job.location.toLowerCase().includes(loc))
      && (disc === 'all' || (job.discipline || '').toLowerCase() === disc)
      && (!savedOnly || isJobSaved(job.id));
  });
};

/**
 * Figures for the summary bar, counted from the listings themselves
 * rather than written into the page by hand.
 * @param {Array} jobs
 */
export const summarise = (jobs) => {
  if (!jobs.length) return { roles: 0, companies: 0, remote: 0, medianFloor: '—' };

  const floors = jobs
    .map((job) => Number((job.salary.match(/\d+/) || [])[0]))
    .filter(Boolean)
    .sort((a, b) => a - b);

  const mid = Math.floor(floors.length / 2);
  const median = floors.length % 2 ? floors[mid] : Math.round((floors[mid - 1] + floors[mid]) / 2);

  return {
    roles: jobs.length,
    companies: new Set(jobs.map((job) => job.company)).size,
    remote: jobs.filter((job) => /remote/i.test(job.location)).length,
    medianFloor: floors.length ? `$${median}k` : '—'
  };
};

/**
 * Short-lived status message.
 * @param {string} message
 * @param {'info' | 'success' | 'warning'} tone
 */
export const showToast = (message, tone = 'info') => {
  const host = document.getElementById('toasts');
  if (!host) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  host.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-shown'));

  setTimeout(() => {
    toast.classList.remove('is-shown');
    setTimeout(() => toast.remove(), 220);
  }, 3000);
};

/**
 * Full role detail, including the application form.
 * @param {Object} job
 * @param {HTMLElement} target
 */
export const renderJobDetail = (job, target) => {
  if (!target || !job) return;
  const saved = isJobSaved(job.id);

  target.innerHTML = `
    <div class="sheet-head">
      <div style="display:flex;gap:13px;align-items:flex-start;min-width:0">
        <span class="job-badge job-badge--lg" aria-hidden="true"
              style="background:${esc(job.companyBg || '#12503b')};color:${esc(job.companyColor || '#ffffff')}">${esc(job.companyInitial || job.company.charAt(0))}</span>
        <div style="min-width:0">
          <h2 class="sheet-title">${esc(job.title)}</h2>
          <p class="sheet-sub">${esc(job.company)} · ${esc(job.location)} · ${esc(job.type)}</p>
        </div>
      </div>
      <button type="button" class="sheet-close" data-close="job-dialog" aria-label="Close">&times;</button>
    </div>

    <div class="sheet-body">
      <div class="detail-meta">
        <span class="meta-pill meta-pill--pay">${esc(job.salary)}</span>
        <span class="meta-pill">${esc(job.discipline || 'Engineering')}</span>
        ${(job.tags || []).map((tag) => `<span class="meta-pill">${esc(tag)}</span>`).join('')}
      </div>

      <div class="detail-section">
        <h4>About the role</h4>
        <p>${esc(job.description)}</p>
      </div>

      ${(job.requirements || []).length ? `
        <div class="detail-section">
          <h4>What they're looking for</h4>
          <ul class="req-list">
            ${job.requirements.map((req) => `<li>${esc(req)}</li>`).join('')}
          </ul>
        </div>` : ''}

      <div class="detail-section">
        <h4>Apply</h4>
        <form class="form-stack" id="apply-form" style="margin-top:12px">
          <div class="field">
            <label for="apply-name">Full name</label>
            <input type="text" id="apply-name" required placeholder="Alex Rivera" autocomplete="name">
          </div>

          <div class="field">
            <label for="apply-email">Email address</label>
            <input type="email" id="apply-email" required placeholder="you@example.com" autocomplete="email">
          </div>

          <div class="field">
            <label for="apply-link">Portfolio or GitHub</label>
            <input type="url" id="apply-link" placeholder="https://github.com/yourname">
          </div>

          <div class="field">
            <label for="apply-note">Anything else</label>
            <textarea id="apply-note" rows="3" placeholder="Optional — why this role interests you."></textarea>
          </div>

          <div class="sheet-foot">
            <button type="button" class="btn btn--outline" data-save="${esc(job.id)}" data-detail-save>
              ${saved ? 'Saved' : 'Save role'}
            </button>
            <button type="submit" class="btn btn--primary">Send application</button>
          </div>
        </form>
      </div>
    </div>`;
};
