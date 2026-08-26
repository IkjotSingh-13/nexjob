/**
 * A single role.
 *
 * The pay band gets the full treatment here: a tall scale, a labelled axis,
 * and the role's midpoint measured against the midpoint of the whole board.
 * That comparison is the reason to have a shared domain at all.
 */

import { $, on, esc, escAttr, delegate, query, url } from '../core/dom.js';
import { load, jobById, jobsAtCompany, prepFor } from '../core/data.js';
import { relTime, dateShort, median } from '../core/format.js';
import { initShell, refreshCounts } from '../core/shell.js';
import {
  toggleSaved, isSaved, pushRecent, hasApplied, addApplication,
  applicationsFor, STAGES, stageIndex, stageLabel, getProfile
} from '../core/store.js';
import { currentUser } from '../core/auth.js';
import { toast } from '../core/toast.js';
import { payScaleFull } from '../components/pay-scale.js';
import { jobCardMini } from '../components/job-card.js';
import { bookmarkIcon, icon } from '../components/icons.js';
import { pipeline } from '../components/pipeline.js';

initShell();

const user = currentUser();

const notFound = () => {
  $('#job-main').innerHTML = `
    <div class="empty">
      <h3>That role is not on the board</h3>
      <p>It may have been closed, or the link may be wrong. The rest of the board is
         still open.</p>
      <a class="btn btn--primary" href="./jobs.html">Browse open roles</a>
    </div>`;
  $('#job-rail').innerHTML = '';
};

/* ------------------------------------------------------------- Apply */

const applyPanel = (job) => {
  if (!user) {
    return `
      <div class="card">
        <h2 style="font-size:var(--t-lg)">Apply for this role</h2>
        <p style="font-size:var(--t-sm);color:var(--ink-2);margin:var(--s3) 0 var(--s5)">
          Sign in first so your application lands on your pipeline and you can follow
          what happens to it.
        </p>
        <a class="btn btn--primary" href="./auth.html?next=${encodeURIComponent(`job.html?id=${job.id}`)}">
          Sign in to apply
        </a>
      </div>`;
  }

  const existing = applicationsFor(user.id).find((a) => Number(a.jobId) === Number(job.id));

  if (existing) {
    const index = stageIndex(existing.stage);

    return `
      <div class="card">
        <div class="row row--split" style="margin-bottom:var(--s5)">
          <h2 style="font-size:var(--t-lg)">Your application</h2>
          <span class="pill ${existing.stage === 'closed' ? 'pill--stop' : 'pill--flag'} pill--dot">
            ${esc(stageLabel(existing.stage))}
          </span>
        </div>

        ${pipeline(existing.stage)}

        <p class="tick" style="margin-top:var(--s5);text-transform:none;letter-spacing:0;color:var(--ink-2)">
          Sent ${esc(relTime(new Date(existing.appliedAt)))} · ${esc(dateShort(existing.appliedAt))}
          ${index > 0 ? ` · moved to ${esc(stageLabel(existing.stage)).toLowerCase()} since` : ''}
        </p>

        <div class="row" style="margin-top:var(--s5)">
          <a class="btn btn--outline btn--sm" href="./dashboard.html#applications">Open your pipeline</a>
        </div>
      </div>`;
  }

  const profile = getProfile(user.id);

  return `
    <div class="card" id="apply-card">
      <h2 style="font-size:var(--t-lg)">Apply for this role</h2>
      <p style="font-size:var(--t-sm);color:var(--ink-2);margin:var(--s3) 0 var(--s5)">
        Applying adds this role to your pipeline so you can follow it from here.
      </p>

      <form class="stack" id="apply-form">
        <div class="grid-2">
          <div class="field">
            <label for="apply-name">Full name</label>
            <input class="input" type="text" id="apply-name" required value="${escAttr(user.name)}"
                   autocomplete="name">
          </div>

          <div class="field">
            <label for="apply-email">Email address</label>
            <input class="input" type="email" id="apply-email" required value="${escAttr(user.email)}"
                   autocomplete="email">
          </div>
        </div>

        <div class="field">
          <label for="apply-link">Portfolio, CV or GitHub</label>
          <input class="input" type="url" id="apply-link" placeholder="https://"
                 value="${escAttr(profile.links.github || profile.links.website || '')}">
        </div>

        <div class="field">
          <label for="apply-note">Why this role</label>
          <textarea class="textarea" id="apply-note" rows="4"
                    placeholder="A few lines on why you want it and what you would bring."></textarea>
          <span class="field-note">Optional, but the ones that get read are the ones that answer this.</span>
        </div>

        <div class="row row--end">
          <button type="submit" class="btn btn--primary">Send application</button>
        </div>
      </form>
    </div>`;
};

/* ------------------------------------------------------------- Render */

const boot = async () => {
  const { jobs, companies, prep, domain } = await load();
  const id = query().id;
  const job = jobById(jobs, id);

  if (!job) return notFound();

  pushRecent(job.id);
  document.title = `${job.title} at ${job.companyName} — Nexjob`;

  const saved = isSaved(job.id);
  const boardMedian = median(jobs.map((j) => j.salaryMid));
  const company = job.company;
  const route = prepFor(prep, job.companyId);

  $('#job-main').innerHTML = `
    <div class="card">
      <div class="job-hero">
        <span class="mark mark--lg" aria-hidden="true"
              style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>

        <div class="job-hero-titles">
          <h1>${esc(job.title)}</h1>
          <p style="margin-top:var(--s2);color:var(--ink-2)">
            <a href="${url('company.html', { id: company.id })}">${esc(company.name)}</a>
            · ${esc(job.location)} · ${esc(job.type)}
          </p>

          <div class="job-meta">
            ${job.featured ? '<span class="pill pill--blue">Featured</span>' : ''}
            <span class="pill">${esc(job.level)}</span>
            <span class="pill">${esc(job.discipline)}</span>
            ${job.remote ? '<span class="pill pill--ok">Remote</span>' : ''}
            <span class="pill">Posted ${esc(relTime(job.postedAt))}</span>
          </div>
        </div>

        <div class="row row--tight" style="margin-left:auto">
          <button type="button" class="btn btn--outline btn--sm" data-save="${esc(job.id)}"
                  aria-pressed="${saved}">
            ${bookmarkIcon(saved)}<span data-save-text>${saved ? 'Saved' : 'Save'}</span>
          </button>
          <button type="button" class="btn btn--outline btn--sm" data-share>
            ${icon('share', 15)}Share
          </button>
        </div>
      </div>

      <div style="margin-top:var(--s7)">
        ${payScaleFull(job, domain, boardMedian)}
      </div>
    </div>

    <div class="card" style="margin-top:var(--s4)">
      <div class="detail-block">
        <h2>About the role</h2>
        <p style="color:var(--ink-2);font-size:var(--t-sm);line-height:1.6">${esc(job.summary)}</p>
      </div>

      <div class="detail-block">
        <h2>What you will do</h2>
        <ul class="bullets">
          ${(job.responsibilities || []).map((item) => `<li>${esc(item)}</li>`).join('')}
        </ul>
      </div>

      <div class="detail-block">
        <h2>What they are looking for</h2>
        <ul class="bullets">
          ${(job.requirements || []).map((item) => `<li>${esc(item)}</li>`).join('')}
        </ul>
      </div>

      ${(company.perks || []).length ? `
        <div class="detail-block">
          <h2>What ${esc(company.name)} offers</h2>
          <ul class="bullets">
            ${company.perks.map((item) => `<li>${esc(item)}</li>`).join('')}
          </ul>
        </div>` : ''}

      <div class="detail-block">
        <h2>Skills named in this posting</h2>
        <div class="job-tags">
          ${(job.tags || []).map((tag) => `
            <a class="tag" href="${url('jobs.html', { q: tag })}"
               style="text-decoration:none">${esc(tag)}</a>`).join('')}
        </div>
      </div>
    </div>

    <div style="margin-top:var(--s4)">${applyPanel(job)}</div>`;

  /* ----------------------------------------------------------- Rail */

  const similar = jobs
    .filter((j) => j.id !== job.id && (j.discipline === job.discipline || j.companyId === job.companyId))
    .sort((a, b) => Math.abs(a.salaryMid - job.salaryMid) - Math.abs(b.salaryMid - job.salaryMid))
    .slice(0, 4);

  const openHere = jobsAtCompany(jobs, company.id).length;

  $('#job-rail').innerHTML = `
    <div class="rail-sticky stack">
      <div class="card">
        <div class="row" style="gap:var(--s3)">
          <span class="mark" aria-hidden="true"
                style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>
          <div style="min-width:0">
            <p style="font-weight:600">${esc(company.name)}</p>
            <p class="tick">${esc(company.industry)}</p>
          </div>
        </div>

        <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s4)">${esc(company.tagline || '')}</p>

        <dl class="co-facts" style="margin-top:var(--s5);grid-template-columns:repeat(2,1fr)">
          <div class="co-fact"><dt class="tick">Size</dt><dd class="co-fact-value">${esc(company.size)}</dd></div>
          <div class="co-fact"><dt class="tick">Base</dt><dd class="co-fact-value">${esc(company.hq)}</dd></div>
        </dl>

        <div class="stack-2" style="margin-top:var(--s5)">
          <a class="btn btn--outline btn--block btn--sm" href="${url('company.html', { id: company.id })}">
            ${openHere} open ${openHere === 1 ? 'role' : 'roles'} at ${esc(company.name)}
          </a>
          ${route ? `
            <a class="btn btn--outline btn--block btn--sm" href="${url('prep.html', { company: company.id })}">
              How to get in
            </a>` : ''}
        </div>
      </div>

      ${route ? `
        <div class="card">
          <p class="tick">Hiring bar</p>
          <div class="row row--split" style="margin:var(--s2) 0 5px">
            <span style="font-size:var(--t-sm);color:var(--ink-2)">${esc(route.loopWeeks)} weeks, ${route.stages.length} stages</span>
            <span class="figure" style="font-size:var(--t-xs)">${route.bar}/100</span>
          </div>
          <div class="meter"><div class="meter-fill" style="--v:${route.bar}%"></div></div>
          <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s4)">
            ${esc(route.focus[0].topic)} carries the most weight in this loop.
          </p>
        </div>` : ''}

      ${similar.length ? `
        <div>
          <p class="tick" style="margin-bottom:var(--s3)">Similar pay, similar work</p>
          <div class="stack-2">${similar.map(jobCardMini).join('')}</div>
        </div>` : ''}
    </div>`;

  refreshCounts();
};

/* ------------------------------------------------------------ Events */

delegate(document, 'click', '[data-save]', (event, button) => {
  const { saved } = toggleSaved(button.dataset.save);
  button.setAttribute('aria-pressed', String(saved));
  button.innerHTML = `${bookmarkIcon(saved)}<span data-save-text>${saved ? 'Saved' : 'Save'}</span>`;
  refreshCounts();
  toast(saved ? 'Role saved' : 'Role removed from saved', saved ? 'ok' : 'info');
});

delegate(document, 'click', '[data-share]', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link copied', 'ok');
  } catch {
    toast('Copy the address bar to share this role');
  }
});

delegate(document, 'submit', '#apply-form', async (event) => {
  event.preventDefault();

  const { jobs } = await load();
  const job = jobById(jobs, query().id);
  if (!job || !user) return;

  if (hasApplied(job.id, user.id)) {
    toast('You have already applied for this role');
    return;
  }

  addApplication({
    jobId: job.id,
    userId: user.id,
    jobTitle: job.title,
    companyId: job.companyId,
    companyName: job.companyName,
    name: $('#apply-name').value.trim(),
    email: $('#apply-email').value.trim(),
    link: $('#apply-link').value.trim(),
    note: $('#apply-note').value.trim()
  });

  toast('Application sent', 'ok');
  refreshCounts();

  $('#apply-card').outerHTML = applyPanel(job);
});

boot().catch((error) => {
  console.error(error);
  notFound();
});
