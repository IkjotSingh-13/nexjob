/**
 * The slide-out menu on small screens.
 *
 * It is always in the page; the "is-open" class slides it in. While closed it
 * is `inert`, so the keyboard and screen readers skip it.
 */

import { useEffect, useRef } from 'react';
import { getSaved, applicationsFor } from '../lib/store.js';
import Icon from './Icon.jsx';
import { NAV, signOutAndLeave } from './Header.jsx';

/** Keep Tab inside the open menu: past the last item goes back to the first. */
const trapFocus = (event, panel) => {
  const items = panel.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
  const first = items[0];
  const last = items[items.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

export default function Drawer({ page, user, theme, onToggleTheme, open, onClose }) {
  const panel = useRef(null);
  const closeButton = useRef(null);

  /* While open: focus the close button, stop the page scrolling, listen for
     Escape and Tab. On close: put focus back where it was. */
  useEffect(() => {
    if (!open) return;

    const lastFocused = document.activeElement;
    closeButton.current.focus();
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') trapFocus(event, panel.current);
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lastFocused?.focus();
    };
  }, [open]);

  /* Read fresh every time the menu draws, so the counts are never stale. */
  const savedCount = getSaved().length;
  const applicationCount = user ? applicationsFor(user.id).length : 0;
  const employer = user?.role === 'employer';
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <div className={open ? 'scrim is-open' : 'scrim'} style={open ? undefined : { pointerEvents: 'none' }}
           onClick={onClose} />

      <aside className={open ? 'drawer is-open' : 'drawer'} id="drawer" aria-label="Menu" inert={!open} ref={panel}>
        <div className="drawer-top">
          <span className="brand">
            <span className="brand-mark"><Icon name="scale" size={15} /></span>
            <span className="brand-name">Nexjob</span>
          </span>
          <button type="button" className="ibtn" aria-label="Close menu" onClick={onClose} ref={closeButton}>
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="drawer-body">
          <div>
            {user ? (
              <div className="row" style={{ gap: 'var(--s3)' }}>
                <span className="avatar" style={{ background: user.avatarBg }}>{user.initials}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{user.name}</p>
                  <p className="tick">{employer ? 'Employer' : 'Job seeker'}</p>
                </div>
              </div>
            ) : (
              <a className="btn btn--primary btn--block" href="./auth.html">Sign in</a>
            )}
          </div>

          <div className="drawer-group">
            <p className="tick">Browse</p>
            {NAV.map((item) => (
              <a className="drawer-link" href={item.href} key={item.page}
                 aria-current={item.page === page ? 'page' : undefined}>{item.label}</a>
            ))}
          </div>

          <div className="drawer-group">
            <p className="tick">{employer ? 'Hiring' : 'For you'}</p>
            {employer ? (
              <>
                <a className="drawer-link" href="./employer.html">Employer dashboard</a>
                <a className="drawer-link" href="./post-job.html">Post a role</a>
              </>
            ) : (
              <>
                <a className="drawer-link" href="./dashboard.html">Dashboard</a>
                <a className="drawer-link" href="./dashboard.html#saved">
                  Saved roles <span className="pill" hidden={savedCount === 0}>{savedCount}</span>
                </a>
                <a className="drawer-link" href="./dashboard.html#applications">
                  Applications <span className="pill" hidden={applicationCount === 0}>{applicationCount}</span>
                </a>
                <a className="drawer-link" href="./profile.html">Profile and CV</a>
              </>
            )}
          </div>

          <div className="drawer-group">
            <p className="tick">Display</p>
            <button type="button" className="drawer-link" aria-label={`Switch to ${next} theme`}
                    title={`Switch to ${next} theme`} onClick={onToggleTheme}>
              <span>Switch to {next}</span>
              <span hidden={theme !== 'dark'}><Icon name="sun" size={15} /></span>
              <span hidden={theme === 'dark'}><Icon name="moon" size={15} /></span>
            </button>
          </div>

          {user
            ? <button type="button" className="btn btn--outline btn--block" onClick={signOutAndLeave}>Sign out</button>
            : <a className="btn btn--primary btn--block" href="./auth.html">Sign in or create account</a>}
        </div>
      </aside>
    </>
  );
}
