/**
 * The filter rail.
 *
 * The pay filter is the same ruler the listings are drawn on, so dragging a
 * handle and reading a card use one mental model. It is built from two real
 * range inputs stacked over a painted track — keyboard operation and screen
 * reader announcements come free, and the paint is purely decorative.
 *
 * Fully controlled: `criteria` comes from the address bar and every control
 * reports a patch through `onChange`.
 */

import { useEffect, useRef } from 'react';
import { money, posOn } from '../lib/format.js';
import { Icon } from './Icon.jsx';

const WITHIN = [
  { value: '',    label: 'Any time' },
  { value: '24',  label: 'Past day' },
  { value: '168', label: 'Past week' },
  { value: '720', label: 'Past month' }
];

function CheckGroup({ name, values, selected, onToggle }) {
  return values.map((value) => (
    <label key={value} className="check">
      <input type="checkbox" name={name} value={value} checked={selected.includes(value)}
             onChange={() => onToggle(value)} />
      <span>{value}</span>
    </label>
  ));
}

/**
 * @param {{facets: Object, domain: {min:number,max:number}, criteria: Object,
 *          open: boolean, onChange: (patch:Object) => void,
 *          onClear: () => void, onClose: () => void}} props
 */
export function Filters({ facets, domain, criteria, open, onChange, onClear, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const lo = criteria.payMin ?? domain.min;
  const hi = criteria.payMax ?? domain.max;

  const setPay = (which, value) => {
    let nextLo = which === 'payMin' ? value : lo;
    let nextHi = which === 'payMax' ? value : hi;

    /* Handles must not cross. Whichever one moved gives way. */
    if (nextLo > nextHi) {
      if (which === 'payMin') nextHi = nextLo;
      else nextLo = nextHi;
    }

    onChange({
      payMin: nextLo > domain.min ? nextLo : null,
      payMax: nextHi < domain.max ? nextHi : null
    });
  };

  const toggle = (field, value) => {
    const current = criteria[field];
    onChange({ [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };

  return (
    <div className={`filters${open ? ' is-open' : ''}`} id="filters">
      <div className="filters-head">
        <h2 style={{ fontSize: 'var(--t-lg)' }}>Filters</h2>
        <button type="button" className="ibtn" ref={closeRef} onClick={onClose} aria-label="Close filters">
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
          <input type="range" name="payMin" min={domain.min} max={domain.max} step="5000" value={lo}
                 aria-label="Minimum pay" aria-describedby="pay-filter-label"
                 onChange={(event) => setPay('payMin', Number(event.target.value))} />
          <input type="range" name="payMax" min={domain.min} max={domain.max} step="5000" value={hi}
                 aria-label="Maximum pay" aria-describedby="pay-filter-label"
                 onChange={(event) => setPay('payMax', Number(event.target.value))} />
        </div>

        <p className="field-note">A role matches when its band overlaps yours.</p>
      </div>

      <div className="filter-group">
        <p className="tick">Working</p>
        <label className="check">
          <input type="checkbox" name="remote" checked={criteria.remote}
                 onChange={(event) => onChange({ remote: event.target.checked })} />
          <span>Remote only</span>
        </label>
        <label className="check">
          <input type="checkbox" name="savedOnly" checked={criteria.savedOnly}
                 onChange={(event) => onChange({ savedOnly: event.target.checked })} />
          <span>Saved roles only</span>
        </label>
      </div>

      <div className="filter-group">
        <p className="tick">Discipline</p>
        <CheckGroup name="disciplines" values={facets.disciplines} selected={criteria.disciplines}
                    onToggle={(value) => toggle('disciplines', value)} />
      </div>

      <div className="filter-group">
        <p className="tick">Level</p>
        <CheckGroup name="levels" values={facets.levels} selected={criteria.levels}
                    onToggle={(value) => toggle('levels', value)} />
      </div>

      <div className="filter-group">
        <p className="tick">Contract</p>
        <CheckGroup name="types" values={facets.types} selected={criteria.types}
                    onToggle={(value) => toggle('types', value)} />
      </div>

      <div className="filter-group">
        <p className="tick" id="within-label">Posted</p>
        <div className="seg" role="group" aria-labelledby="within-label">
          {WITHIN.map((option) => (
            <button key={option.value} type="button"
                    aria-pressed={String(criteria.within ?? '') === option.value}
                    onClick={() => onChange({ within: option.value ? Number(option.value) : null })}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <button type="button" className="btn btn--outline btn--block" onClick={onClear}>
          Clear all filters
        </button>
      </div>
    </div>
  );
}
