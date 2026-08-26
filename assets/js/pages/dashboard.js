/**
 * Job seeker dashboard.
 *
 * Four things a job hunt needs kept in one place: where each application
 * sits, what is worth applying to next, what you bookmarked, and what you
 * asked to be told about.
 */

import { $, $$, on, esc, escAttr, delegate, url } from '../core/dom.js';
import { load, recommend, filterJobs, sortJobs, facets } from '../core/data.js';
import { money, relTime, plural } from '../core/format.js';
import { initShell, refreshCounts } from '../core/shell.js';
import {
  applicationsFor, withdrawApplication, getSaved, toggleSaved, getRecent,
  getAlerts, addAlert, toggleAlert, removeAlert, getProfile, profileCompleteness,
  stageLabel, CLOSED_STAGE
} from '../core/store.js';
import { currentUser, requireAuth } from '../core/auth.js';
import { toast } from '../core/toast.js';
import { jobCard, jobCardMini } from '../components/job-card.js';
import { pipeline, stageTone } from '../components/pipeline.js';
import { payScale } from '../components/pay-scale.js';
import { bookmarkIcon, icon } from '../components/icons.js';

initShell();

/* An employer landing here wants their own dashboard, not a sign-in wall. */
if (currentUser()?.role === 'employer') location.replace('./employer.html');

const user = requireAuth('seeker');

const state = { jobs: [], domain: null };

/* ------------------------------------------------------- Applications */

const renderApplications = () => {
  const applications = applicationsFor(user.id);

  $('#app-list').innerHTML = applications.length ? applications.map((application) => {
    const job = state.jobs.find((j) => Number(j.id) === Number(application.jobId));
    const tone = stageTone(application.stage);

    return `
      <article class="app-row" data-application="${esc(application.id)}">
        <div>
          <div class="row row--tight" style="margin-bottom:var(--s2)">
            <span class="pill pill--${tone} pill--dot">${esc(stageLabel(application.stage))}</span>
            <span class="tick">Applied ${esc(relTime(new Date(application.appliedAt)))}</span>
          </div>

          <h3 style="font-size:var(--t-md)">
            ${job
              ? `<a href="${url('job.html', { id: job.id })}" style="color:var(--ink);text-decoration:none">${esc(application.jobTitle)}</a>`
              : esc(application.jobTitle)}
          </h3>
          <p class="tick" style="margin-top:3px">${esc(application.companyName)}</p>

          ${job ? `
            <div style="margin-top:var(--s4);max-width:340px">
              <div class="row row--split" style="margin-bottom:5px">
                <span class="figure" style="font-size:var(--t-xs)">${money(job.salaryMin)} – ${money(job.salaryMax)}</span>
                <span class="tick">${esc(job.location)}</span>
              </div>
              ${payScale(job.salaryMin, job.salaryMax, state.domain)}
            </div>` : ''}
        </div>

        <div class="app-row-track">
          ${pipeline(application.stage)}
          <div class="row row--end">
            <button type="button" class="btn btn--ghost btn--sm" data-withdraw="${esc(application.id)}">
              ${icon('trash', 14)}Withdraw
            </button>
          </div>
        </div>
      </article>`;
  }).join('') : `
    <div class="empty">
      <h3>Nothing in the pipeline yet</h3>
      <p>Applications you send show up here on a track, so you can see which ones are
         still moving and which have gone quiet.</p>
      <a class="btn btn--primary" href="./jobs.html">Find something to apply for</a>
    </div>`;
};

/* --------------------------------------------------------------- Saved */

const renderSaved = () => {
  const savedIds = getSaved();
  const saved = savedIds
    .map((id) => state.jobs.find((j) => Number(j.id) === id))
    .filter(Boolean);

  $('#saved-note').textContent = saved.length
    ? `${plural(saved.length, 'role')} bookmarked.`
    : 'Nothing saved yet.';

  $('#saved-list').innerHTML = saved.length
    ? saved.map((job, i) => jobCard(job, { index: i + 1, domain: state.domain })).join('')
    : `<div class="empty">
         <h3>No saved roles</h3>
         <p>The bookmark on any listing keeps it here, so you can come back to a
            shortlist rather than re-running the same search.</p>
         <a class="btn btn--outline" href="./jobs.html">Browse the board</a>
       </div>`;
};

/* -------------------------------------------------------------- Alerts */

const alertMatches = (alert) => filterJobs(state.jobs, {
  disciplines: alert.discipline === 'Any' ? [] : [alert.discipline],
  where: alert.location || ''
}).length;

const renderAlerts = () => {
  const alerts = getAlerts();

  $('#alert-count').textContent = alerts.length
    ? `${plural(alerts.length, 'alert')} saved in this browser.`
    : 'None yet.';

  $('#alert-list').innerHTML = alerts.length ? alerts.map((alert) => {
    const matches = alertMatches(alert);

    return `
      <div class="card" style="padding:var(--s4) var(--s5)">
        <div class="row row--split">
          <div style="min-width:0">
            <p style="font-weight:600;font-size:var(--t-sm)">
              ${esc(alert.discipline)}${alert.location ? ` · ${esc(alert.location)}` : ''}
            </p>
            <p class="tick" style="margin-top:3px">
              ${esc(alert.frequency)} · ${esc(alert.email)}
            </p>
          </div>

          <div class="row row--tight">
            <span class="pill ${alert.active ? 'pill--ok' : ''} pill--dot">${alert.active ? 'On' : 'Paused'}</span>
            <button type="button" class="ibtn" data-toggle-alert="${esc(alert.id)}"
                    aria-label="${alert.active ? 'Pause' : 'Resume'} this alert">
              ${icon(alert.active ? 'bell' : 'check', 15)}
            </button>
            <button type="button" class="ibtn" data-remove-alert="${esc(alert.id)}" aria-label="Delete this alert">
              ${icon('trash', 15)}
            </button>
          </div>
        </div>

        <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s3)">
          ${matches
            ? `${plural(matches, 'role')} on the board match this right now.
               <a href="${url('jobs.html', {
                 disciplines: alert.discipline === 'Any' ? '' : alert.discipline,
                 where: alert.location || ''
               })}">See them</a>.`
            : 'Nothing matches this on the board right now.'}
        </p>
      </div>`;
  }).join('') : `
    <div class="empty" style="padding:var(--s7) var(--s5)">
      <h3>No alerts yet</h3>
      <p>An alert remembers a search so you do not have to run it again.</p>
    </div>`;
};

/* ----------------------------------------------------- Recommendations */

const renderRecommended = () => {
  const profile = getProfile(user.id);
  const applied = applicationsFor(user.id).map((a) => Number(a.jobId));
  const pool = state.jobs.filter((j) => !applied.includes(Number(j.id)));
  const matches = recommend(pool, profile, 5);

  if (!profile.skills.length) {
    $('#rec-list').innerHTML = `
      <div class="empty">
        <h3>Tell us what you do</h3>
        <p>Add your skills, discipline and level, and this section scores every open role
           against them — showing why each one matched.</p>
        <a class="btn btn--primary" href="./profile.html">Fill in your profile</a>
      </div>`;
    return;
  }

  $('#rec-list').innerHTML = matches.length ? matches.map(({ job, score, reasons }) => `
    <a class="rec-row" href="${url('job.html', { id: job.id })}">
      <span class="rec-score">
        <span class="rec-score-figure">${score}</span>
        <span class="tick" style="display:block;margin-top:2px">match</span>
      </span>

      <span class="mark mark--sm" aria-hidden="true"
            style="background:${escAttr(job.company.brandBg)};color:${escAttr(job.company.brandFg)}">${esc(job.company.initial)}</span>

      <span style="min-width:0;flex:1">
        <span style="display:block;font-weight:600;font-size:var(--t-sm)">${esc(job.title)}</span>
        <span class="tick" style="display:block;margin-top:3px">
          ${esc(job.companyName)} · ${money(job.salaryMin)}–${money(job.salaryMax)} · ${esc(reasons.join(', '))}
        </span>
      </span>

      <span class="tick tick--blue not-narrow">View</span>
    </a>`).join('') : `
    <div class="empty">
      <h3>Nothing scored above zero</h3>
      <p>Your skills did not overlap with any open role. Try adding a few more, or widen
         the discipline on your profile.</p>
      <a class="btn btn--outline" href="./profile.html">Edit your profile</a>
    </div>`;
};

/* --------------------------------------------------------------- Stats */

const renderStats = () => {
  const applications = applicationsFor(user.id);
  const live = applications.filter((a) => a.stage !== CLOSED_STAGE.id).length;
  const profile = getProfile(user.id);

  $('#dash-stats').innerHTML = [
    ['Applications', applications.length, `${live} still moving`],
    ['Saved roles', getSaved().length, 'bookmarked'],
    ['Alerts', getAlerts().filter((a) => a.active).length, 'switched on'],
    ['Profile', `${profileCompleteness(profile)}%`, 'filled in']
  ].map(([label, figure, note]) => `
    <div class="stat">
      <span class="tick">${esc(label)}</span>
      <span class="stat-figure">${esc(figure)}</span>
      <span class="tick" style="text-transform:none;letter-spacing:0">${esc(note)}</span>
    </div>`).join('');
};

/* ---------------------------------------------------------------- Boot */

const boot = async () => {
  if (!user) return;

  const { jobs, domain } = await load();
  Object.assign(state, { jobs, domain });

  const profile = getProfile(user.id);
  const firstName = user.name.split(' ')[0];

  $('#dash-greeting').textContent = `Hello, ${firstName}`;
  $('#dash-sub').textContent = profile.headline
    || `${profile.level} ${profile.discipline} · profile ${profileCompleteness(profile)}% complete`;

  $('#alert-email').value = user.email;
  $('#alert-discipline').innerHTML = ['Any', ...facets(jobs).disciplines]
    .map((d) => `<option>${esc(d)}</option>`).join('');

  renderStats();
  renderApplications();
  renderRecommended();
  renderSaved();
  renderAlerts();

  /* Recently viewed */
  const recent = getRecent()
    .map((id) => jobs.find((j) => Number(j.id) === id))
    .filter(Boolean)
    .slice(0, 6);

  $('#recent-list').innerHTML = recent.length
    ? recent.map(jobCardMini).join('')
    : '<p class="tick" style="grid-column:1/-1">Nothing opened yet.</p>';

  /* Jump to a section if the address bar asked for one. */
  if (location.hash) $(location.hash)?.scrollIntoView({ behavior: 'smooth' });
};

/* -------------------------------------------------------------- Events */

on($('#alert-form'), 'submit', (event) => {
  event.preventDefault();

  addAlert({
    email: $('#alert-email').value.trim(),
    discipline: $('#alert-discipline').value,
    location: $('#alert-location').value.trim(),
    frequency: $('#alert-frequency').value,
    userId: user?.id
  });

  $('#alert-location').value = '';
  renderAlerts();
  renderStats();
  toast('Alert created', 'ok');
});

delegate(document, 'click', '[data-toggle-alert]', (event, button) => {
  toggleAlert(button.dataset.toggleAlert);
  renderAlerts();
  renderStats();
});

delegate(document, 'click', '[data-remove-alert]', (event, button) => {
  removeAlert(button.dataset.removeAlert);
  renderAlerts();
  renderStats();
  toast('Alert deleted');
});

delegate(document, 'click', '[data-withdraw]', (event, button) => {
  withdrawApplication(button.dataset.withdraw);
  renderApplications();
  renderRecommended();
  renderStats();
  refreshCounts();
  toast('Application withdrawn');
});

delegate(document, 'click', '[data-save]', (event, button) => {
  event.preventDefault();
  toggleSaved(button.dataset.save);
  renderSaved();
  renderStats();
  refreshCounts();
  toast('Saved roles updated');
});

boot().catch((error) => {
  console.error(error);
  $('#app-list').innerHTML = `
    <div class="empty">
      <h3>Your dashboard did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
