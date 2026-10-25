/**
 * Company directory.
 *
 * Each card carries the company's own pay band on the shared domain, so the
 * directory answers "who pays what" without opening anything.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { jobsAtCompany } from '../lib/jobs.js';
import { money, plural } from '../lib/format.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { PayScale } from '../components/PayScale.jsx';
import { LoadError } from '../components/LoadError.jsx';
import { Icon } from '../components/Icon.jsx';

const SPAN_ALL = { gridColumn: '1/-1' };

function CompanyCard({ company, open, min, max, domain }) {
  return (
    <Link className="card co-card" to={`/companies/${company.id}`}>
      <div className="co-card-top">
        <span className="mark" aria-hidden="true" style={{ background: company.brandBg, color: company.brandFg }}>
          {company.initial}
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="co-card-name">{company.name}</p>
          <p className="tick">{company.industry} · {company.hq}</p>
        </div>
      </div>

      <p className="co-card-about">{company.tagline || company.about}</p>

      {open.length ? (
        <div>
          <div className="row row--split" style={{ marginBottom: 5 }}>
            <span className="tick">{plural(open.length, 'open role')}</span>
            <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{money(min)} – {money(max)}</span>
          </div>
          <PayScale
            min={min} max={max} domain={domain}
            label={`${company.name} pays ${money(min)} to ${money(max)} across ${open.length} open roles`}
          />
        </div>
      ) : <span className="pill">No open roles</span>}
    </Link>
  );
}

export default function Companies() {
  usePageMeta(
    'Companies hiring — Nexjob',
    'Every company hiring on Nexjob, with what they pay and how many roles they have open.'
  );

  const { status, error, reload, jobs, companies, domain } = useBoard();
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');

  const ready = status === 'ready';
  const needle = q.trim().toLowerCase();

  const rows = companies
    .map((company) => {
      const open = jobsAtCompany(jobs, company.id);
      return {
        company,
        open,
        min: open.length ? Math.min(...open.map((j) => j.salaryMin)) : 0,
        max: open.length ? Math.max(...open.map((j) => j.salaryMax)) : 0
      };
    })
    .filter(({ company }) =>
      (!needle || `${company.name} ${company.industry} ${company.tagline}`.toLowerCase().includes(needle))
      && (!industry || company.industry === industry))
    .sort((a, b) => b.open.length - a.open.length || a.company.name.localeCompare(b.company.name));

  const industries = [...new Set(companies.map((c) => c.industry))].sort();

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>Companies hiring</h1>
              <p id="co-lede">
                {ready
                  ? `${plural(companies.length, 'company', 'companies')} with ${plural(jobs.length, 'open role')} between them.`
                  : 'Loading…'}
              </p>
            </div>
          </div>

          <form className="hero-search" id="co-search" role="search" style={{ marginTop: 0 }}
                onSubmit={(event) => event.preventDefault()}
                onReset={() => { setQ(''); setIndustry(''); }}>
            <div className="hero-search-field">
              <Icon name="search" />
              <label className="visually-hidden" htmlFor="co-q">Company name</label>
              <input className="input" type="search" id="co-q" name="q" placeholder="Company name"
                     autoComplete="off" value={q} onChange={(event) => setQ(event.target.value)} />
            </div>

            <div className="select-wrap">
              <label className="visually-hidden" htmlFor="co-industry">Industry</label>
              <select className="select" id="co-industry" style={{ height: 44 }} value={industry}
                      onChange={(event) => setIndustry(event.target.value)}>
                <option value="">Every industry</option>
                {industries.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <button className="btn btn--outline" type="reset">Clear</button>
          </form>
        </div>
      </section>

      <section className="strip" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="board-count" id="co-count" aria-live="polite" style={{ marginBottom: 'var(--s4)' }}>
            {ready && (rows.length
              ? <><strong>{rows.length}</strong> {rows.length === 1 ? 'company' : 'companies'}</>
              : 'No companies match that search')}
          </p>

          <div className="grid-cards" id="co-grid">
            {status === 'error' && (
              <LoadError title="The company list did not load" error={error} onRetry={reload} style={SPAN_ALL} />
            )}

            {ready && (rows.length
              ? rows.map(({ company, open, min, max }) => (
                <CompanyCard key={company.id} company={company} open={open} min={min} max={max} domain={domain} />
              ))
              : (
                <div className="empty" style={SPAN_ALL}>
                  <h3>No companies match that search</h3>
                  <p>Try a different name, or clear the industry filter.</p>
                </div>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}
