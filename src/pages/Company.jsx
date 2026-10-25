/**
 * One company.
 *
 * Its profile, its pay band against the whole board, its open roles, and a
 * link through to what it takes to get hired there.
 */

import { Link, useParams } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { companyById, jobsAtCompany, prepFor, sortJobs } from '../lib/jobs.js';
import { money, median, plural } from '../lib/format.js';
import { link } from '../lib/url.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { JobCard } from '../components/JobCard.jsx';
import { PayScale, PayAxis } from '../components/PayScale.jsx';
import { LoadError } from '../components/LoadError.jsx';

const DESCRIPTION = 'A company profile with its open roles, pay bands and hiring route.';

function Wrapper({ children }) {
  return (
    <>
      <div className="wrap" style={{ paddingTop: 'var(--s5)' }}>
        <Link className="tick" to="/companies" style={{ textDecoration: 'none' }}>&larr; All companies</Link>
      </div>

      <section className="strip strip--tight" style={{ paddingTop: 'var(--s4)' }}>
        <div className="wrap" id="co-root">{children}</div>
      </section>
    </>
  );
}

export default function Company() {
  const { id } = useParams();
  const { status, error, reload, jobs, companies, prep, domain } = useBoard();

  const company = status === 'ready' ? companyById(companies, id) : undefined;
  usePageMeta(company ? `${company.name} — Nexjob` : 'Company — Nexjob', DESCRIPTION);

  if (status === 'loading') return <Wrapper><div className="skeleton" style={{ height: 220 }} /></Wrapper>;

  if (status === 'error') {
    return <Wrapper><LoadError title="The company did not load" error={error} onRetry={reload} /></Wrapper>;
  }

  if (!company) {
    return (
      <Wrapper>
        <div className="empty">
          <h3>No such company</h3>
          <p>That link does not match any company hiring here.</p>
          <Link className="btn btn--primary" to="/companies">See every company</Link>
        </div>
      </Wrapper>
    );
  }

  const open = sortJobs(jobsAtCompany(jobs, company.id), 'newest');
  const route = prepFor(prep, company.id);

  const min = open.length ? Math.min(...open.map((j) => j.salaryMin)) : 0;
  const max = open.length ? Math.max(...open.map((j) => j.salaryMax)) : 0;
  const mid = open.length ? median(open.map((j) => j.salaryMid)) : 0;
  const boardMid = median(jobs.map((j) => j.salaryMid));

  return (
    <Wrapper>
      <div className="card">
        <div className="co-hero">
          <span className="mark mark--lg" aria-hidden="true"
                style={{ background: company.brandBg, color: company.brandFg }}>
            {company.initial}
          </span>

          <div style={{ minWidth: 0, flex: '1 1 280px' }}>
            <h1>{company.name}</h1>
            <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>{company.tagline || ''}</p>
          </div>

          <div className="row row--tight">
            {open.length > 0 && (
              <Link className="btn btn--primary btn--sm" to={link('/jobs', { company: company.id })}>
                {plural(open.length, 'open role')}
              </Link>
            )}
            {route && (
              <Link className="btn btn--outline btn--sm" to={link('/prep', { company: company.id })}>
                How to get in
              </Link>
            )}
          </div>
        </div>

        <dl className="co-facts" style={{ marginTop: 'var(--s7)' }}>
          <div className="co-fact"><dt className="tick">Industry</dt><dd className="co-fact-value">{company.industry}</dd></div>
          <div className="co-fact"><dt className="tick">Size</dt><dd className="co-fact-value">{company.size}</dd></div>
          <div className="co-fact"><dt className="tick">Base</dt><dd className="co-fact-value">{company.hq}</dd></div>
          <div className="co-fact"><dt className="tick">Founded</dt><dd className="co-fact-value">{company.founded}</dd></div>
        </dl>
      </div>

      {open.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--s4)' }}>
          <div className="sec-head" style={{ marginBottom: 'var(--s4)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--t-lg)' }}>What {company.name} pays</h2>
              <p>Floor to ceiling across {plural(open.length, 'open role')}, on the board's scale.</p>
            </div>
            <span className="figure">{money(min)} – {money(max)}</span>
          </div>

          <PayScale
            min={min} max={max} domain={domain} size="lg" mark={mid}
            label={`${company.name} pays ${money(min)} to ${money(max)}, midpoint ${money(mid)}`}
          />
          <PayAxis domain={domain} />

          <p className="tick" style={{ marginTop: 'var(--s4)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-2)' }}>
            Midpoint {money(mid)} —{' '}
            <span style={{ color: mid >= boardMid ? 'var(--ok)' : 'var(--warn)' }}>
              {money(Math.abs(mid - boardMid))} {mid >= boardMid ? 'above' : 'below'}
            </span>{' '}
            the board midpoint of {money(boardMid)}.
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--s4)' }}>
        <div className="detail-block">
          <h2>About</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>{company.about}</p>
        </div>

        {(company.perks || []).length > 0 && (
          <div className="detail-block">
            <h2>What they offer</h2>
            <ul className="bullets">{company.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul>
          </div>
        )}

        {company.site && (
          <div className="detail-block">
            <h2>Elsewhere</h2>
            <p><a href={`https://${company.site}`} rel="noopener noreferrer" target="_blank">{company.site}</a></p>
          </div>
        )}
      </div>

      <section style={{ marginTop: 'var(--s8)' }} aria-labelledby="co-roles">
        <div className="sec-head">
          <div>
            <h2 id="co-roles">Open roles</h2>
            <p>{open.length ? plural(open.length, 'role') : 'Nothing open right now'}</p>
          </div>
        </div>

        <div className="stack">
          {open.length ? open.map((job, i) => (
            <JobCard key={job.id} job={job} index={i + 1} domain={domain} />
          )) : (
            <div className="empty">
              <h3>No open roles at {company.name}</h3>
              <p>Set up an alert and you will see the next one on your dashboard.</p>
              <Link className="btn btn--outline" to="/dashboard#alerts">Create an alert</Link>
            </div>
          )}
        </div>
      </section>
    </Wrapper>
  );
}
