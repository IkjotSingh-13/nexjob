/**
 * Every company hiring, each with its pay band on the shared scale.
 */

import { useState } from 'react';
import { Link } from 'react-router';
import { useBoardData } from '../lib/hooks.js';
import { jobsAtCompany, payRange } from '../lib/data.js';
import { money, plural, uniqueSorted } from '../lib/format.js';
import { PayScale } from '../components/PayScale.jsx';
import Mark from '../components/Mark.jsx';
import LoadError from '../components/LoadError.jsx';
import Icon from '../components/Icon.jsx';

export default function Companies() {
  const { data, failed } = useBoardData();
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');

  /* The industries for the dropdown, A–Z, each once. */
  let industries = [];
  if (data) {
    industries = uniqueSorted(data.companies.map((c) => c.industry));
  }

  /* Does a company match the search box and the industry dropdown? */
  const text = q.trim().toLowerCase();
  const matchesSearch = (company) => {
    if (text) {
      const words = `${company.name} ${company.industry} ${company.tagline}`.toLowerCase();
      if (!words.includes(text)) return false;
    }
    if (industry && company.industry !== industry) return false;
    return true;
  };

  /* Most open roles first. With the same number, A–Z by name. */
  const byOpenRoles = (a, b) => {
    if (b.open.length !== a.open.length) {
      return b.open.length - a.open.length;
    }
    return a.company.name.localeCompare(b.company.name);
  };

  /* One row per matching company: the company, its open roles, and their pay range. */
  const rows = [];
  if (data) {
    for (const company of data.companies) {
      if (!matchesSearch(company)) continue;   // skip it

      const open = jobsAtCompany(data.jobs, company.id);
      const range = payRange(open);
      rows.push({ company, open, min: range.min, max: range.max });
    }
    rows.sort(byOpenRoles);
  }

  const clear = () => {
    setQ('');
    setIndustry('');
  };

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>Companies hiring</h1>
              <p>
                {data
                  ? `${plural(data.companies.length, 'company', 'companies')} with ${plural(data.jobs.length, 'open role')} between them.`
                  : 'Loading…'}
              </p>
            </div>
          </div>

          <form className="hero-search" role="search" style={{ marginTop: 0 }} onSubmit={(e) => e.preventDefault()}>
            <div className="hero-search-field">
              <Icon name="search" />
              <label className="visually-hidden" htmlFor="co-q">Company name</label>
              <input className="input" type="search" id="co-q" placeholder="Company name" autoComplete="off"
                     value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="select-wrap">
              <label className="visually-hidden" htmlFor="co-industry">Industry</label>
              <select className="select" id="co-industry" style={{ height: 44 }}
                      value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {data && <option value="">Every industry</option>}
                {industries.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <button className="btn btn--outline" type="button" onClick={clear}>Clear</button>
          </form>
        </div>
      </section>

      <section className="strip" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="board-count" aria-live="polite" style={{ marginBottom: 'var(--s4)' }}>
            {data && rows.length > 0 && (
              <><strong>{rows.length}</strong> {rows.length === 1 ? 'company' : 'companies'}</>
            )}
            {data && rows.length === 0 && 'No companies match that search'}
          </p>

          <div className="grid-cards">
            {failed && <LoadError title="The company list did not load" style={{ gridColumn: '1/-1' }} />}

            {rows.map(({ company, open, min, max }) => (
              <Link className="card co-card" to={`/company?id=${company.id}`} key={company.id}>
                <div className="co-card-top">
                  <Mark company={company} />
                  <div style={{ minWidth: 0 }}>
                    <p className="co-card-name">{company.name}</p>
                    <p className="tick">{company.industry} · {company.hq}</p>
                  </div>
                </div>

                <p className="co-card-about">{company.tagline || company.about}</p>

                {open.length > 0 ? (
                  <div>
                    <div className="row row--split" style={{ marginBottom: 5 }}>
                      <span className="tick">{plural(open.length, 'open role')}</span>
                      <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{money(min)} – {money(max)}</span>
                    </div>
                    <PayScale min={min} max={max} domain={data.domain}
                              label={`${company.name} pays ${money(min)} to ${money(max)} across ${open.length} open roles`} />
                  </div>
                ) : (
                  <span className="pill">No open roles</span>
                )}
              </Link>
            ))}

            {data && rows.length === 0 && (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                <h3>No companies match that search</h3>
                <p>Try a different name, or clear the industry filter.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
