/**
 * Company directory.
 *
 * Each card carries the company's own pay band on the shared domain, so the
 * directory answers "who pays what" without opening anything.
 */

import { $, on, esc, escAttr, url } from '../core/dom.js';
import { load, jobsAtCompany } from '../core/data.js';
import { money, plural } from '../core/format.js';
import { initShell } from '../core/shell.js';
import { payScale } from '../components/pay-scale.js';

initShell();

const state = { companies: [], jobs: [], domain: null, q: '', industry: '' };

const render = () => {
  const q = state.q.trim().toLowerCase();

  const rows = state.companies
    .map((company) => {
      const open = jobsAtCompany(state.jobs, company.id);
      return {
        company,
        open,
        min: open.length ? Math.min(...open.map((j) => j.salaryMin)) : 0,
        max: open.length ? Math.max(...open.map((j) => j.salaryMax)) : 0
      };
    })
    .filter(({ company }) =>
      (!q || `${company.name} ${company.industry} ${company.tagline}`.toLowerCase().includes(q))
      && (!state.industry || company.industry === state.industry))
    .sort((a, b) => b.open.length - a.open.length || a.company.name.localeCompare(b.company.name));

  $('#co-count').innerHTML = rows.length
    ? `<strong>${rows.length}</strong> ${rows.length === 1 ? 'company' : 'companies'}`
    : 'No companies match that search';

  $('#co-grid').innerHTML = rows.length ? rows.map(({ company, open, min, max }) => `
    <a class="card co-card" href="${url('company.html', { id: company.id })}">
      <div class="co-card-top">
        <span class="mark" aria-hidden="true"
              style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>
        <div style="min-width:0">
          <p class="co-card-name">${esc(company.name)}</p>
          <p class="tick">${esc(company.industry)} · ${esc(company.hq)}</p>
        </div>
      </div>

      <p class="co-card-about">${esc(company.tagline || company.about)}</p>

      ${open.length ? `
        <div>
          <div class="row row--split" style="margin-bottom:5px">
            <span class="tick">${plural(open.length, 'open role')}</span>
            <span class="figure" style="font-size:var(--t-xs)">${money(min)} – ${money(max)}</span>
          </div>
          ${payScale(min, max, state.domain, {
            label: `${company.name} pays ${money(min)} to ${money(max)} across ${open.length} open roles`
          })}
        </div>`
      : '<span class="pill">No open roles</span>'}
    </a>`).join('')
    : `<div class="empty" style="grid-column:1/-1">
         <h3>No companies match that search</h3>
         <p>Try a different name, or clear the industry filter.</p>
       </div>`;
};

const boot = async () => {
  const { jobs, companies, domain } = await load();
  Object.assign(state, { jobs, companies, domain });

  $('#co-lede').textContent =
    `${plural(companies.length, 'company', 'companies')} with ${plural(jobs.length, 'open role')} between them.`;

  const industries = [...new Set(companies.map((c) => c.industry))].sort();
  $('#co-industry').innerHTML = '<option value="">Every industry</option>'
    + industries.map((name) => `<option value="${escAttr(name)}">${esc(name)}</option>`).join('');

  render();
};

on($('#co-search'), 'input', (event) => {
  if (event.target.id === 'co-q') state.q = event.target.value;
  if (event.target.id === 'co-industry') state.industry = event.target.value;
  render();
});

on($('#co-search'), 'submit', (event) => event.preventDefault());

on($('#co-search'), 'reset', () => {
  state.q = '';
  state.industry = '';
  setTimeout(render, 0);
});

boot().catch((error) => {
  console.error(error);
  $('#co-grid').innerHTML = `
    <div class="empty" style="grid-column:1/-1">
      <h3>The company list did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
