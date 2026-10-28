/**
 * The listing card.
 *
 * One set of markup. On a phone it is a card; from 720px an index gutter
 * opens on the left and the row takes its place in the ledger. The card is
 * a single link target — the title's ::after covers the card — with the
 * save button lifted above it so both stay reachable by keyboard.
 */

import { esc, escAttr, url } from '../core/dom.js';
import { money, relTime } from '../core/format.js';
import { isSaved } from '../core/store.js';
import { payScale } from './pay-scale.js';
import { bookmarkIcon } from './icons.js';

const flag = (job) => {
  if (job.featured) return '<span class="pill pill--blue">Featured</span>';
  if ((job.postedHoursAgo ?? 999) <= 24) return '<span class="pill pill--flag pill--dot">New</span>';
  return '';
};

/**
 * @param {Object} job      hydrated listing
 * @param {{index?:number, domain:Object, showScale?:boolean}} options
 */
export const jobCard = (job, { index, domain, showScale = true } = {}) => {
  const saved = isSaved(job.id);
  const label = `${saved ? 'Remove' : 'Save'} ${job.title} at ${job.companyName}`;

  return `
    <article class="job${job.featured ? ' is-featured' : ''}" data-job="${esc(job.id)}">
      <div class="job-index" aria-hidden="true">${index === undefined ? '' : String(index).padStart(2, '0')}</div>

      <div class="job-body">
        <div class="job-head">
          <span class="mark" aria-hidden="true"
                style="background:${escAttr(job.company.brandBg)};color:${escAttr(job.company.brandFg)}">${esc(job.company.initial)}</span>

          <div class="job-titles">
            <h3 class="job-title"><a href="${url('job.html', { id: job.id })}">${esc(job.title)}</a></h3>
            <p class="job-org">${esc(job.companyName)} · ${esc(job.location)} · ${esc(job.type)}</p>
          </div>

          <button type="button" class="ibtn job-save" data-save="${esc(job.id)}"
                  aria-pressed="${saved}" aria-label="${escAttr(label)}">
            ${bookmarkIcon(saved)}
          </button>
        </div>

        <p class="job-sum">${esc(job.summary)}</p>

        ${showScale ? `
          <div class="job-pay">
            <div class="job-pay-figures">
              <span class="figure">${money(job.salaryMin)} – ${money(job.salaryMax)}</span>
              <span class="tick">${esc(job.level)} · ${esc(job.discipline)}</span>
            </div>
            ${payScale(job.salaryMin, job.salaryMax, domain)}
          </div>` : ''}

        <div class="job-tags">
          ${(job.tags || []).slice(0, 3).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}
        </div>

        <div class="job-foot">
          <div class="job-foot-meta">
            ${flag(job)}
            <span class="tick">${esc(relTime(job.postedAt))}</span>
            ${job.remote ? '<span class="tick">Remote</span>' : ''}
          </div>
          <span class="tick tick--blue">View role</span>
        </div>
      </div>
    </article>`;
};

/** A tighter version for sidebars and "similar roles" strips. */
export const jobCardMini = (job) => `
  <a class="card" href="${url('job.html', { id: job.id })}"
     style="display:flex;gap:var(--s3);text-decoration:none;padding:var(--s4)">
    <span class="mark mark--sm" aria-hidden="true"
          style="background:${escAttr(job.company.brandBg)};color:${escAttr(job.company.brandFg)}">${esc(job.company.initial)}</span>
    <span style="min-width:0">
      <span style="display:block;font-size:var(--t-sm);font-weight:600;color:var(--ink)">${esc(job.title)}</span>
      <span class="tick" style="display:block;margin-top:3px">${esc(job.companyName)} · ${money(job.salaryMin)}–${money(job.salaryMax)}</span>
    </span>
  </a>`;

/** Loading placeholders, so the list does not jump when data arrives. */
export const skeletons = (count = 4) =>
  Array.from({ length: count }, () => '<div class="skeleton"></div>').join('');
