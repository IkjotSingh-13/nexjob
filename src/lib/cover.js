/**
 * The boot cover's bookkeeping.
 *
 * The bar reports a pace, not a measurement — the data is one request, and one
 * request has no percentage. So it is drawn with the same grammar as every
 * other meter here and left to be what it is: a sense of progress that always
 * lands on 100 before the cover lifts.
 *
 * It covers one wait, and only one: the first of a visit. After that the data
 * sits in the browser cache, so every later arrival at the home page gets no
 * cover at all.
 */

/* Per visit, not per device: a genuinely new session still has a cold cache
   and a real wait to cover. */
const BOOTED = 'nexjob:v2:booted';

/** Has this visit already been all the way through boot once? */
export const hasBooted = () => {
  try { return sessionStorage.getItem(BOOTED) !== null; } catch { return false; }
};

/* Private mode refuses the write, and the cover simply runs again. */
export const markBooted = () => {
  try { sessionStorage.setItem(BOOTED, '1'); } catch { /* nothing to remember with */ }
};

/** Roughly one line per third of the bar. */
export const COVER_STEPS = [
  'Reading listings',
  'Placing salaries on the scale',
  'Sorting by band'
];

export const coverStatus = (progress) => (progress >= 100
  ? 'Ready'
  : COVER_STEPS[Math.min(COVER_STEPS.length - 1, Math.floor(progress / 34))]);

const stillness = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Run the bar to full.
 *
 * `done` resolves when it lands on 100, so it can be raced against the real
 * load with Promise.allSettled and whichever takes longer sets the pace.
 * Viewers who asked for no motion get a bar that is already finished, and the
 * load alone sets the timing.
 *
 * @param {(progress:number) => void} onTick
 * @returns {{done: Promise<void>, cancel: () => void}}
 */
export const runCover = (onTick) => {
  let timer;
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });

  if (stillness()) {
    finish();
    return { done, cancel: () => {} };
  }

  let progress = 0;

  timer = setInterval(() => {
    progress = Math.min(100, progress + Math.floor(Math.random() * 15) + 5);
    onTick(progress);

    if (progress < 100) return;

    clearInterval(timer);
    setTimeout(finish, 300);   // a beat at full, so the bar reads as finished
  }, 100);

  return { done, cancel: () => clearInterval(timer) };
};
