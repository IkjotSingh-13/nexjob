/**
 * The board.
 *
 * Filter state lives in the query string, so a filtered view is shareable
 * and the back button does what it should. The DOM is the single source of
 * truth for the rail; this module reads it, filters, and renders.
 */

import { $, $$, on, esc, delegate, query, setQuery, debounce, url } from '../core/dom.js';
import { load, filterJobs, sortJobs, facets, SORTS, EMPTY_CRITERIA } from '../core/data.js';
import { money, plural } from '../core/format.js';
import { initShell, refreshCounts } from '../core/shell.js';
import { toggleSaved, getSaved } from '../core/store.js';
import { toast } from '../core/toast.js';
import { jobCard, skeletons } from '../components/job-card.js';
import { filtersMarkup, readCriteria, wireFilters } from '../components/filters.js';
import { bookmarkIcon } from '../components/icons.js';

initShell();

const PER_PAGE = 8;

const state = {
  jobs: [],
  domain: { min: 0, max: 1 },
  criteria: { ...EMPTY_CRITERIA },
  sort: 'relevance',
  page: 1
};

/* ------------------------------------------------ Query string mapping */

const csv = (value) => (value ? String(value).split(',').filter(Boolean) : []);

const criteriaFromUrl = () => {
  const q = query();

  state.criteria = {
    ...EMPTY_CRITERIA,
    q: q.q || '',
    where: q.where || '',
    remote: q.remote === '1',
    savedOnly: q.saved === '1',
    disciplines: csv(q.disciplines),
    levels: csv(q.levels),
    types: csv(q.types),
    payMin: q.payMin ? Number(q.payMin) : null,
    payMax: q.payMax ? Number(q.payMax) : null,
    within: q.within ? Number(q.within) : null,
    companyId: q.company || ''
  };

  state.sort = SORTS.some((s) => s.id === q.sort) ? q.sort : 'relevance';
  state.page = Math.max(1, Number(q.page) || 1);
};

const urlFromState = (push = false) => {
  const c = state.criteria;

  setQuery({
    q: c.q,
    where: c.where,
    remote: c.remote ? '1' : '',
    saved: c.savedOnly ? '1' : '',
    disciplines: c.disciplines,
    levels: c.levels,
    types: c.types,
    payMin: c.payMin ?? '',
    payMax: c.payMax ?? '',
    within: c.within ?? '',
    company: c.companyId,
    sort: state.sort === 'relevance' ? '' : state.sort,
    page: state.page > 1 ? state.page : ''
  }, push);
};

/* ------------------------------------------------------------- Chips */

const activeChips = () => {
  const c = state.criteria;
  const chips = [];

  if (c.q) chips.push(['q', `“${c.q}”`]);
  if (c.where) chips.push(['where', c.where]);
  if (c.remote) chips.push(['remote', 'Remote only']);
  if (c.savedOnly) chips.push(['savedOnly', 'Saved only']);
  if (c.companyId) chips.push(['companyId', state.jobs.find((j) => j.companyId === c.companyId)?.companyName ?? c.companyId]);
  c.disciplines.forEach((d) => chips.push([`disciplines:${d}`, d]));
  c.levels.forEach((l) => chips.push([`levels:${l}`, l]));
  c.types.forEach((t) => chips.push([`types:${t}`, t]));
  if (c.payMin || c.payMax) {
    chips.push(['pay', `${money(c.payMin ?? state.domain.min)}–${money(c.payMax ?? state.domain.max)}`]);
  }
  if (c.within) chips.push(['within', c.within <= 24 ? 'Past day' : c.within <= 168 ? 'Past week' : 'Past month']);

  return chips;
};

/* ------------------------------------------------------------ Render */

const render = () => {
  const saved = getSaved();
  const matched = filterJobs(state.jobs, { ...state.criteria, savedIds: saved });
  const sorted = sortJobs(matched, state.sort);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  state.page = Math.min(state.page, pages);

  const start = (state.page - 1) * PER_PAGE;
  const slice = sorted.slice(start, start + PER_PAGE);

  /* Count */
  $('#result-count').innerHTML = sorted.length
    ? `<strong>${sorted.length}</strong> ${sorted.length === 1 ? 'role' : 'roles'}`
      + `${pages > 1 ? ` · page ${state.page} of ${pages}` : ''}`
    : 'No roles match those filters';

  /* Chips */
  const chips = activeChips();
  $('#active-chips').innerHTML = chips.length
    ? chips.map(([key, label]) => `
        <button type="button" class="chip" data-drop="${esc(key)}">
          ${esc(label)}<span class="chip-x" aria-hidden="true">×</span>
          <span class="visually-hidden">Remove filter</span>
        </button>`).join('')
      + '<button type="button" class="chip" data-clear-filters>Clear all</button>'
    : '';

  const count = $('[data-filter-count]');
  if (count) {
    count.textContent = String(chips.length);
    count.hidden = chips.length === 0;
  }

  /* Results */
  $('#results').innerHTML = slice.length
    ? slice.map((job, i) => jobCard(job, { index: start + i + 1, domain: state.domain })).join('')
    : `<div class="empty">
         <h3>No roles match those filters</h3>
         <p>Widen the pay range, clear a discipline, or search a different keyword.
            The board has ${plural(state.jobs.length, 'role')} in total.</p>
         <button type="button" class="btn btn--outline" data-clear-filters>Clear all filters</button>
       </div>`;

  /* Pager. The attribute is `data-goto` rather than `data-page` on purpose:
     the body already carries data-page for the shell, and a delegated
     [data-page] listener would match every click on the document. */
  $('#pager').innerHTML = pages > 1 ? [
    `<button type="button" data-goto="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}
             aria-label="Previous page">Prev</button>`,
    ...Array.from({ length: pages }, (_, i) => `
      <button type="button" data-goto="${i + 1}" aria-current="${i + 1 === state.page}"
              aria-label="Page ${i + 1}">${i + 1}</button>`),
    `<button type="button" data-goto="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}
             aria-label="Next page">Next</button>`
  ].join('') : '';

  urlFromState();
};

/* -------------------------------------------------------------- Boot */

const boot = async () => {
  $('#results').innerHTML = skeletons(5);
  criteriaFromUrl();

  const { jobs, domain } = await load();
  state.jobs = jobs;
  state.domain = domain;

  $('#board-lede').textContent =
    `${plural(jobs.length, 'role')} from ${money(domain.min)} to ${money(domain.max)}, every band on the same scale.`;

  $('#board-q').value = state.criteria.q;
  $('#board-where').value = state.criteria.where;

  $('#sort').innerHTML = SORTS.map((s) =>
    `<option value="${s.id}" ${s.id === state.sort ? 'selected' : ''}>${s.label}</option>`).join('');

  const rail = $('#filters');
  rail.innerHTML = filtersMarkup({ facets: facets(jobs), domain, criteria: state.criteria });

  wireFilters(rail, domain, debounce(() => {
    state.criteria = { ...state.criteria, ...readCriteria(rail, domain) };
    state.page = 1;
    render();
  }, 120));

  render();
};

/* ------------------------------------------------------------ Events */

on($('#board-search'), 'submit', (event) => {
  event.preventDefault();
  state.criteria.q = $('#board-q').value.trim();
  state.criteria.where = $('#board-where').value.trim();
  state.page = 1;
  render();
});

on($('#sort'), 'change', (event) => {
  state.sort = event.target.value;
  state.page = 1;
  render();
});

/* Scoped to the pager itself, not the document — see the note in render(). */
delegate($('#pager'), 'click', '[data-goto]', (event, button) => {
  const page = Number(button.dataset.goto);
  if (!Number.isFinite(page)) return;

  state.page = page;
  render();
  window.scrollTo({ top: $('#results').offsetTop - 100, behavior: 'smooth' });
});

/* Removing one chip has to write back into the rail as well as the state. */
delegate(document, 'click', '[data-drop]', (event, chip) => {
  const [key, value] = chip.dataset.drop.split(':');
  const rail = $('#filters');

  if (value) {
    state.criteria[key] = state.criteria[key].filter((v) => v !== value);
    const input = $$(`input[name="${key}"]`, rail).find((i) => i.value === value);
    if (input) input.checked = false;
  } else if (key === 'pay') {
    state.criteria.payMin = null;
    state.criteria.payMax = null;
    $('input[name="payMin"]', rail).value = String(state.domain.min);
    $('input[name="payMax"]', rail).value = String(state.domain.max);
    rail.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (key === 'within') {
    state.criteria.within = null;
    $$('[data-within]', rail).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.within === '')));
  } else if (key === 'q' || key === 'where') {
    state.criteria[key] = '';
    $(`#board-${key === 'q' ? 'q' : 'where'}`).value = '';
  } else if (key === 'companyId') {
    state.criteria.companyId = '';
  } else {
    state.criteria[key] = false;
    const input = $(`input[name="${key === 'savedOnly' ? 'savedOnly' : key}"]`, rail);
    if (input) input.checked = false;
  }

  state.page = 1;
  render();
});

delegate(document, 'click', '[data-clear-filters]', () => {
  state.criteria = { ...EMPTY_CRITERIA };
  state.sort = 'relevance';
  state.page = 1;

  $('#board-q').value = '';
  $('#board-where').value = '';
  $('#sort').value = 'relevance';

  const rail = $('#filters');
  rail.innerHTML = filtersMarkup({ facets: facets(state.jobs), domain: state.domain, criteria: state.criteria });
  wireFilters(rail, state.domain, debounce(() => {
    state.criteria = { ...state.criteria, ...readCriteria(rail, state.domain) };
    state.page = 1;
    render();
  }, 120));

  render();
  closeSheet();
});

/* --------------------------------------------- Mobile filter sheet */

const openSheet = () => {
  $('#filters').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  $('[data-filters-close]')?.focus();
};

const closeSheet = () => {
  $('#filters').classList.remove('is-open');
  document.body.style.overflow = '';
};

delegate(document, 'click', '[data-filters-open]', openSheet);
delegate(document, 'click', '[data-filters-close]', closeSheet);

on(document, 'keydown', (event) => {
  if (event.key === 'Escape') closeSheet();
});

/* ------------------------------------------------------------- Saves */

delegate(document, 'click', '[data-save]', (event, button) => {
  event.preventDefault();
  const { saved } = toggleSaved(button.dataset.save);

  button.setAttribute('aria-pressed', String(saved));
  button.innerHTML = bookmarkIcon(saved);
  refreshCounts();
  toast(saved ? 'Role saved' : 'Role removed from saved', saved ? 'ok' : 'info');

  if (state.criteria.savedOnly) render();
});

on(window, 'popstate', () => {
  criteriaFromUrl();
  render();
});

boot().catch((error) => {
  console.error(error);
  $('#results').innerHTML = `
    <div class="empty">
      <h3>The listings did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system. Start a local server in the project folder and reload.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
