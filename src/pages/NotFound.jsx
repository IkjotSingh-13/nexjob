/** 404: a page that does not exist, with links to the ones that do. */

import { Link } from 'react-router';

const PLACES = [
  ['/jobs', 'Jobs', 'Search and filter every open role by pay, level and location.'],
  ['/companies', 'Companies', 'Who is hiring, what they pay, and what they are like.'],
  ['/prep', 'Get in', 'The interview loop and current intakes for each company.'],
  ['/salaries', 'Pay', 'Compare bands across disciplines and check your own number.'],
  ['/dashboard', 'Your dashboard', 'Applications, saved roles, alerts and matches.'],
  ['/post-job', 'Post a role', 'For employers, in three steps with a live preview.']
];

export default function NotFound() {
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
        {PLACES.map(([path, name, about]) => (
          <Link className="card co-card" to={path} key={path}>
            <p className="co-card-name">{name}</p>
            <p className="co-card-about">{about}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
