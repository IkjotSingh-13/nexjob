/**
 * 404.
 *
 * Nothing to load — the shell is the whole page.
 */

import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta.js';

const ROUTES = [
  { to: '/jobs',      name: 'Jobs',           about: 'Search and filter every open role by pay, level and location.' },
  { to: '/companies', name: 'Companies',      about: 'Who is hiring, what they pay, and what they are like.' },
  { to: '/prep',      name: 'Get in',         about: 'The interview loop and current intakes for each company.' },
  { to: '/salaries',  name: 'Pay',            about: 'Compare bands across disciplines and check your own number.' },
  { to: '/dashboard', name: 'Your dashboard', about: 'Applications, saved roles, alerts and matches.' },
  { to: '/post-job',  name: 'Post a role',    about: 'For employers, in three steps with a live preview.' }
];

export default function NotFound() {
  usePageMeta('Page not found — Nexjob', 'That page does not exist on Nexjob.');

  return (
    <div className="wrap lost">
      <p className="tick tick--flag">404</p>

      <h1 className="display display--hero" style={{ marginTop: 'var(--s5)' }}>Off the scale.</h1>

      <p>
        That page is not on the board. It may have been closed, or the link may have been
        typed wrong. Here is where everything actually lives.
      </p>

      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s2)' }}>
        <Link className="btn btn--primary btn--lg" to="/jobs">Browse open roles</Link>
        <Link className="btn btn--outline btn--lg" to="/">Back to the home page</Link>
      </div>

      <div className="grid-cards" style={{ marginTop: 'var(--s10)', textAlign: 'left' }}>
        {ROUTES.map((route) => (
          <Link key={route.to} className="card co-card" to={route.to}>
            <p className="co-card-name">{route.name}</p>
            <p className="co-card-about">{route.about}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
