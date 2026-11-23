/**
 * One company: its profile, what it pays against the board, and its open roles.
 */

import { useEffect } from 'react';
import { useBoardData, useSaved } from '../lib/hooks.js';
import { companyById, jobsAtCompany, prepFor, sortJobs, payRange } from '../lib/data.js';
import { money, median, plural } from '../lib/format.js';
import { getParam } from '../lib/url.js';
import JobCard from '../components/JobCard.jsx';
import { PayScale, PayAxis, MidpointNote } from '../components/PayScale.jsx';
import Mark from '../components/Mark.jsx';
import LoadError from '../components/LoadError.jsx';
import { Link } from 'react-router';

export default function Company() {
  const { data, failed } = useBoardData();
  const [saved, toggleSave] = useSaved();
  const company = data ? companyById(data.companies, getParam('id')) : null;

  useEffect(() => {
    if (company) document.title = `${company.name} — Nexjob`;
  }, [company]);

  let content = <div className="skeleton" style={{ height: 220 }} />;

  if (failed) {
    content = <LoadError title="The company did not load" />;
  } else if (data && !company) {
    content = (
      <div className="empty">
        <h3>No such company</h3>
        <p>That link does not match any company hiring here.</p>
        <Link className="btn btn--primary" to="/companies">See every company</Link>
      </div>
    );
  } else if (company) {
    content = <CompanyDetails company={company} data={data} saved={saved} onSave={toggleSave} />;
  }

  return (
    <>
      <div className="wrap" style={{ paddingTop: 'var(--s5)' }}>
        <Link className="tick" to="/companies" style={{ textDecoration: 'none' }}>&larr; All companies</Link>
      </div>

      <section className="strip strip--tight" style={{ paddingTop: 'var(--s4)' }}>
        <div className="wrap">{content}</div>
      </section>
    </>
  );
}

function CompanyDetails({ company, data, saved, onSave }) {
  const open = sortJobs(jobsAtCompany(data.jobs, company.id), 'newest');
  const route = prepFor(data.prep, company.id);
  const { min, max } = payRange(open);
  const mid = open.length ? median(open.map((j) => j.salaryMid)) : 0;
  const boardMid = median(data.jobs.map((j) => j.salaryMid));

  return (
    <>
      <div className="card">
        <div className="co-hero">
          <Mark company={company} size="lg" />

          <div style={{ minWidth: 0, flex: '1 1 280px' }}>
            <h1>{company.name}</h1>
            <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>{company.tagline || ''}</p>
          </div>

          <div className="row row--tight">
            {open.length > 0 && (
              <Link className="btn btn--primary btn--sm" to={`/jobs?company=${company.id}`}>
                {plural(open.length, 'open role')}
              </Link>
            )}
            {route && <Link className="btn btn--outline btn--sm" to={`/prep?company=${company.id}`}>How to get in</Link>}
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

          <PayScale min={min} max={max} domain={data.domain} size="lg" mark={mid}
                    label={`${company.name} pays ${money(min)} to ${money(max)}, midpoint ${money(mid)}`} />
          <PayAxis domain={data.domain} />

          <p className="tick" style={{ marginTop: 'var(--s4)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-2)' }}>
            <MidpointNote mid={mid} boardMid={boardMid}>the board midpoint of {money(boardMid)}.</MidpointNote>
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--s4)' }}>
        <div className="detail-block">
          <h2>About</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>{company.about}</p>
        </div>

        {company.perks?.length > 0 && (
          <div className="detail-block">
            <h2>What they offer</h2>
            <ul className="bullets">{company.perks.map((perk, i) => <li key={i}>{perk}</li>)}</ul>
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
          {open.length > 0 ? open.map((job, i) => (
            <JobCard key={job.id} job={job} index={i + 1} domain={data.domain}
                     saved={saved.includes(Number(job.id))} onSave={onSave} />
          )) : (
            <div className="empty">
              <h3>No open roles at {company.name}</h3>
              <p>Set up an alert and you will see the next one on your dashboard.</p>
              <Link className="btn btn--outline" to="/dashboard#alerts">Create an alert</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
