/**
 * The pay explorer.
 *
 * The scale at full volume. One grouping control, one set of rows, one
 * domain — and a field where you can drop your own number onto the same
 * ruler and read the percentile off it.
 */

import { $, $$, on, esc, delegate } from '../core/dom.js';
import { load } from '../core/data.js';
import { money, moneyFull, median, percentileOf, posOn, plural } from '../core/format.js';
import { initShell } from '../core/shell.js';
import { payScaleRow, payAxis, payScale } from '../components/pay-scale.js';

initShell();

const GROUPS = [
  { id: 'discipline', label: 'Discipline', of: (job) => job.discipline },
  { id: 'level',      label: 'Level',      of: (job) => job.level },
  { id: 'location',   label: 'Location',   of: (job) => (job.remote ? 'Remote' : job.location) },
  { id: 'company',    label: 'Company',    of: (job) => job.companyName },
  { id: 'type',       label: 'Contract',   of: (job) => job.type }
];

/* Level has a natural order; everything else sorts by pay. */
const LEVEL_ORDER = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

const state = { jobs: [], domain: null, group: 'discipline' };

const groupRows = () => {
  const group = GROUPS.find((g) => g.id === state.group);
  const buckets = new Map();

  state.jobs.forEach((job) => {
    const key = group.of(job);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(job);
  });

  const rows = [...buckets.entries()].map(([label, set]) => ({
    label,
    count: set.length,
    min: Math.min(...set.map((j) => j.salaryMin)),
    max: Math.max(...set.map((j) => j.salaryMax)),
    mid: median(set.map((j) => j.salaryMid))
  }));

  return state.group === 'level'
    ? rows.sort((a, b) => LEVEL_ORDER.indexOf(a.label) - LEVEL_ORDER.indexOf(b.label))
    : rows.sort((a, b) => b.mid - a.mid);
};

const renderRows = () => {
  const rows = groupRows();

  $('#pay-rows').innerHTML = rows.map((row) => payScaleRow(row, state.domain)).join('');
  $('#pay-rows-axis').innerHTML = payAxis(state.domain);

  $('#group-note').textContent = state.group === 'level'
    ? `${plural(rows.length, 'level')}, in order of seniority.`
    : `${plural(rows.length, 'group')}, sorted by midpoint.`;

  $$('#group-seg button').forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.group === state.group)));
};

/* --------------------------------------------------- Check your number */

const renderVerdict = (value) => {
  const mids = state.jobs.map((j) => j.salaryMid);
  const pct = percentileOf(value, mids);
  const above = state.jobs.filter((j) => j.salaryMid > value).length;
  const inBand = state.jobs.filter((j) => value >= j.salaryMin && value <= j.salaryMax);
  const boardMid = median(mids);

  const verdict = pct >= 75 ? 'near the top of this board'
    : pct >= 50 ? 'above the middle of this board'
    : pct >= 25 ? 'below the middle of this board'
    : 'at the lower end of this board';

  const result = $('#pay-result');
  result.hidden = false;
  result.innerHTML = `
    <div class="row row--split" style="align-items:baseline;margin-bottom:var(--s4)">
      <div>
        <p class="tick">Your number sits at</p>
        <p class="pay-verdict-figure">${pct}<span style="font-size:.45em">th pct</span></p>
      </div>
      <p style="font-size:var(--t-sm);color:var(--ink-2);max-width:38ch;text-align:right">
        ${moneyFull(value)} is ${verdict}.
      </p>
    </div>

    <div class="scale scale--xl" role="img"
         aria-label="${esc(`${moneyFull(value)} sits at the ${pct}th percentile of ${state.jobs.length} open roles`)}"
         style="--lo:0%;--hi:100%;--mark:${posOn(value, state.domain).toFixed(2)}%">
      <div class="scale-track"></div>
      <div class="scale-band scale--muted" style="background:var(--blue-line)"></div>
      <div class="scale-mark"></div>
    </div>
    ${payAxis(state.domain)}

    <dl class="co-facts" style="margin-top:var(--s6)">
      <div class="co-fact">
        <dt class="tick">Roles paying more</dt>
        <dd class="co-fact-value">${above} of ${state.jobs.length}</dd>
      </div>
      <div class="co-fact">
        <dt class="tick">Bands you fall inside</dt>
        <dd class="co-fact-value">${inBand.length}</dd>
      </div>
      <div class="co-fact">
        <dt class="tick">Board midpoint</dt>
        <dd class="co-fact-value">${money(boardMid)}</dd>
      </div>
      <div class="co-fact">
        <dt class="tick">Difference</dt>
        <dd class="co-fact-value" style="color:${value >= boardMid ? 'var(--ok)' : 'var(--warn)'}">
          ${value >= boardMid ? '+' : '−'}${money(Math.abs(value - boardMid))}
        </dd>
      </div>
    </dl>

    ${inBand.length ? `
      <p style="margin-top:var(--s5);font-size:var(--t-sm);color:var(--ink-2)">
        ${plural(inBand.length, 'open role')} advertise a band that includes your number.
        <a href="./jobs.html?payMin=${Math.max(state.domain.min, value - 10000)}">See them</a>.
      </p>` : ''}`;
};

/* ------------------------------------------------------------- Boot */

const boot = async () => {
  const { jobs, domain } = await load();
  Object.assign(state, { jobs, domain });

  const mids = jobs.map((j) => j.salaryMid);
  const sorted = [...mids].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];

  $('#pay-lede').textContent =
    `${plural(jobs.length, 'open role')}, ${money(domain.min)} to ${money(domain.max)}, all on one domain.`;

  $('#pay-stats').innerHTML = [
    ['Lowest floor', money(Math.min(...jobs.map((j) => j.salaryMin))), 'advertised'],
    ['25th percentile', money(p25), 'of midpoints'],
    ['Median midpoint', money(median(mids)), 'across the board'],
    ['75th percentile', money(p75), 'of midpoints']
  ].map(([label, figure, note]) => `
    <div class="stat">
      <span class="tick">${esc(label)}</span>
      <span class="stat-figure">${esc(figure)}</span>
      <span class="tick" style="text-transform:none;letter-spacing:0">${esc(note)}</span>
    </div>`).join('');

  $('#group-seg').innerHTML = GROUPS.map((group) => `
    <button type="button" data-group="${group.id}" aria-pressed="${group.id === state.group}">${group.label}</button>`).join('');

  renderRows();
};

delegate(document, 'click', '[data-group]', (event, button) => {
  state.group = button.dataset.group;
  renderRows();
});

on($('#pay-check'), 'submit', (event) => {
  event.preventDefault();
  const value = Number($('#pay-input').value);

  if (!Number.isFinite(value) || value <= 0) {
    $('#pay-result').hidden = true;
    $('#pay-input').focus();
    return;
  }

  renderVerdict(value);
});

boot().catch((error) => {
  console.error(error);
  $('#pay-rows').innerHTML = `
    <div class="empty">
      <h3>The pay data did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
