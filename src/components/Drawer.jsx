import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useApplicationsFor, useSavedIds } from '../hooks/useStore.js';
import { Icon } from './Icon.jsx';
import { NAV } from './nav.js';

const EXIT_MS = 220;   /* matches the transition in layout.css */

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

function DrawerAccount({ user }) {
  if (!user) return <Link className="btn btn--primary btn--block" to="/auth">Sign in</Link>;

  return (
    <div className="row" style={{ gap: 'var(--s3)' }}>
      <span className="avatar" style={{ background: user.avatarBg }}>{user.initials}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{user.name}</p>
        <p className="tick">{user.role === 'employer' ? 'Employer' : 'Job seeker'}</p>
      </div>
    </div>
  );
}

/**
 * The slide-in menu.
 *
 * Stays out of the document (`hidden`) until opened, then gets its `is-open`
 * class a frame later so the CSS transition has somewhere to start from. On
 * the way out the class goes first and the element leaves after the
 * transition. While open it traps Tab, closes on Escape, locks page scroll and
 * hands focus back to whatever opened it.
 */
export function Drawer({ open, onClose }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const savedCount = useSavedIds().length;
  const applicationCount = useApplicationsFor(user?.id).length;

  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const returnTo = useRef(null);

  /* Mount as soon as asked to open. Adjusting state while rendering is the
     sanctioned way to derive it from a prop. */
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      /* Reading the layout once before the class lands gives the transition a
         computed starting style; without it the drawer would just appear. */
      const frame = requestAnimationFrame(() => {
        drawerRef.current?.getBoundingClientRect();
        setEntered(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    const timer = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  /* Focus, scroll lock and the keyboard, only while open. */
  useEffect(() => {
    if (!open) return undefined;

    returnTo.current = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll(FOCUSABLE));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      returnTo.current?.focus?.();
    };
  }, [open, onClose]);

  const employer = user?.role === 'employer';
  const next = theme === 'dark' ? 'light' : 'dark';
  const shown = open && entered;

  return (
    <>
      <div className={`scrim${shown ? ' is-open' : ''}`} hidden={!mounted} onClick={onClose} />

      <aside className={`drawer${shown ? ' is-open' : ''}`} id="drawer" aria-label="Menu"
             hidden={!mounted} ref={drawerRef}>
        <div className="drawer-top">
          <span className="brand">
            <span className="brand-mark"><Icon name="scale" size={15} /></span>
            <span className="brand-name">Nexjob</span>
          </span>
          <button type="button" className="ibtn" ref={closeRef} onClick={onClose} aria-label="Close menu">
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="drawer-body">
          <div><DrawerAccount user={user} /></div>

          <div className="drawer-group">
            <p className="tick">Browse</p>
            {NAV.map((item) => (
              <NavLink key={item.to} className="drawer-link" to={item.to} end>{item.label}</NavLink>
            ))}
          </div>

          <div className="drawer-group">
            <p className="tick">{employer ? 'Hiring' : 'For you'}</p>

            {employer ? (
              <>
                <Link className="drawer-link" to="/employer">Employer dashboard</Link>
                <Link className="drawer-link" to="/post-job">Post a role</Link>
              </>
            ) : (
              <>
                <Link className="drawer-link" to="/dashboard">Dashboard</Link>
                <Link className="drawer-link" to="/dashboard#saved">
                  Saved roles <span className="pill" hidden={savedCount === 0}>{savedCount}</span>
                </Link>
                <Link className="drawer-link" to="/dashboard#applications">
                  Applications <span className="pill" hidden={applicationCount === 0}>{applicationCount}</span>
                </Link>
                <Link className="drawer-link" to="/profile">Profile and CV</Link>
              </>
            )}
          </div>

          <div className="drawer-group">
            <p className="tick">Display</p>
            <button type="button" className="drawer-link" onClick={toggle}>
              <span>Switch to {next}</span>
              <span hidden={theme !== 'dark'}><Icon name="sun" size={15} /></span>
              <span hidden={theme === 'dark'}><Icon name="moon" size={15} /></span>
            </button>
          </div>

          {user ? (
            <button type="button" className="btn btn--outline btn--block" onClick={() => { signOut(); }}>
              Sign out
            </button>
          ) : (
            <Link className="btn btn--primary btn--block" to="/auth">Sign in or create account</Link>
          )}
        </div>
      </aside>
    </>
  );
}
