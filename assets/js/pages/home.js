/**
 * Home.
 *
 * Everything on this page is counted from the listings themselves. No figure
 * is written into the markup by hand, so the page cannot go stale.
 */

import { $, $$, on, esc, escAttr, delegate, url } from '../core/dom.js';
import { load, sortJobs } from '../core/data.js';
import { money, median, plural } from '../core/format.js';
import { initShell, refreshCounts } from '../core/shell.js';
import { toggleSaved } from '../core/store.js';
import { toast } from '../core/toast.js';
import { jobCard, skeletons } from '../components/job-card.js';
import { payScaleRow, payAxis } from '../components/pay-scale.js';
import { bookmarkIcon, icon } from '../components/icons.js';

initShell();

const boot = async () => {
  $('#featured').innerHTML = skeletons(3);

  const { jobs, companies, prep, domain } = await load();

  /* ------------------------------------------------- Hero eyebrow */

  $('#hero-eyebrow').textContent =
    `${plural(jobs.length, 'open role')} · ${plural(companies.length, 'company', 'companies')} · sample data`;

  /* ---------------------------------- The spectrum: the whole board */

  const bySalary = [...jobs].sort((a, b) => a.salaryMid - b.salaryMid);

  $('#spectrum-rows').innerHTML = bySalary.map((job, i) => {
    const lo = ((job.salaryMin - domain.min) / (domain.max - domain.min)) * 100;
    const hi = ((job.salaryMax - domain.min) / (domain.max - domain.min)) * 100;

    return `
      <a class="spectrum-row" href="${url('job.html', { id: job.id })}"
         style="--lo:${lo.toFixed(2)}%;--hi:${hi.toFixed(2)}%;--i:${i}"
         title="${escAttr(`${job.title} at ${job.companyName} — ${money(job.salaryMin)} to ${money(job.salaryMax)}`)}">
        <span class="visually-hidden">${esc(job.title)} at ${esc(job.companyName)},
          ${money(job.salaryMin)} to ${money(job.salaryMax)}</span>
      </a>`;
  }).join('');

  $('#spectrum-axis').innerHTML = payAxis(domain, 4);

  /* -------------------------------------------------------- Figures */

  const remote = jobs.filter((j) => j.remote).length;
  const mids = jobs.map((j) => j.salaryMid);

  $('#stats').innerHTML = [
    ['Open roles', jobs.length, 'across the board'],
    ['Companies', companies.length, 'currently hiring'],
    ['Remote', `${Math.round((remote / jobs.length) * 100)}%`, `${remote} of ${jobs.length} roles`],
    ['Median midpoint', money(median(mids)), 'base salary, USD']
  ].map(([label, figure, note]) => `
    <div class="stat">
      <span class="tick">${esc(label)}</span>
      <span class="stat-figure">${esc(figure)}</span>
      <span class="tick" style="text-transform:none;letter-spacing:0">${esc(note)}</span>
    </div>`).join('');

  /* ------------------------------------------------------- Featured */

  const featured = sortJobs(jobs.filter((j) => j.featured), 'newest').slice(0, 3);

  $('#featured').innerHTML = featured.length
    ? featured.map((job, i) => jobCard(job, { index: i + 1, domain })).join('')
    : '<p class="tick">No featured roles right now.</p>';

  /* -------------------------------------------- Pay by discipline */

  const disciplines = [...new Set(jobs.map((j) => j.discipline))]
    .map((name) => {
      const set = jobs.filter((j) => j.discipline === name);
      return {
        label: name,
        count: set.length,
        min: Math.min(...set.map((j) => j.salaryMin)),
        max: Math.max(...set.map((j) => j.salaryMax)),
        mid: median(set.map((j) => j.salaryMid))
      };
    })
    .sort((a, b) => b.mid - a.mid);

  $('#disciplines').innerHTML = disciplines
    .map((entry) => payScaleRow(entry, domain)).join('');

  $('#disciplines-axis').innerHTML = payAxis(domain);

  /* ---------------------------------------------------- Get in teaser */

  const hardest = [...prep].sort((a, b) => b.bar - a.bar).slice(0, 3);

  $('#prep-teaser').innerHTML = hardest.map((entry) => {
    const company = companies.find((c) => c.id === entry.companyId);
    const openNow = entry.openings.filter((o) => o.status === 'open').length;

    return `
      <a class="card prep-teaser" href="${url('prep.html', { company: entry.companyId })}">
        <div class="row" style="gap:var(--s3)">
          <span class="mark" aria-hidden="true"
                style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>
          <div style="min-width:0">
            <p style="font-weight:600">${esc(company.name)}</p>
            <p class="tick">${esc(entry.loopWeeks)} weeks, ${entry.stages.length} stages</p>
          </div>
        </div>

        <div style="margin-top:var(--s4)">
          <div class="row row--split" style="margin-bottom:5px">
            <span class="tick">Hiring bar</span>
            <span class="figure" style="font-size:var(--t-xs)">${entry.bar}/100</span>
          </div>
          <div class="meter"><div class="meter-fill" style="--v:${entry.bar}%"></div></div>
        </div>

        <p class="prep-teaser-note">${esc(entry.focus[0].topic)} carries the most weight.</p>

        ${openNow
          ? `<span class="pill pill--flag pill--dot">${plural(openNow, 'intake')} open</span>`
          : '<span class="pill">No open intake</span>'}
      </a>`;
  }).join('');
};

/* -------------------------------------------------------------- Events */

on($('#hero-search'), 'submit', (event) => {
  event.preventDefault();
  const q = $('#hero-q').value.trim();
  const where = $('#hero-where').value.trim();
  location.href = url('jobs.html', { q, where });
});

delegate(document, 'click', '[data-term]', (event, chip) => {
  location.href = url('jobs.html', { q: chip.dataset.term });
});

/* Saving from a card, without leaving the page. */
delegate(document, 'click', '[data-save]', (event, button) => {
  event.preventDefault();
  const { saved } = toggleSaved(button.dataset.save);

  button.setAttribute('aria-pressed', String(saved));
  button.innerHTML = bookmarkIcon(saved);

  const title = button.closest('.job')?.querySelector('.job-title')?.textContent.trim() ?? 'Role';
  button.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${title}`);

  refreshCounts();
  toast(saved ? 'Role saved' : 'Role removed from saved', saved ? 'ok' : 'info');
});

boot().catch((error) => {
  console.error(error);
  $('#featured').innerHTML = `
    <div class="empty">
      <h3>The listings did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system. Start a local server in the project folder and reload.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
