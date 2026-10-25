/**
 * Home.
 *
 * Everything on this page is counted from the listings themselves. No figure
 * is written into the markup by hand, so the page cannot go stale.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { sortJobs } from '../lib/jobs.js';
import { link } from '../lib/url.js';
import { money, median, plural, posOn } from '../lib/format.js';
import { hasBooted } from '../lib/cover.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { BootCover } from '../components/BootCover.jsx';
import { JobCard, Skeletons } from '../components/JobCard.jsx';
import { PayScaleRow, PayAxis } from '../components/PayScale.jsx';
import { LoadError } from '../components/LoadError.jsx';
import { Icon } from '../components/Icon.jsx';

const TERMS = ['React', 'Python', 'Design systems', 'Remote'];

const HOW = [
  {
    title: 'Compare before you apply',
    detail: 'Filter by pay on a ruler rather than a dropdown, and see every band against the same domain. A role paying under the market shows it immediately.'
  },
  {
    title: 'Check what it takes to get in',
    detail: 'Each company has a page covering its interview loop stage by stage, what the rounds actually weight, and the internships and assessments it runs.',
    more: { to: '/prep', label: 'See the routes' }
  },
  {
    title: 'Apply, and watch the pipeline',
    detail: 'Every application you send sits on a track — applied, screening, interview, offer — so you always know which ones are still moving.'
  },
  {
    title: 'Let the board come to you',
    detail: 'Fill in your profile once and the dashboard scores new roles against your skills, with the reasons shown rather than hidden.'
  }
];

function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([label, figure, note]) => (
        <div key={label} className="stat">
          <span className="tick">{label}</span>
          <span className="stat-figure">{figure}</span>
          <span className="tick" style={{ textTransform: 'none', letterSpacing: 0 }}>{note}</span>
        </div>
      ))}
    </div>
  );
}

function PrepTeaser({ entry, company }) {
  const openNow = entry.openings.filter((o) => o.status === 'open').length;

  return (
    <Link className="card prep-teaser" to={link('/prep', { company: entry.companyId })}>
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <span className="mark" aria-hidden="true" style={{ background: company.brandBg, color: company.brandFg }}>
          {company.initial}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600 }}>{company.name}</p>
          <p className="tick">{entry.loopWeeks} weeks, {entry.stages.length} stages</p>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s4)' }}>
        <div className="row row--split" style={{ marginBottom: 5 }}>
          <span className="tick">Hiring bar</span>
          <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{entry.bar}/100</span>
        </div>
        <div className="meter"><div className="meter-fill" style={{ '--v': `${entry.bar}%` }} /></div>
      </div>

      <p className="prep-teaser-note">{entry.focus[0].topic} carries the most weight.</p>

      {openNow
        ? <span className="pill pill--flag pill--dot">{plural(openNow, 'intake')} open</span>
        : <span className="pill">No open intake</span>}
    </Link>
  );
}

export default function Home() {
  usePageMeta(
    'Nexjob — every salary on one scale',
    'A job board for engineering, design, product and data roles that draws every salary band on the same scale, so you can see where a role really sits before you apply.'
  );

  const navigate = useNavigate();
  const { status, error, reload, jobs, companies, prep, domain } = useBoard();
  const ready = status === 'ready';

  /* Decided once, on the first render: the cover belongs to the first load of
     a visit, and BootCover marks the visit as booted when it lifts. */
  const [showCover] = useState(() => !hasBooted());

  const [q, setQ] = useState('');
  const [where, setWhere] = useState('');

  const onSearch = (event) => {
    event.preventDefault();
    navigate(link('/jobs', { q: q.trim(), where: where.trim() }));
  };

  /* ---------------------------------------------------------- Derived */

  const bySalary = ready ? [...jobs].sort((a, b) => a.salaryMid - b.salaryMid) : [];

  const remote = jobs.filter((j) => j.remote).length;
  const stats = ready ? [
    ['Open roles', jobs.length, 'across the board'],
    ['Companies', companies.length, 'currently hiring'],
    ['Remote', `${Math.round((remote / jobs.length) * 100)}%`, `${remote} of ${jobs.length} roles`],
    ['Median midpoint', money(median(jobs.map((j) => j.salaryMid))), 'base salary, USD']
  ] : [];

  const featured = ready ? sortJobs(jobs.filter((j) => j.featured), 'newest').slice(0, 3) : [];

  const disciplines = ready
    ? [...new Set(jobs.map((j) => j.discipline))]
      .map((name) => {
        const set = jobs.filter((j) => j.discipline === name);
        return {
          label: name,
          count: set.length,
          min: Math.min(...set.map((j) => j.salaryMin)),
          max: Math.max(...set.map((j) => j.salaryMax)),
          mid: median(set.map((j) => j.salaryMid))
        };
      })
      .sort((a, b) => b.mid - a.mid)
    : [];

  const hardest = ready ? [...prep].sort((a, b) => b.bar - a.bar).slice(0, 3) : [];

  const eyebrow = ready
    ? `${plural(jobs.length, 'open role')} · ${plural(companies.length, 'company', 'companies')} · sample data`
    : (status === 'error' ? 'The board did not load' : 'Loading the board…');

  const failed = status === 'error' && <LoadError title="The listings did not load" error={error} onRetry={reload} />;

  return (
    <>
      {showCover && <BootCover />}

      {/* ==================== Hero — the thesis, shown ==================== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="tick tick--flag">{eyebrow}</p>

            <h1 className="display display--hero">Every salary<br />on one scale.</h1>

            <p className="hero-lede">
              Most job boards print pay as a string and leave you to do the comparing.
              Nexjob draws every band on the same ruler, so one look tells you where a
              role really sits — before you spend an evening on the application.
            </p>

            <form className="hero-search" role="search" onSubmit={onSearch}>
              <div className="hero-search-field">
                <Icon name="search" />
                <label className="visually-hidden" htmlFor="hero-q">Role, skill or company</label>
                <input className="input" type="search" id="hero-q" name="q" placeholder="Role, skill or company"
                       autoComplete="off" value={q} onChange={(event) => setQ(event.target.value)} />
              </div>

              <div className="hero-search-field">
                <Icon name="pin" />
                <label className="visually-hidden" htmlFor="hero-where">Location</label>
                <input className="input" type="search" id="hero-where" name="where" placeholder="Location, or remote"
                       autoComplete="off" value={where} onChange={(event) => setWhere(event.target.value)} />
              </div>

              <button className="btn btn--primary" type="submit">Search</button>
            </form>

            <div className="row row--tight hero-quick">
              <span className="tick">Try</span>
              {TERMS.map((term) => (
                <button key={term} type="button" className="chip"
                        onClick={() => navigate(link('/jobs', { q: term }))}>
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* The whole board, drawn at once. Every line is a live listing. */}
          <figure className="spectrum" id="spectrum" aria-labelledby="spectrum-cap">
            <figcaption className="spectrum-head">
              <span className="tick tick--ink">The board, drawn to scale</span>
              <span className="tick" id="spectrum-cap">One line per open role</span>
            </figcaption>

            <div className="spectrum-rows" id="spectrum-rows">
              {bySalary.map((job, i) => (
                <Link key={job.id} className="spectrum-row" to={`/jobs/${job.id}`}
                      style={{
                        '--lo': `${posOn(job.salaryMin, domain).toFixed(2)}%`,
                        '--hi': `${posOn(job.salaryMax, domain).toFixed(2)}%`,
                        '--i': i
                      }}
                      title={`${job.title} at ${job.companyName} — ${money(job.salaryMin)} to ${money(job.salaryMax)}`}>
                  <span className="visually-hidden">
                    {job.title} at {job.companyName}, {money(job.salaryMin)} to {money(job.salaryMax)}
                  </span>
                </Link>
              ))}
            </div>

            <div id="spectrum-axis">{ready && <PayAxis domain={domain} count={4} />}</div>
          </figure>
        </div>
      </section>

      <div className="wrap"><div className="rule--major" /></div>

      {/* ==================== Figures ==================== */}
      <section className="strip strip--tight" aria-label="Board summary">
        <div className="wrap"><Stats items={stats} /></div>
      </section>

      {/* ==================== Featured ==================== */}
      <section className="strip" aria-labelledby="featured-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="featured-title">Worth a look</h2>
              <p>Roles the hiring team flagged, newest first.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/jobs">All roles</Link>
          </div>

          <div className="stack">
            {failed
              || (!ready && <Skeletons count={3} />)
              || (featured.length
                ? featured.map((job, i) => <JobCard key={job.id} job={job} index={i + 1} domain={domain} />)
                : <p className="tick">No featured roles right now.</p>)}
          </div>
        </div>
      </section>

      {/* ==================== Pay by discipline ==================== */}
      <section className="strip strip--panel" aria-labelledby="disc-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="disc-title">What each discipline pays</h2>
              <p>Floor to ceiling across every open role, on the same scale as the cards above.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/salaries">Open the pay explorer</Link>
          </div>

          <div className="stack">
            {disciplines.map((row) => <PayScaleRow key={row.label} row={row} domain={domain} />)}
          </div>
          <div style={{ marginTop: 'var(--s4)' }}>{ready && <PayAxis domain={domain} />}</div>
        </div>
      </section>

      {/* ==================== How it works — a real sequence ==================== */}
      <section className="strip" id="how" aria-labelledby="how-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="how-title">How Nexjob works</h2>
              <p>Four steps, in the order you actually do them.</p>
            </div>
          </div>

          <ol className="steps how-steps">
            {HOW.map((step) => (
              <li key={step.title} className="step">
                <div className="step-body">
                  <p className="step-title">{step.title}</p>
                  <p className="step-detail">
                    {step.detail}
                    {step.more && <>{' '}<Link to={step.more.to}>{step.more.label}</Link>.</>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ==================== Get in ==================== */}
      <section className="strip strip--panel" aria-labelledby="prep-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="prep-title">Know the route in</h2>
              <p>The loop, the focus areas and the current intake for each company hiring here.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/prep">All routes</Link>
          </div>

          <div className="grid-cards">
            {hardest.map((entry) => {
              const company = companies.find((c) => c.id === entry.companyId);
              return company ? <PrepTeaser key={entry.companyId} entry={entry} company={company} /> : null;
            })}
          </div>
        </div>
      </section>

      {/* ==================== Employers ==================== */}
      <section className="strip">
        <div className="wrap">
          <div className="cta">
            <div>
              <h2>Hiring?</h2>
              <p>
                Post a role with a real band on it. Listings without a salary range get
                skipped here, so we ask for one up front — then you get an applicant
                pipeline you can actually move people through.
              </p>
            </div>
            <div className="row">
              <Link className="btn btn--primary btn--lg" to="/post-job">Post a role</Link>
              <Link className="btn btn--outline btn--lg" to="/employer">Employer dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
