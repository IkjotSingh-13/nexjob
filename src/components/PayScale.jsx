/**
 * The pay scale: one ruler that every salary in the app is drawn on, so any
 * two bands can be compared at a glance. Positions are percentages handed to
 * the CSS as --lo, --hi and --mark.
 */

import { posOn, money, moneyFull, axisTicks } from '../lib/format.js';

/**
 * @param {number} min, max   the band
 * @param {{min,max}} domain  the whole board's range
 * @param {'sm'|'lg'|'xl'} size
 * @param {number} mark       where the tick goes (default: middle of the band)
 * @param {string} label      what a screen reader hears
 */
export function PayScale({ min, max, domain, size = 'sm', mark, label }) {
  const lo = posOn(min, domain);
  const hi = posOn(max, domain);
  const markAt = mark === undefined ? (lo + hi) / 2 : posOn(mark, domain);

  const description = label ?? `Pay band ${moneyFull(min)} to ${moneyFull(max)}, `
    + `on a scale from ${moneyFull(domain.min)} to ${moneyFull(domain.max)}`;

  return (
    <div className={size === 'sm' ? 'scale' : `scale scale--${size}`} role="img" aria-label={description}
         style={{ '--lo': `${lo.toFixed(2)}%`, '--hi': `${hi.toFixed(2)}%`, '--mark': `${markAt.toFixed(2)}%` }}>
      <div className="scale-track" />
      <div className="scale-band" />
      <div className="scale-mark" />
    </div>
  );
}

/** The money labels under a scale. */
export function PayAxis({ domain, count = 5 }) {
  return (
    <div className="scale-axis" aria-hidden="true">
      {axisTicks(domain, count).map((value, i) => <span key={i}>{money(value)}</span>)}
    </div>
  );
}

/** One labelled row: name, band, figures. Used for groups of jobs. */
export function PayScaleRow({ row, domain }) {
  const { label, min, max, mid, count } = row;

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
      <PayScale min={min} max={max} domain={domain} mark={mid}
                label={`${label}: ${moneyFull(min)} to ${moneyFull(max)}, midpoint ${moneyFull(mid)}`} />
      <div className="scale-row-figure">{money(min)} – {money(max)}</div>
    </div>
  );
}

/** "Midpoint $150k — $12k above the $138k midpoint …" */
export function MidpointNote({ mid, boardMid, children }) {
  const above = mid >= boardMid;
  return (
    <>
      Midpoint {money(mid)} —{' '}
      <span style={{ color: above ? 'var(--ok)' : 'var(--warn)' }}>
        {money(Math.abs(mid - boardMid))} {above ? 'above' : 'below'}
      </span>{' '}
      {children}
    </>
  );
}
