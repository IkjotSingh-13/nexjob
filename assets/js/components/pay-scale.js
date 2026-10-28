/**
 * The pay scale.
 *
 * The one visual idea the product is built on. Every band in the app is
 * drawn against the same domain, so a card, a filter, a company page and
 * the salary explorer are all reading off one ruler — which is what makes
 * twenty-eight listings comparable at a glance instead of twenty-eight
 * strings you have to hold in your head.
 *
 * Positions are percentages of the domain, handed to CSS as custom
 * properties. No JavaScript touches layout after the markup is written.
 */

import { posOn, money, moneyFull, axisTicks } from '../core/format.js';
import { esc } from '../core/dom.js';

/**
 * @param {number} min      band floor
 * @param {number} max      band ceiling
 * @param {{min:number,max:number}} domain
 * @param {{size?:'sm'|'lg'|'xl', mark?:number|null, muted?:boolean, label?:string}} options
 */
export const payScale = (min, max, domain, options = {}) => {
  const { size = 'sm', mark = null, muted = false, label } = options;

  const lo = posOn(min, domain);
  const hi = posOn(max, domain);
  const markPos = mark === null ? (lo + hi) / 2 : posOn(mark, domain);

  const description = label ?? `Pay band ${moneyFull(min)} to ${moneyFull(max)}, `
    + `on a scale from ${moneyFull(domain.min)} to ${moneyFull(domain.max)}`;

  const sizeClass = size === 'sm' ? '' : ` scale--${size}`;
  const mutedClass = muted ? ' scale--muted' : '';

  return `
    <div class="scale${sizeClass}${mutedClass}" role="img" aria-label="${esc(description)}"
         style="--lo:${lo.toFixed(2)}%;--hi:${hi.toFixed(2)}%;--mark:${markPos.toFixed(2)}%">
      <div class="scale-track"></div>
      <div class="scale-band"></div>
      <div class="scale-mark"></div>
    </div>`;
};

/** The tick labels under a scale. */
export const payAxis = (domain, count = 5) => `
  <div class="scale-axis" aria-hidden="true">
    ${axisTicks(domain, count).map((value) => `<span>${money(value)}</span>`).join('')}
  </div>`;

/**
 * The full treatment used on a job page: figures, a tall band, the axis,
 * and where the role sits against the rest of the board.
 */
export const payScaleFull = (job, domain, marketMedian) => {
  const above = job.salaryMid >= marketMedian;
  const gap = Math.abs(job.salaryMid - marketMedian);

  return `
    <div>
      <div class="scale-legend">
        <span class="figure" style="font-size:var(--t-lg)">${money(job.salaryMin)} – ${money(job.salaryMax)}</span>
        <span class="tick">Base salary, per year, USD</span>
      </div>

      ${payScale(job.salaryMin, job.salaryMax, domain, { size: 'lg' })}
      ${payAxis(domain)}

      <p class="tick" style="margin-top:var(--s3);color:var(--ink-2);text-transform:none;letter-spacing:0">
        Midpoint ${money(job.salaryMid)} —
        <span style="color:${above ? 'var(--ok)' : 'var(--warn)'}">
          ${money(gap)} ${above ? 'above' : 'below'}
        </span>
        the ${money(marketMedian)} midpoint across every role on the board.
      </p>
    </div>`;
};

/**
 * One labelled row, for the salary explorer and company pages. Wide screens
 * get label, band and figures as three aligned columns.
 */
export const payScaleRow = ({ label, min, max, mid, count }, domain) => `
  <div class="scale-row">
    <div class="scale-row-label">
      ${esc(label)}
      ${count !== undefined ? `<span class="tick" style="display:block;margin-top:2px">${count} ${count === 1 ? 'role' : 'roles'}</span>` : ''}
    </div>
    ${payScale(min, max, domain, {
      mark: mid,
      label: `${label}: ${moneyFull(min)} to ${moneyFull(max)}, midpoint ${moneyFull(mid ?? (min + max) / 2)}`
    })}
    <div class="scale-row-figure">${money(min)} – ${money(max)}</div>
  </div>`;
