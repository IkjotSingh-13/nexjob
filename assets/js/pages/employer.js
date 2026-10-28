/**
 * Employer dashboard.
 *
 * The other side of the same pipeline the seeker sees. Moving someone from
 * screening to interview here changes what shows on their dashboard, which
 * is the point of both sides sharing one store.
 */

import { $, $$, on, esc, escAttr, delegate, url } from '../core/dom.js';
import { load, invalidate, jobsAtCompany, companyById } from '../core/data.js';
import { money, relTime, dateShort, plural } from '../core/format.js';
import { initShell } from '../core/shell.js';
import {
  getPostings, updatePosting, removePosting, applicationsForJob,
  getApplications, setApplicationStage, STAGES, CLOSED_STAGE, stageLabel
} from '../core/store.js';
import { requireAuth } from '../core/auth.js';
import { toast } from '../core/toast.js';
import { stagePicker, stageTone } from '../components/pipeline.js';
import { payScale } from '../components/pay-scale.js';
import { icon } from '../components/icons.js';

initShell();

const user = requireAuth('employer');

const state = { jobs: [], domain: null, company: null, filter: 'all' };

/** Everything this employer's company has on the board, own postings first. */
const ourJobs = () => jobsAtCompany(state.jobs, state.company?.id)
  .map((job) => {
    const mine = getPostings().find((p) => p.id === job.id);
    return { ...job, mine: !!mine, status: mine?.status ?? 'open', views: mine?.views ?? null };
  })
  .sort((a, b) => (b.mine === true) - (a.mine === true) || (a.postedHoursAgo ?? 0) - (b.postedHoursAgo ?? 0));

const ourApplications = () => {
  const ids = ourJobs().map((j) => Number(j.id));
  return getApplications()
    .filter((a) => ids.includes(Number(a.jobId)))
    .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
};

/* --------------------------------------------------------------- Stats */

const renderStats = () => {
  const jobs = ourJobs();
  const applications = ourApplications();

  $('#emp-stats').innerHTML = [
    ['Postings', jobs.filter((j) => j.status === 'open').length, `${jobs.length} in total`],
    ['Applicants', applications.length, 'across every posting'],
    ['In interview', applications.filter((a) => a.stage === 'interview').length, 'right now'],
    ['Offers out', applications.filter((a) => a.stage === 'offer').length, 'awaiting a reply']
  ].map(([label, figure, note]) => `
    <div class="stat">
      <span class="tick">${esc(label)}</span>
      <span class="stat-figure">${esc(figure)}</span>
      <span class="tick" style="text-transform:none;letter-spacing:0">${esc(note)}</span>
    </div>`).join('');
};

/* ------------------------------------------------------------ Postings */

const applicantTable = (applications, { compact = false } = {}) => {
  if (!applications.length) {
    return '<p class="tick" style="padding:var(--s4) 0">No applicants yet.</p>';
  }

  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Applicant</th>
            ${compact ? '' : '<th scope="col">Role</th>'}
            <th scope="col">Applied</th>
            <th scope="col">Link</th>
            <th scope="col">Stage</th>
          </tr>
        </thead>
        <tbody>
          ${applications.map((application) => `
            <tr>
              <td>
                <div style="font-weight:600">${esc(application.name)}</div>
                <div class="tick" style="margin-top:2px">${esc(application.email)}</div>
              </td>
              ${compact ? '' : `<td>${esc(application.jobTitle)}</td>`}
              <td class="tick">${esc(dateShort(application.appliedAt))}</td>
              <td>
                ${application.link
                  ? `<a href="${escAttr(application.link)}" rel="noopener noreferrer" target="_blank">Open</a>`
                  : '<span class="tick">None</span>'}
              </td>
              <td>${stagePicker(application.id, application.stage)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

const renderPostings = () => {
  const jobs = ourJobs().filter((job) =>
    state.filter === 'all' || job.status === state.filter);

  $$('#posting-filter button').forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.status === state.filter)));

  $('#posting-list').innerHTML = jobs.length ? jobs.map((job) => {
    const applications = applicationsForJob(job.id);
    const live = applications.filter((a) => a.stage !== CLOSED_STAGE.id).length;

    return `
      <details class="acc" data-posting="${esc(job.id)}">
        <summary>
          <span style="display:flex;flex-direction:column;gap:4px;min-width:0;text-align:left">
            <span style="display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap">
              ${esc(job.title)}
              <span class="pill ${job.status === 'open' ? 'pill--ok' : 'pill--stop'} pill--dot">
                ${job.status === 'open' ? 'Open' : 'Closed'}
              </span>
              ${job.mine ? '' : '<span class="pill">Sample listing</span>'}
            </span>
            <span class="tick">
              ${esc(job.location)} · ${money(job.salaryMin)}–${money(job.salaryMax)} ·
              ${plural(applications.length, 'applicant')}${live !== applications.length ? ` (${live} live)` : ''}
            </span>
          </span>
        </summary>

        <div class="acc-body">
          <div class="posting-figures" style="margin-bottom:var(--s5);flex-wrap:wrap;gap:var(--s6)">
            <div class="posting-figure">
              <span class="tick">Applicants</span>
              <span class="posting-figure-value">${applications.length}</span>
            </div>
            <div class="posting-figure">
              <span class="tick">Interviewing</span>
              <span class="posting-figure-value">${applications.filter((a) => a.stage === 'interview').length}</span>
            </div>
            <div class="posting-figure">
              <span class="tick">Posted</span>
              <span class="posting-figure-value" style="font-size:var(--t-sm)">${esc(relTime(job.postedAt))}</span>
            </div>
          </div>

          <div style="max-width:420px;margin-bottom:var(--s5)">
            <div class="row row--split" style="margin-bottom:5px">
              <span class="tick">Band on the board's scale</span>
              <span class="figure" style="font-size:var(--t-xs)">${money(job.salaryMin)} – ${money(job.salaryMax)}</span>
            </div>
            ${payScale(job.salaryMin, job.salaryMax, state.domain)}
          </div>

          ${applicantTable(applications, { compact: true })}

          <div class="row" style="margin-top:var(--s5);gap:var(--s2)">
            <a class="btn btn--outline btn--sm" href="${url('job.html', { id: job.id })}">View the listing</a>

            ${job.mine ? `
              <button type="button" class="btn btn--outline btn--sm" data-toggle-posting="${esc(job.id)}">
                ${job.status === 'open' ? 'Close this role' : 'Reopen this role'}
              </button>
              <button type="button" class="btn btn--danger btn--sm" data-delete-posting="${esc(job.id)}">
                ${icon('trash', 14)}Delete
              </button>` : ''}
          </div>
        </div>
      </details>`;
  }).join('') : `
    <div class="empty">
      <h3>${state.filter === 'all' ? 'Nothing posted yet' : `No ${state.filter} postings`}</h3>
      <p>Post a role with a real salary band and it appears on the board straight away.</p>
      <a class="btn btn--primary" href="./post-job.html">Post a role</a>
    </div>`;
};

const renderApplicants = () => {
  $('#applicant-table').innerHTML = applicantTable(ourApplications());
};

/* -------------------------------------------------------------- Events */

delegate(document, 'click', '[data-status]', (event, button) => {
  state.filter = button.dataset.status;
  renderPostings();
});

delegate(document, 'change', '[data-stage-for]', (event, select) => {
  const application = setApplicationStage(select.dataset.stageFor, select.value);

  renderStats();
  renderApplicants();
  toast(`Moved to ${stageLabel(application.stage).toLowerCase()}`, 'ok');
});

delegate(document, 'click', '[data-toggle-posting]', (event, button) => {
  const id = Number(button.dataset.togglePosting);
  const posting = getPostings().find((p) => p.id === id);

  updatePosting(id, { status: posting.status === 'open' ? 'closed' : 'open' });
  invalidate();
  toast(posting.status === 'open' ? 'Role closed' : 'Role reopened');
  boot();
});

delegate(document, 'click', '[data-delete-posting]', (event, button) => {
  const id = Number(button.dataset.deletePosting);
  const posting = getPostings().find((p) => p.id === id);
  const applications = applicationsForJob(id);

  const message = applications.length
    ? `Delete “${posting.title}”? ${plural(applications.length, 'application')} will stay on the applicants' dashboards but the listing goes for good.`
    : `Delete “${posting.title}”? This cannot be undone.`;

  if (!window.confirm(message)) return;

  removePosting(id);
  invalidate();
  toast('Posting deleted');
  boot();
});

/* ---------------------------------------------------------------- Boot */

async function boot() {
  if (!user) return;

  const { jobs, companies, domain } = await load();
  state.jobs = jobs;
  state.domain = domain;
  state.company = companyById(companies, user.companyId);

  if (!state.company) {
    $('#emp-head').innerHTML = `
      <p class="tick tick--flag">Employer dashboard</p>
      <h1 style="margin-top:var(--s3)">No company on this account</h1>`;
    $('#posting-list').innerHTML = `
      <div class="empty">
        <h3>This account is not linked to a company</h3>
        <p>Create an employer account and pick a company, and your postings will appear here.</p>
        <a class="btn btn--primary" href="./auth.html?tab=register&role=employer">Create an employer account</a>
      </div>`;
    return;
  }

  document.title = `${state.company.name} — Employer dashboard — Nexjob`;

  $('#emp-head').innerHTML = `
    <p class="tick tick--flag">Employer dashboard</p>
    <div class="row" style="gap:var(--s3);margin-top:var(--s3)">
      <span class="mark" aria-hidden="true"
            style="background:${escAttr(state.company.brandBg)};color:${escAttr(state.company.brandFg)}">${esc(state.company.initial)}</span>
      <h1>${esc(state.company.name)}</h1>
    </div>
    <p style="margin-top:var(--s3);color:var(--ink-2)">
      Signed in as ${esc(user.name)}.
    </p>`;

  $('#emp-company-link').href = url('company.html', { id: state.company.id });

  renderStats();
  renderPostings();
  renderApplicants();
}

boot().catch((error) => {
  console.error(error);
  $('#posting-list').innerHTML = `
    <div class="empty">
      <h3>The dashboard did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
