import { useEffect, useState } from 'react';
import { loadSeed } from '../services/api.js';
import { coverStatus, markBooted, runCover } from '../lib/cover.js';
import { Icon } from './Icon.jsx';

/**
 * The boot cover.
 *
 * A full-bleed panel that holds the first paint until the page has its data,
 * so the first thing anyone sees is a finished board rather than a frame of
 * empty scales. Rendered by the home page on the first load of a visit and no
 * other.
 *
 * It lifts when two promises have both settled: the bar reaching 100, and the
 * board's data. `allSettled` rather than `all` is deliberate — a cover that
 * never lifts is a blank site, so a failed load must lift it too and let the
 * page show its error.
 *
 * If this component never runs, the failsafe animation in components.css lifts
 * the cover anyway after eight seconds.
 */
export function BootCover() {
  const [progress, setProgress] = useState(0);
  const [gone, setGone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    let live = true;
    const bar = runCover(setProgress);

    Promise.allSettled([loadSeed(), bar.done]).then(() => {
      if (!live) return;

      /* Reaching here at all, finished board or error card, means the wait is
         behind us. A boot that never finishes never marks, so a load that
         genuinely hung still gets its cover next time. */
      markBooted();
      setGone(true);
    });

    return () => {
      live = false;
      bar.cancel();
    };
  }, []);

  /* Take it out of the document once the fade is over, so its progressbar
     leaves the accessibility tree too. */
  useEffect(() => {
    if (!gone) return undefined;

    const timer = setTimeout(() => setRemoved(true), 500);   // matches the transition in CSS
    return () => clearTimeout(timer);
  }, [gone]);

  if (removed) return null;

  return (
    <div className={`loader${gone ? ' is-gone' : ''}`} id="loader">
      <div className="card loader-card">
        <div className="loader-head">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true"><Icon name="scale" size={15} /></span>
            <span className="brand-name">Nexjob</span>
          </span>
          <p className="loader-note">Drawing every open salary band on one scale.</p>
        </div>

        <div className="loader-bar">
          <div className="meter meter--load" role="progressbar" aria-valuemin={0} aria-valuemax={100}
               aria-valuenow={progress} aria-label="Loading the board">
            <div className="meter-fill" style={{ '--v': `${progress}%` }} />
          </div>
          <p className="loader-read">
            <span className="tick">{coverStatus(progress)}</span>
            <span className="figure">{progress}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}
