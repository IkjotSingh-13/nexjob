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
 * It covers one wait, and only one: the first. After a visit has been
 * through boot once the data sits in the browser cache, so every later
 * arrival here — the back button off a tab, the brand mark, a reload — has
 * nothing to wait for and gets no cover at all.
 *
 * Nothing on the page depends on this module. If it never runs — modules are
 * blocked over file://, for one — the failsafe animation in components.css
 * lifts the cover without it.
 */

import { $ } from './dom.js';

/* Per visit, not per device: a genuinely new session still has a cold cache
   and a real wait to cover. Shares the namespace with everything else stored
   here, and read by the same name in the home page's <head>, where it has
   to be known before anything is painted. */
const BOOTED = 'nexjob:v2:booted';

/** Has this visit already been all the way through boot once? */
const booted = () => {
  try { return sessionStorage.getItem(BOOTED) !== null; } catch { return false; }
};

/* Private mode refuses the write, and the cover simply runs again — the
   same bargain the theme script makes in the page head. */
const markBooted = () => {
  try { sessionStorage.setItem(BOOTED, '1'); } catch { /* nothing to remember with */ }
};

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

  // No cover on the page, the viewer asked for no motion, or this visit has
  // already booted once and the panel is hidden: let the load set the timing
  // by itself rather than pace it against a bar nobody can see.
  if (!fill || !pct || stillness() || booted()) return resolve();

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
 * cover that never lifts is a blank site. Which makes it the one place to
 * record that the visit has booted: reaching here at all, error card or
 * finished board, means the wait is behind us and the next arrival at this
 * page should go straight to the content.
 *
 * A boot that never finishes never marks, so a load that genuinely hung
 * still gets its cover next time.
 */
export const dropCover = () => {
  markBooted();

  const cover = $('#loader');
  if (!cover) return;

  cover.classList.add('is-gone');
  setTimeout(() => cover.remove(), 500);   // matches the transition in CSS
};
