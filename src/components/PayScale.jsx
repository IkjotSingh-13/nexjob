/**
 * The pay scale.
 *
 * The one visual idea the product is built on. Every band in the app is drawn
 * against the same domain, so a card, a filter, a company page and the salary
 * explorer are all reading off one ruler — which is what makes twenty-eight
 * listings comparable at a glance instead of twenty-eight strings you have to
 * hold in your head.
 *
 * Positions are percentages of the domain, handed to CSS as custom
 * properties. No JavaScript touches layout after the markup is written.
 */

import { posOn, money, moneyFull, axisTicks } from '../lib/format.js';

/**
 * @param {{min:number, max:number, domain:{min:number,max:number},
 *          size?:'sm'|'lg'|'xl', mark?:number|null, muted?:boolean, label?:string}} props
 */
export function PayScale({ min, max, domain, size = 'sm', mark = null, muted = false, label }) {
  const lo = posOn(min, domain);
  const hi = posOn(max, domain);
  const markPos = mark === null ? (lo + hi) / 2 : posOn(mark, domain);

  const description = label ?? `Pay band ${moneyFull(min)} to ${moneyFull(max)}, `
    + `on a scale from ${moneyFull(domain.min)} to ${moneyFull(domain.max)}`;

  const className = `scale${size === 'sm' ? '' : ` scale--${size}`}${muted ? ' scale--muted' : ''}`;

  return (
    <div className={className} role="img" aria-label={description}
         style={{ '--lo': `${lo.toFixed(2)}%`, '--hi': `${hi.toFixed(2)}%`, '--mark': `${markPos.toFixed(2)}%` }}>
      <div className="scale-track" />
      <div className="scale-band" />
      <div className="scale-mark" />
    </div>
  );
}

/** The tick labels under a scale. */
export function PayAxis({ domain, count = 5 }) {
  return (
    <div className="scale-axis" aria-hidden="true">
      {axisTicks(domain, count).map((value) => <span key={value}>{money(value)}</span>)}
    </div>
  );
}

/**
 * The full treatment used on a job page: figures, a tall band, the axis,
 * and where the role sits against the rest of the board.
 */
export function PayScaleFull({ job, domain, marketMedian }) {
  const above = job.salaryMid >= marketMedian;
  const gap = Math.abs(job.salaryMid - marketMedian);

  return (
    <div>
      <div className="scale-legend">
        <span className="figure" style={{ fontSize: 'var(--t-lg)' }}>{money(job.salaryMin)} – {money(job.salaryMax)}</span>
        <span className="tick">Base salary, per year, USD</span>
      </div>

      <PayScale min={job.salaryMin} max={job.salaryMax} domain={domain} size="lg" />
      <PayAxis domain={domain} />

      <p className="tick" style={{ marginTop: 'var(--s3)', color: 'var(--ink-2)', textTransform: 'none', letterSpacing: 0 }}>
        Midpoint {money(job.salaryMid)} —{' '}
        <span style={{ color: above ? 'var(--ok)' : 'var(--warn)' }}>
          {money(gap)} {above ? 'above' : 'below'}
        </span>{' '}
        the {money(marketMedian)} midpoint across every role on the board.
      </p>
    </div>
  );
}

/**
 * One labelled row, for the salary explorer and company pages. Wide screens
 * get label, band and figures as three aligned columns.
 */
export function PayScaleRow({ row: { label, min, max, mid, count }, domain }) {
  return (
    <div className="scale-row">
      <div className="scale-row-label">
        {label}
        {count !== undefined && (
          <span className="tick" style={{ display: 'block', marginTop: 2 }}>
            {count} {count === 1 ? 'role' : 'roles'}
          </span>
        )}
      </div>
      <PayScale
        min={min} max={max} domain={domain} mark={mid}
        label={`${label}: ${moneyFull(min)} to ${moneyFull(max)}, midpoint ${moneyFull(mid ?? (min + max) / 2)}`}
      />
      <div className="scale-row-figure">{money(min)} – {money(max)}</div>
    </div>
  );
}
