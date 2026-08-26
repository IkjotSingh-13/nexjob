/**
 * The boot cover.
 *
 * A full-bleed panel that holds the first paint until the page has its data
 * and has drawn it, so the first thing anyone sees is a finished board rather
 * than a frame of empty scales.
 *
 * The bar reports a pace, not a measurement — the data is one request, and
 * one request has no percentage. So it is drawn with the same grammar as
 * every other meter here and left to be what it is: a sense of progress that
 * always lands on 100 before the cover lifts.
 *
 * Nothing on the page depends on this module. If it never runs — modules are
 * blocked over file://, for one — the failsafe animation in components.css
 * lifts the cover without it.
 */

import { $ } from './dom.js';

/** Roughly one line per quarter of the bar. */
const STEPS = [
  'Reading listings',
  'Placing salaries on the scale',
  'Sorting by band'
];

const stillness = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Run the bar to full.
 *
 * Resolves when it lands on 100, so it can be raced against the real load
 * with Promise.all and whichever takes longer sets the pace.
 *
 * @returns {Promise<void>}
 */
export const runCover = () => new Promise((resolve) => {
  const track = $('#loader-track');
  const fill = $('#loader-fill');
  const pct = $('#loader-pct');
  const status = $('#loader-status');

  // No cover on the page, or the viewer asked for no motion: let the load
  // set the timing by itself.
  if (!fill || !pct || stillness()) return resolve();

  let progress = 0;

  const tick = setInterval(() => {
    progress = Math.min(100, progress + Math.floor(Math.random() * 15) + 5);

    fill.style.setProperty('--v', `${progress}%`);
    pct.textContent = `${progress}%`;
    track?.setAttribute('aria-valuenow', String(progress));

    if (status) {
      status.textContent = progress === 100
        ? 'Ready'
        : STEPS[Math.min(STEPS.length - 1, Math.floor(progress / 34))];
    }

    if (progress < 100) return;

    clearInterval(tick);
    setTimeout(resolve, 300);   // a beat at full, so the bar reads as finished
  }, 100);
});

/**
 * Lift the cover and take it out of the document.
 *
 * Every path out of boot has to reach this, the failed one included — a
 * cover that never lifts is a blank site.
 */
export const dropCover = () => {
  const cover = $('#loader');
  if (!cover) return;

  cover.classList.add('is-gone');
  setTimeout(() => cover.remove(), 500);   // matches the transition in CSS
};
