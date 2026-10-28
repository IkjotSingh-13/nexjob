/**
 * One company.
 *
 * Its profile, its pay band against the whole board, its open roles, and a
 * link through to what it takes to get hired there.
 */

import { $, esc, escAttr, delegate, query, url } from '../core/dom.js';
import { load, companyById, jobsAtCompany, prepFor, sortJobs } from '../core/data.js';
import { money, median, plural } from '../core/format.js';
import { initShell, refreshCounts } from '../core/shell.js';
import { toggleSaved } from '../core/store.js';
import { toast } from '../core/toast.js';
import { jobCard } from '../components/job-card.js';
import { payScale, payAxis } from '../components/pay-scale.js';
import { bookmarkIcon } from '../components/icons.js';

initShell();

const boot = async () => {
  const { jobs, companies, prep, domain } = await load();
  const company = companyById(companies, query().id);

  if (!company) {
    $('#co-root').innerHTML = `
      <div class="empty">
        <h3>No such company</h3>
        <p>That link does not match any company hiring here.</p>
        <a class="btn btn--primary" href="./companies.html">See every company</a>
      </div>`;
    return;
  }

  document.title = `${company.name} — Nexjob`;

  const open = sortJobs(jobsAtCompany(jobs, company.id), 'newest');
  const route = prepFor(prep, company.id);

  const min = open.length ? Math.min(...open.map((j) => j.salaryMin)) : 0;
  const max = open.length ? Math.max(...open.map((j) => j.salaryMax)) : 0;
  const mid = open.length ? median(open.map((j) => j.salaryMid)) : 0;
  const boardMid = median(jobs.map((j) => j.salaryMid));

  $('#co-root').innerHTML = `
    <div class="card">
      <div class="co-hero">
        <span class="mark mark--lg" aria-hidden="true"
              style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>

        <div style="min-width:0;flex:1 1 280px">
          <h1>${esc(company.name)}</h1>
          <p style="margin-top:var(--s2);color:var(--ink-2)">${esc(company.tagline || '')}</p>
        </div>

        <div class="row row--tight">
          ${open.length
            ? `<a class="btn btn--primary btn--sm" href="${url('jobs.html', { company: company.id })}">
                 ${plural(open.length, 'open role')}
               </a>` : ''}
          ${route
            ? `<a class="btn btn--outline btn--sm" href="${url('prep.html', { company: company.id })}">How to get in</a>`
            : ''}
        </div>
      </div>

      <dl class="co-facts" style="margin-top:var(--s7)">
        <div class="co-fact"><dt class="tick">Industry</dt><dd class="co-fact-value">${esc(company.industry)}</dd></div>
        <div class="co-fact"><dt class="tick">Size</dt><dd class="co-fact-value">${esc(company.size)}</dd></div>
        <div class="co-fact"><dt class="tick">Base</dt><dd class="co-fact-value">${esc(company.hq)}</dd></div>
        <div class="co-fact"><dt class="tick">Founded</dt><dd class="co-fact-value">${esc(company.founded)}</dd></div>
      </dl>
    </div>

    ${open.length ? `
      <div class="card" style="margin-top:var(--s4)">
        <div class="sec-head" style="margin-bottom:var(--s4)">
          <div>
            <h2 style="font-size:var(--t-lg)">What ${esc(company.name)} pays</h2>
            <p>Floor to ceiling across ${plural(open.length, 'open role')}, on the board's scale.</p>
          </div>
          <span class="figure">${money(min)} – ${money(max)}</span>
        </div>

        ${payScale(min, max, domain, {
          size: 'lg',
          mark: mid,
          label: `${company.name} pays ${money(min)} to ${money(max)}, midpoint ${money(mid)}`
        })}
        ${payAxis(domain)}

        <p class="tick" style="margin-top:var(--s4);text-transform:none;letter-spacing:0;color:var(--ink-2)">
          Midpoint ${money(mid)} —
          <span style="color:${mid >= boardMid ? 'var(--ok)' : 'var(--warn)'}">
            ${money(Math.abs(mid - boardMid))} ${mid >= boardMid ? 'above' : 'below'}
          </span>
          the board midpoint of ${money(boardMid)}.
        </p>
      </div>` : ''}

    <div class="card" style="margin-top:var(--s4)">
      <div class="detail-block">
        <h2>About</h2>
        <p style="color:var(--ink-2);font-size:var(--t-sm);line-height:1.6">${esc(company.about)}</p>
      </div>

      ${(company.perks || []).length ? `
        <div class="detail-block">
          <h2>What they offer</h2>
          <ul class="bullets">${company.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>` : ''}

      ${company.site ? `
        <div class="detail-block">
          <h2>Elsewhere</h2>
          <p><a href="https://${esc(company.site)}" rel="noopener noreferrer" target="_blank">${esc(company.site)}</a></p>
        </div>` : ''}
    </div>

    <section style="margin-top:var(--s8)" aria-labelledby="co-roles">
      <div class="sec-head">
        <div>
          <h2 id="co-roles">Open roles</h2>
          <p>${open.length ? plural(open.length, 'role') : 'Nothing open right now'}</p>
        </div>
      </div>

      <div class="stack">
        ${open.length
          ? open.map((job, i) => jobCard(job, { index: i + 1, domain })).join('')
          : `<div class="empty">
               <h3>No open roles at ${esc(company.name)}</h3>
               <p>Set up an alert and you will see the next one on your dashboard.</p>
               <a class="btn btn--outline" href="./dashboard.html#alerts">Create an alert</a>
             </div>`}
      </div>
    </section>`;

  refreshCounts();
};

delegate(document, 'click', '[data-save]', (event, button) => {
  event.preventDefault();
  const { saved } = toggleSaved(button.dataset.save);
  button.setAttribute('aria-pressed', String(saved));
  button.innerHTML = bookmarkIcon(saved);
  refreshCounts();
  toast(saved ? 'Role saved' : 'Role removed from saved', saved ? 'ok' : 'info');
});

boot().catch((error) => {
  console.error(error);
  $('#co-root').innerHTML = `
    <div class="empty">
      <h3>The company did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
