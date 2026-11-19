import { useEffect, useState } from 'react';
import { signOut } from '../lib/auth.js';
import Icon from './Icon.jsx';

/** The four main sections, shared by the header and the mobile menu. */
export const NAV = [
  { page: 'jobs',      href: './jobs.html',      label: 'Jobs' },
  { page: 'companies', href: './companies.html', label: 'Companies' },
  { page: 'prep',      href: './prep.html',      label: 'Get in' },
  { page: 'salaries',  href: './salaries.html',  label: 'Pay' }
];

export const signOutAndLeave = () => {
  signOut();
  location.href = './index.html';
};

export default function Header({ page, user, theme, onToggleTheme, drawerOpen, onOpenDrawer }) {
  const themeLabel = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;

  return (
    <header className="mast">
      <div className="wrap mast-in">
        <a className="brand" href="./index.html">
          <span className="brand-mark" aria-hidden="true"><Icon name="scale" size={15} /></span>
          <span className="brand-name">Nexjob</span>
        </a>

        <nav className="mast-nav" aria-label="Primary">
          <ul>
            {NAV.map((item) => (
              <li key={item.page}>
                <a className="mast-link" href={item.href} aria-current={item.page === page ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mast-side">
          <button type="button" className="ibtn" aria-label={themeLabel} title={themeLabel} onClick={onToggleTheme}>
            <span hidden={theme !== 'dark'}><Icon name="sun" size={17} /></span>
            <span hidden={theme === 'dark'}><Icon name="moon" size={17} /></span>
          </button>

          <div><AccountMenu user={user} /></div>

          <a className="btn btn--primary btn--sm only-wide" href="./post-job.html">Post a role</a>

          <button type="button" className="ibtn mast-burger" aria-expanded={drawerOpen} aria-controls="drawer"
                  aria-label="Open menu" onClick={onOpenDrawer}>
            <Icon name="menu" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

/** The avatar button and its dropdown, or a "Sign in" link. */
function AccountMenu({ user }) {
  const [open, setOpen] = useState(false);

  /* Close when clicking anywhere else, or pressing Escape. */
  useEffect(() => {
    if (!open) return;
    const onClick = (event) => {
      if (!event.target.closest('.account')) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return <a className="btn btn--ghost btn--sm" href="./auth.html">Sign in</a>;

  const employer = user.role === 'employer';

  return (
    <div className="account">
      <button type="button" className="ibtn" aria-expanded={open} aria-haspopup="true" aria-label="Account menu"
              onClick={() => setOpen(!open)}>
        <span className="avatar" style={{ background: user.avatarBg }}>{user.initials}</span>
      </button>

      <div className="account-menu" hidden={!open}>
        <div className="account-who">
          <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{user.name}</p>
          <p className="tick" style={{ marginTop: 2 }}>{user.email}</p>
        </div>

        {employer ? (
          <>
            <a href="./employer.html">Employer dashboard</a>
            <a href="./post-job.html">Post a role</a>
          </>
        ) : (
          <>
            <a href="./dashboard.html">Your dashboard</a>
            <a href="./profile.html">Profile and CV</a>
            <a href="./dashboard.html#saved">Saved roles</a>
          </>
        )}

        <button type="button" onClick={signOutAndLeave}>Sign out</button>
      </div>
    </div>
  );
}
