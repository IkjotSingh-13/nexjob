/**
 * The loading screen on the home page.
 *
 * Shown only on the first visit in a browser session. The bar fills in random
 * steps, and the cover lifts once the bar is full AND the data has loaded
 * (or straight away if loading failed, so the page is never left blank).
 */

import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const BOOTED = 'nexjob:v2:booted';   // sessionStorage: cleared when the tab closes

/* sessionStorage is like localStorage, but it is emptied when the tab closes. */
const alreadyBooted = () => {
  try {
    return sessionStorage.getItem(BOOTED) !== null;
  } catch {
    return false;
  }
};

const markBooted = () => {
  try {
    sessionStorage.setItem(BOOTED, '1');
  } catch {
    /* ignore */
  }
};

/** The words under the bar: one step for each third of the bar, then "Ready". */
const statusFor = (progress) => {
  if (progress === 100) return 'Ready';
  if (progress < 34) return STEPS[0];
  if (progress < 68) return STEPS[1];
  return STEPS[2];
};

const STEPS = ['Reading listings', 'Placing salaries on the scale', 'Sorting by band'];

export default function BootCover({ loaded, failed }) {
  const [firstVisit] = useState(() => !alreadyBooted());
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [progress, setProgress] = useState(0);
  const [barDone, setBarDone] = useState(still);   // no animation wanted: don't wait for the bar
  const [removed, setRemoved] = useState(false);

  /* Every 100 ms, move the bar on by 5–19 %. At 100 %, hold for a moment. */
  useEffect(() => {
    if (!firstVisit || still) return;

    if (progress < 100) {
      const tick = setTimeout(() => {
        const step = 5 + Math.floor(Math.random() * 15);   // a random step from 5 to 19
        setProgress(Math.min(100, progress + step));       // never past 100
      }, 100);
      return () => clearTimeout(tick);
    }

    const hold = setTimeout(() => setBarDone(true), 300);
    return () => clearTimeout(hold);
  }, [progress]);

  /* Fade out, then remove. Remember this visit has seen it. */
  const lift = failed || (loaded && barDone);

  useEffect(() => {
    if (!lift) return;
    markBooted();
    const timer = setTimeout(() => setRemoved(true), 500);   // matches the CSS fade
    return () => clearTimeout(timer);
  }, [lift]);

  if (!firstVisit || removed) return null;

  const status = statusFor(progress);

  return (
    <div className={lift ? 'loader is-gone' : 'loader'}>
      <div className="card loader-card">
        <div className="loader-head">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true"><Icon name="scale" size={15} /></span>
            <span className="brand-name">Nexjob</span>
          </span>
          <p className="loader-note">Drawing every open salary band on one scale.</p>
        </div>

        <div className="loader-bar">
          <div className="meter meter--load" role="progressbar" aria-valuemin="0" aria-valuemax="100"
               aria-valuenow={progress} aria-label="Loading the board">
            <div className="meter-fill" style={{ '--v': `${progress}%` }} />
          </div>
          <p className="loader-read">
            <span className="tick">{status}</span>
            <span className="figure">{progress}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}
