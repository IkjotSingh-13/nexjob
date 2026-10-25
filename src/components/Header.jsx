import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Icon } from './Icon.jsx';
import { NAV } from './nav.js';

/**
 * The account slot: a sign-in link, or an avatar that opens a small menu.
 *
 * The menu remembers the location it was opened on rather than a plain
 * boolean, so navigating anywhere closes it without an effect to say so.
 */
function AccountMenu() {
  const { user, signOut } = useAuth();
  const { key } = useLocation();
  const [openKey, setOpenKey] = useState(null);
  const rootRef = useRef(null);

  const open = openKey === key;

  useEffect(() => {
    if (!open) return undefined;

    const onClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpenKey(null);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenKey(null);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return <Link className="btn btn--ghost btn--sm" to="/auth">Sign in</Link>;
  }

  const employer = user.role === 'employer';

  return (
    <div className="account" ref={rootRef}>
      <button type="button" className="ibtn" aria-expanded={open} aria-haspopup="true"
              aria-label="Account menu" onClick={() => setOpenKey(open ? null : key)}>
        <span className="avatar" style={{ background: user.avatarBg }}>{user.initials}</span>
      </button>

      <div className="account-menu" hidden={!open}>
        <div className="account-who">
          <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{user.name}</p>
          <p className="tick" style={{ marginTop: 2 }}>{user.email}</p>
        </div>

        <Link to={employer ? '/employer' : '/dashboard'}>
          {employer ? 'Employer dashboard' : 'Your dashboard'}
        </Link>

        {employer ? (
          <Link to="/post-job">Post a role</Link>
        ) : (
          <>
            <Link to="/profile">Profile and CV</Link>
            <Link to="/dashboard#saved">Saved roles</Link>
          </>
        )}

        <button type="button" onClick={() => { signOut(); }}>Sign out</button>
      </div>
    </div>
  );
}

export function Header({ drawerOpen, onOpenDrawer }) {
  const { theme, toggle } = useTheme();
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;

  return (
    <header className="mast">
      <div className="wrap mast-in">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true"><Icon name="scale" size={15} /></span>
          <span className="brand-name">Nexjob</span>
        </Link>

        <nav className="mast-nav" aria-label="Primary">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink className="mast-link" to={item.to} end>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mast-side">
          <button type="button" className="ibtn" onClick={toggle} aria-label={label} title={label}>
            <span hidden={theme !== 'dark'}><Icon name="sun" size={17} /></span>
            <span hidden={theme === 'dark'}><Icon name="moon" size={17} /></span>
          </button>

          <div><AccountMenu /></div>

          <Link className="btn btn--primary btn--sm only-wide" to="/post-job">Post a role</Link>

          <button type="button" className="ibtn mast-burger" aria-expanded={drawerOpen}
                  aria-controls="drawer" aria-label="Open menu" onClick={onOpenDrawer}>
            <Icon name="menu" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
