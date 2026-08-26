/**
 * The filter rail.
 *
 * The pay filter is the same ruler the listings are drawn on, so dragging a
 * handle and reading a card use one mental model. It is built from two real
 * range inputs stacked over a painted track — keyboard operation and screen
 * reader announcements come free, and the paint is purely decorative.
 */

import { $, $$, on, esc } from '../core/dom.js';
import { money, posOn } from '../core/format.js';

const WITHIN = [
  { value: '',    label: 'Any time' },
  { value: '24',  label: 'Past day' },
  { value: '168', label: 'Past week' },
  { value: '720', label: 'Past month' }
];

const checkGroup = (name, values, selected) => values.map((value) => `
  <label class="check">
    <input type="checkbox" name="${name}" value="${esc(value)}" ${selected.includes(value) ? 'checked' : ''}>
    <span>${esc(value)}</span>
  </label>`).join('');

export const filtersMarkup = ({ facets, domain, criteria }) => {
  const lo = criteria.payMin ?? domain.min;
  const hi = criteria.payMax ?? domain.max;

  return `
    <div class="filters-head">
      <h2 style="font-size:var(--t-lg)">Filters</h2>
      <button type="button" class="ibtn" data-filters-close aria-label="Close filters">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="filter-group">
      <p class="tick" id="pay-filter-label">Pay range</p>

      <div class="pay-filter-figures">
        <span data-pay-lo>${money(lo)}</span>
        <span data-pay-hi>${money(hi)}</span>
      </div>

      <div class="rangeset" data-rangeset
           style="--a:${posOn(lo, domain).toFixed(2)}%;--b:${posOn(hi, domain).toFixed(2)}%">
        <div class="rangeset-track"></div>
        <div class="rangeset-fill"></div>
        <input type="range" name="payMin" min="${domain.min}" max="${domain.max}" step="5000" value="${lo}"
               aria-label="Minimum pay" aria-describedby="pay-filter-label">
        <input type="range" name="payMax" min="${domain.min}" max="${domain.max}" step="5000" value="${hi}"
               aria-label="Maximum pay" aria-describedby="pay-filter-label">
      </div>

      <p class="field-note">A role matches when its band overlaps yours.</p>
    </div>

    <div class="filter-group">
      <p class="tick">Working</p>
      <label class="check">
        <input type="checkbox" name="remote" ${criteria.remote ? 'checked' : ''}>
        <span>Remote only</span>
      </label>
      <label class="check">
        <input type="checkbox" name="savedOnly" ${criteria.savedOnly ? 'checked' : ''}>
        <span>Saved roles only</span>
      </label>
    </div>

    <div class="filter-group">
      <p class="tick">Discipline</p>
      ${checkGroup('disciplines', facets.disciplines, criteria.disciplines)}
    </div>

    <div class="filter-group">
      <p class="tick">Level</p>
      ${checkGroup('levels', facets.levels, criteria.levels)}
    </div>

    <div class="filter-group">
      <p class="tick">Contract</p>
      ${checkGroup('types', facets.types, criteria.types)}
    </div>

    <div class="filter-group">
      <p class="tick" id="within-label">Posted</p>
      <div class="seg" role="group" aria-labelledby="within-label">
        ${WITHIN.map((option) => `
          <button type="button" data-within="${option.value}"
                  aria-pressed="${String(criteria.within ?? '') === option.value}">${option.label}</button>`).join('')}
      </div>
    </div>

    <div class="filter-group">
      <button type="button" class="btn btn--outline btn--block" data-clear-filters>Clear all filters</button>
    </div>`;
};

/**
 * Read the rail back into a criteria object.
 * @param {HTMLElement} root
 * @param {{min:number,max:number}} domain
 */
export const readCriteria = (root, domain) => {
  const checked = (name) => $$(`input[name="${name}"]:checked`, root).map((input) => input.value);

  const payMin = Number($('input[name="payMin"]', root)?.value ?? domain.min);
  const payMax = Number($('input[name="payMax"]', root)?.value ?? domain.max);
  const within = $('[data-within][aria-pressed="true"]', root)?.dataset.within || '';

  return {
    remote: $('input[name="remote"]', root)?.checked ?? false,
    savedOnly: $('input[name="savedOnly"]', root)?.checked ?? false,
    disciplines: checked('disciplines'),
    levels: checked('levels'),
    types: checked('types'),
    payMin: payMin > domain.min ? payMin : null,
    payMax: payMax < domain.max ? payMax : null,
    within: within ? Number(within) : null
  };
};

/**
 * Wire the rail. `onChange` fires after any control settles.
 * @param {HTMLElement} root
 * @param {{min:number,max:number}} domain
 * @param {Function} onChange
 */
export const wireFilters = (root, domain, onChange) => {
  const rangeset = $('[data-rangeset]', root);
  const minInput = $('input[name="payMin"]', root);
  const maxInput = $('input[name="payMax"]', root);

  const paintRange = () => {
    /* Handles must not cross. Whichever one moved gives way. */
    let lo = Number(minInput.value);
    let hi = Number(maxInput.value);

    if (lo > hi) {
      if (document.activeElement === minInput) hi = lo;
      else lo = hi;
      minInput.value = String(lo);
      maxInput.value = String(hi);
    }

    rangeset.style.setProperty('--a', `${posOn(lo, domain).toFixed(2)}%`);
    rangeset.style.setProperty('--b', `${posOn(hi, domain).toFixed(2)}%`);
    $('[data-pay-lo]', root).textContent = money(lo);
    $('[data-pay-hi]', root).textContent = money(hi);
  };

  on(root, 'input', (event) => {
    if (event.target.type === 'range') paintRange();
    onChange();
  });

  on(root, 'click', (event) => {
    const within = event.target.closest('[data-within]');
    if (!within) return;

    $$('[data-within]', root).forEach((button) =>
      button.setAttribute('aria-pressed', String(button === within)));
    onChange();
  });

  paintRange();
};
