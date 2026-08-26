/**
 * Post a role.
 *
 * Three steps with a live preview, and a required salary band. Asking for
 * the band up front is the whole product argument: a listing that cannot be
 * drawn on the scale is a listing people scroll past.
 */

import { $, $$, on, esc, escAttr } from '../core/dom.js';
import { load, invalidate, facets, companyById } from '../core/data.js';
import { money } from '../core/format.js';
import { initShell } from '../core/shell.js';
import { addPosting } from '../core/store.js';
import { requireAuth } from '../core/auth.js';
import { toast } from '../core/toast.js';
import { jobCard } from '../components/job-card.js';
import { payScale, payAxis } from '../components/pay-scale.js';

initShell();

const user = requireAuth('employer');

const STEPS = ['The role', 'Pay and detail', 'Review'];

const state = { step: 1, domain: null, company: null };

/* ------------------------------------------------------------- Reading */

const lines = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean);

const draft = () => ({
  id: 'preview',
  title: $('#j-title').value.trim() || 'Untitled role',
  companyId: state.company?.id ?? '',
  companyName: state.company?.name ?? 'Your company',
  company: state.company,
  discipline: $('#j-discipline').value,
  level: $('#j-level').value,
  type: $('#j-type').value,
  location: $('#j-location').value.trim() || 'Location not set',
  remote: $('#j-remote').checked,
  salaryMin: Number($('#j-min').value) || 0,
  salaryMax: Number($('#j-max').value) || 0,
  summary: $('#j-summary').value.trim() || 'No summary yet.',
  tags: $('#j-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
  responsibilities: lines($('#j-resp').value),
  requirements: lines($('#j-req').value),
  featured: false,
  postedHoursAgo: 0,
  postedAt: new Date()
});

/* ------------------------------------------------------------ Painting */

const paintSteps = () => {
  $('#wizard-steps').innerHTML = STEPS.map((label, i) => {
    const n = i + 1;
    const cls = n < state.step ? 'is-done' : n === state.step ? 'is-now' : '';
    return `
      <div class="wizard-step ${cls}">
        <span class="wizard-step-bar"></span>
        <span class="tick">${String(n).padStart(2, '0')} ${esc(label)}</span>
      </div>`;
  }).join('');

  $$('#post-form fieldset').forEach((set) => {
    set.hidden = Number(set.dataset.step) !== state.step;
  });

  $('#wiz-back').hidden = state.step === 1;
  $('#wiz-next').hidden = state.step === STEPS.length;
  $('#wiz-publish').hidden = state.step !== STEPS.length;
};

const paintPreview = () => {
  const job = draft();

  $('#preview').innerHTML = job.salaryMin && job.salaryMax
    ? jobCard(job, { domain: state.domain })
    : `<div class="card" style="border-style:dashed">
         <p class="tick">Waiting on a salary band</p>
         <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s3)">
           Once you set a floor and a ceiling, the card appears here exactly as it will on
           the board.
         </p>
       </div>`;

  const preview = $('#band-preview');
  if (!preview) return;

  if (job.salaryMin && job.salaryMax && job.salaryMax >= job.salaryMin) {
    preview.innerHTML = `
      <div class="row row--split" style="margin-bottom:6px">
        <span class="tick">On the board's scale</span>
        <span class="figure" style="font-size:var(--t-xs)">${money(job.salaryMin)} – ${money(job.salaryMax)}</span>
      </div>
      ${payScale(job.salaryMin, job.salaryMax, state.domain, { size: 'lg' })}
      ${payAxis(state.domain)}`;
  } else {
    preview.innerHTML = '<p class="field-note">Set both ends of the band to see it on the scale.</p>';
  }
};

const paintReview = () => {
  const job = draft();

  $('#review').innerHTML = `
    <div class="card stack">
      <h2 style="font-size:var(--t-lg)">Check it over</h2>

      <dl class="co-facts" style="grid-template-columns:repeat(2,1fr)">
        <div class="co-fact"><dt class="tick">Title</dt><dd class="co-fact-value">${esc(job.title)}</dd></div>
        <div class="co-fact"><dt class="tick">Company</dt><dd class="co-fact-value">${esc(job.companyName)}</dd></div>
        <div class="co-fact"><dt class="tick">Discipline</dt><dd class="co-fact-value">${esc(job.discipline)}</dd></div>
        <div class="co-fact"><dt class="tick">Level</dt><dd class="co-fact-value">${esc(job.level)}</dd></div>
        <div class="co-fact"><dt class="tick">Contract</dt><dd class="co-fact-value">${esc(job.type)}</dd></div>
        <div class="co-fact"><dt class="tick">Location</dt><dd class="co-fact-value">${esc(job.location)}${job.remote ? ' · remote' : ''}</dd></div>
        <div class="co-fact"><dt class="tick">Band</dt><dd class="co-fact-value">${money(job.salaryMin)} – ${money(job.salaryMax)}</dd></div>
        <div class="co-fact"><dt class="tick">Skills</dt><dd class="co-fact-value">${job.tags.length || 'none'}</dd></div>
      </dl>

      <div>
        <p class="tick" style="margin-bottom:var(--s2)">Summary</p>
        <p style="font-size:var(--t-sm);color:var(--ink-2)">${esc(job.summary)}</p>
      </div>

      ${job.responsibilities.length ? `
        <div>
          <p class="tick" style="margin-bottom:var(--s3)">What they will do</p>
          <ul class="bullets">${job.responsibilities.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>` : ''}

      ${job.requirements.length ? `
        <div>
          <p class="tick" style="margin-bottom:var(--s3)">What you are looking for</p>
          <ul class="bullets">${job.requirements.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>` : ''}
    </div>`;
};

/* ---------------------------------------------------------- Validation */

const fail = (message, focus) => {
  const box = $('#post-error');
  box.textContent = message;
  box.hidden = false;
  focus?.focus();
  return false;
};

const validate = (step) => {
  $('#post-error').hidden = true;

  if (step === 1) {
    if (!$('#j-title').value.trim()) return fail('Give the role a title.', $('#j-title'));
    if (!$('#j-location').value.trim()) return fail('Say where the role is based.', $('#j-location'));
  }

  if (step === 2) {
    const min = Number($('#j-min').value);
    const max = Number($('#j-max').value);

    if (!min || !max) return fail('Both ends of the salary band are required.', $('#j-min'));
    if (max < min) return fail('The ceiling has to be at or above the floor.', $('#j-max'));
    if (!$('#j-summary').value.trim()) return fail('Write a one-line summary.', $('#j-summary'));
  }

  return true;
};

/* -------------------------------------------------------------- Events */

on($('#wiz-next'), 'click', () => {
  if (!validate(state.step)) return;

  state.step = Math.min(STEPS.length, state.step + 1);
  if (state.step === STEPS.length) paintReview();
  paintSteps();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

on($('#wiz-back'), 'click', () => {
  state.step = Math.max(1, state.step - 1);
  paintSteps();
});

on($('#post-form'), 'input', paintPreview);
on($('#post-form'), 'change', paintPreview);

on($('#post-form'), 'submit', (event) => {
  event.preventDefault();

  if (!validate(1) || !validate(2)) {
    state.step = validate(1) ? 2 : 1;
    paintSteps();
    return;
  }

  const job = draft();
  delete job.id;
  delete job.company;
  delete job.postedAt;

  const posted = addPosting({ ...job, postedBy: user.id });

  invalidate();
  toast('Role published', 'ok');
  location.href = `./job.html?id=${posted.id}`;
});

/* ---------------------------------------------------------------- Boot */

load().then(({ jobs, companies, domain }) => {
  if (!user) return;

  state.domain = domain;
  state.company = companyById(companies, user.companyId) || {
    id: user.companyId || 'unknown',
    name: 'Your company',
    initial: '?',
    brandBg: '#2B36C4',
    brandFg: '#FFFFFF'
  };

  $('#j-discipline').innerHTML = facets(jobs).disciplines
    .map((d) => `<option>${esc(d)}</option>`).join('');

  paintSteps();
  paintPreview();
}).catch((error) => {
  console.error(error);
  $('#preview').innerHTML = `
    <div class="card">
      <p class="tick">Preview unavailable</p>
      <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s3)">
        The board data did not load, so the scale cannot be drawn. Serve the folder over
        HTTP and reload.
      </p>
    </div>`;
});
