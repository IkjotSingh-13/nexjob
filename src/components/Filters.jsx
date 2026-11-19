/**
 * The filter rail on the jobs page.
 *
 * The page owns the criteria; this component only shows them and reports
 * changes through onChange({ field: newValue }).
 *
 * The pay filter is two real range inputs on top of a painted track, so it
 * works with the keyboard and screen readers like any slider.
 */

import { useEffect, useRef } from 'react';
import { money, posOn } from '../lib/format.js';
import Icon from './Icon.jsx';

const WITHIN = [
  { value: null, label: 'Any time' },
  { value: 24,   label: 'Past day' },
  { value: 168,  label: 'Past week' },
  { value: 720,  label: 'Past month' }
];

export default function Filters({ facets, domain, criteria, onChange, onClear, open, onClose }) {
  const lo = criteria.payMin ?? domain.min;
  const hi = criteria.payMax ?? domain.max;

  /* On phones the rail slides up as a sheet; move focus into it when it opens. */
  const closeButton = useRef(null);
  useEffect(() => {
    if (open) closeButton.current.focus();
  }, [open]);

  /* At either end of the scale means "no limit". */
  const setPay = (min, max) => onChange({
    payMin: min > domain.min ? min : null,
    payMax: max < domain.max ? max : null
  });

  /* Tick or untick one value in a list (disciplines, levels, types). */
  const toggle = (name, value) => {
    const chosen = criteria[name].includes(value)
      ? criteria[name].filter((v) => v !== value)
      : [...criteria[name], value];
    onChange({ [name]: facets[name].filter((v) => chosen.includes(v)) });   // keep on-screen order
  };

  const checkGroup = (title, name) => (
    <div className="filter-group">
      <p className="tick">{title}</p>
      {facets[name].map((value) => (
        <label className="check" key={value}>
          <input type="checkbox" checked={criteria[name].includes(value)} onChange={() => toggle(name, value)} />
          <span>{value}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className={open ? 'filters is-open' : 'filters'}>
      <div className="filters-head">
        <h2 style={{ fontSize: 'var(--t-lg)' }}>Filters</h2>
        <button type="button" className="ibtn" aria-label="Close filters" onClick={onClose} ref={closeButton}>
          <Icon name="close" size={17} />
        </button>
      </div>

      <div className="filter-group">
        <p className="tick" id="pay-filter-label">Pay range</p>

        <div className="pay-filter-figures">
          <span>{money(lo)}</span>
          <span>{money(hi)}</span>
        </div>

        <div className="rangeset"
             style={{ '--a': `${posOn(lo, domain).toFixed(2)}%`, '--b': `${posOn(hi, domain).toFixed(2)}%` }}>
          <div className="rangeset-track" />
          <div className="rangeset-fill" />
          {/* The handle being dragged pushes the other one rather than crossing it. */}
          <input type="range" min={domain.min} max={domain.max} step="5000" value={lo}
                 aria-label="Minimum pay" aria-describedby="pay-filter-label"
                 onChange={(e) => setPay(Number(e.target.value), Math.max(Number(e.target.value), hi))} />
          <input type="range" min={domain.min} max={domain.max} step="5000" value={hi}
                 aria-label="Maximum pay" aria-describedby="pay-filter-label"
                 onChange={(e) => setPay(Math.min(Number(e.target.value), lo), Number(e.target.value))} />
        </div>

        <p className="field-note">A role matches when its band overlaps yours.</p>
      </div>

      <div className="filter-group">
        <p className="tick">Working</p>
        <label className="check">
          <input type="checkbox" checked={criteria.remote} onChange={(e) => onChange({ remote: e.target.checked })} />
          <span>Remote only</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={criteria.savedOnly} onChange={(e) => onChange({ savedOnly: e.target.checked })} />
          <span>Saved roles only</span>
        </label>
      </div>

      {checkGroup('Discipline', 'disciplines')}
      {checkGroup('Level', 'levels')}
      {checkGroup('Contract', 'types')}

      <div className="filter-group">
        <p className="tick" id="within-label">Posted</p>
        <div className="seg" role="group" aria-labelledby="within-label">
          {WITHIN.map((option) => (
            <button type="button" key={option.label} aria-pressed={criteria.within === option.value}
                    onClick={() => onChange({ within: option.value })}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <button type="button" className="btn btn--outline btn--block" onClick={onClear}>Clear all filters</button>
      </div>
    </div>
  );
}
