import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Icon from './Icon.jsx';

/** The four main sections, shared by the header and the mobile menu. */
export const NAV = [
  { page: 'jobs',      to: '/jobs',      label: 'Jobs' },
  { page: 'companies', to: '/companies', label: 'Companies' },
  { page: 'prep',      to: '/prep',      label: 'Get in' },
  { page: 'salaries',  to: '/salaries',  label: 'Pay' }
];

export default function Header({ page, user, theme, onToggleTheme, onSignOut, drawerOpen, onOpenDrawer }) {
  const themeLabel = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;

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
              <li key={item.page}>
                <Link className="mast-link" to={item.to} aria-current={item.page === page ? 'page' : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mast-side">
          <button type="button" className="ibtn" aria-label={themeLabel} title={themeLabel} onClick={onToggleTheme}>
            <span hidden={theme !== 'dark'}><Icon name="sun" size={17} /></span>
            <span hidden={theme === 'dark'}><Icon name="moon" size={17} /></span>
          </button>

          <div><AccountMenu user={user} onSignOut={onSignOut} /></div>

          <Link className="btn btn--primary btn--sm only-wide" to="/post-job">Post a role</Link>

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
function AccountMenu({ user, onSignOut }) {
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

  if (!user) return <Link className="btn btn--ghost btn--sm" to="/auth">Sign in</Link>;

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
            <Link to="/employer">Employer dashboard</Link>
            <Link to="/post-job">Post a role</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard">Your dashboard</Link>
            <Link to="/profile">Profile and CV</Link>
            <Link to="/dashboard#saved">Saved roles</Link>
          </>
        )}

        <button type="button" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
