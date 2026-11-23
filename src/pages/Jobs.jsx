/**
 * The job board: search, filters, sorting and pages.
 *
 * The filters are kept in the address bar (#/jobs?q=react&remote=1), so a
 * filtered board can be shared and the back button works.
 */

import { useEffect, useRef, useState } from 'react';
import { useBoardData, useSaved } from '../lib/hooks.js';
import { filterJobs, sortJobs, facets, SORTS, EMPTY_CRITERIA } from '../lib/data.js';
import { money, plural } from '../lib/format.js';
import { getParams, pageUrl, replaceAddress } from '../lib/url.js';
import JobCard, { Skeletons } from '../components/JobCard.jsx';
import Filters from '../components/Filters.jsx';
import LoadError from '../components/LoadError.jsx';
import Icon from '../components/Icon.jsx';

const PER_PAGE = 8;

/** Read the filters, sort and page number from the address bar. */
const readUrl = () => {
  const p = getParams();
  const list = (name) => (p.get(name) || '').split(',').filter(Boolean);
  const number = (name) => (p.get(name) ? Number(p.get(name)) : null);

  return {
    criteria: {
      ...EMPTY_CRITERIA,
      q: p.get('q') || '',
      where: p.get('where') || '',
      remote: p.get('remote') === '1',
      savedOnly: p.get('saved') === '1',
      disciplines: list('disciplines'),
      levels: list('levels'),
      types: list('types'),
      payMin: number('payMin'),
      payMax: number('payMax'),
      within: number('within'),
      companyId: p.get('company') || ''
    },
    sort: SORTS.some((s) => s.id === p.get('sort')) ? p.get('sort') : 'relevance',
    page: Math.max(1, Number(p.get('page')) || 1)
  };
};

/** The address bar for the current filters. Defaults are left out. */
const toUrl = (c, sort, page) => pageUrl('/jobs', {
  q: c.q,
  where: c.where,
  remote: c.remote ? '1' : '',
  saved: c.savedOnly ? '1' : '',
  disciplines: c.disciplines.join(','),
  levels: c.levels.join(','),
  types: c.types.join(','),
  payMin: c.payMin,
  payMax: c.payMax,
  within: c.within,
  company: c.companyId,
  sort: sort === 'relevance' ? '' : sort,
  page: page > 1 ? page : ''
});

/** A removable chip for every filter that is switched on. */
const activeChips = (c, jobs, domain) => {
  const chips = [];
  if (c.q) chips.push({ key: 'q', label: `“${c.q}”`, clear: { q: '' } });
  if (c.where) chips.push({ key: 'where', label: c.where, clear: { where: '' } });
  if (c.remote) chips.push({ key: 'remote', label: 'Remote only', clear: { remote: false } });
  if (c.savedOnly) chips.push({ key: 'saved', label: 'Saved only', clear: { savedOnly: false } });
  if (c.companyId) {
    const name = jobs.find((j) => j.companyId === c.companyId)?.companyName ?? c.companyId;
    chips.push({ key: 'company', label: name, clear: { companyId: '' } });
  }
  ['disciplines', 'levels', 'types'].forEach((name) => {
    c[name].forEach((value) => chips.push({
      key: `${name}:${value}`, label: value, clear: { [name]: c[name].filter((v) => v !== value) }
    }));
  });
  if (c.payMin || c.payMax) {
    chips.push({
      key: 'pay',
      label: `${money(c.payMin ?? domain.min)}–${money(c.payMax ?? domain.max)}`,
      clear: { payMin: null, payMax: null }
    });
  }
  if (c.within) {
    const label = c.within <= 24 ? 'Past day' : c.within <= 168 ? 'Past week' : 'Past month';
    chips.push({ key: 'within', label, clear: { within: null } });
  }
  return chips;
};

export default function Jobs() {
  const { data, failed } = useBoardData();
  const [saved, toggleSave] = useSaved();

  const [criteria, setCriteria] = useState(() => readUrl().criteria);
  const [sort, setSort] = useState(() => readUrl().sort);
  const [page, setPage] = useState(() => readUrl().page);

  /* What is typed in the search boxes. It only filters when the form is submitted. */
  const [qText, setQText] = useState(criteria.q);
  const [whereText, setWhereText] = useState(criteria.where);

  const [sheetOpen, setSheetOpen] = useState(false);   // the filter panel on phones
  const results = useRef(null);

  /* Change some filters, and go back to page 1. */
  const update = (changes) => {
    setCriteria({ ...criteria, ...changes });
    setPage(1);
    if ('q' in changes) setQText(changes.q);
    if ('where' in changes) setWhereText(changes.where);
  };

  const clearAll = () => {
    setCriteria(EMPTY_CRITERIA);
    setSort('relevance');
    setPage(1);
    setQText('');
    setWhereText('');
    setSheetOpen(false);
  };

  const search = (event) => {
    event.preventDefault();
    update({ q: qText.trim(), where: whereText.trim() });
  };

  const goToPage = (n) => {
    setPage(n);
    window.scrollTo({ top: results.current.offsetTop - 100, behavior: 'smooth' });
  };

  /* Work out what to show. */
  const jobs = data ? data.jobs : [];
  const matched = sortJobs(filterJobs(jobs, criteria, saved), sort);
  const pages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PER_PAGE;
  const shown = matched.slice(start, start + PER_PAGE);
  const chips = data ? activeChips(criteria, jobs, data.domain) : [];

  /* Keep the address bar in step with the filters (a moment after the last change). */
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => replaceAddress(toUrl(criteria, sort, current)), 120);
    return () => clearTimeout(timer);
  }, [data, criteria, sort, current]);

  /* Back and forward buttons: read the filters from the address bar again. */
  useEffect(() => {
    const onPopState = () => {
      const next = readUrl();
      setCriteria(next.criteria);
      setSort(next.sort);
      setPage(next.page);
      setQText(next.criteria.q);
      setWhereText(next.criteria.where);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /* While the phone filter panel is open: no page scrolling, Escape closes it. */
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>Open roles</h1>
              <p>
                {data
                  ? `${plural(jobs.length, 'role')} from ${money(data.domain.min)} to ${money(data.domain.max)}, every band on the same scale.`
                  : 'Every band drawn on the same scale.'}
              </p>
            </div>
          </div>

          <form className="hero-search" role="search" style={{ marginTop: 0 }} onSubmit={search}>
            <div className="hero-search-field">
              <Icon name="search" />
              <label className="visually-hidden" htmlFor="board-q">Role, skill or company</label>
              <input className="input" type="search" id="board-q" placeholder="Role, skill or company"
                     autoComplete="off" value={qText} onChange={(e) => setQText(e.target.value)} />
            </div>

            <div className="hero-search-field">
              <Icon name="pin" />
              <label className="visually-hidden" htmlFor="board-where">Location</label>
              <input className="input" type="search" id="board-where" placeholder="Location, or remote"
                     autoComplete="off" value={whereText} onChange={(e) => setWhereText(e.target.value)} />
            </div>

            <button className="btn btn--primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="strip strip--tight" style={{ paddingTop: 0 }}>
        <div className="wrap split split--rail-left">

          <aside aria-label="Filters">
            <button type="button" className="btn btn--outline filters-open" onClick={() => setSheetOpen(true)}>
              <Icon name="sliders" />
              Filters
              <span className="pill pill--flag" hidden={chips.length === 0}>{chips.length}</span>
            </button>

            {data
              ? <Filters facets={facets(jobs)} domain={data.domain} criteria={criteria}
                         onChange={update} onClear={clearAll}
                         open={sheetOpen} onClose={() => setSheetOpen(false)} />
              : <div className="filters" />}
          </aside>

          <section aria-labelledby="results-title">
            <h2 className="visually-hidden" id="results-title">Results</h2>

            <div className="board-head">
              <p className="board-count" aria-live="polite" aria-atomic="true">
                {!data && 'Loading…'}
                {data && matched.length > 0 && (
                  <><strong>{matched.length}</strong> {matched.length === 1 ? 'role' : 'roles'}
                    {pages > 1 && ` · page ${current} of ${pages}`}</>
                )}
                {data && matched.length === 0 && 'No roles match those filters'}
              </p>

              <div className="row row--tight">
                <label className="tick" htmlFor="sort">Sort</label>
                <span className="select-wrap">
                  <select className="select" id="sort" style={{ width: 'auto', paddingBlock: 7 }} value={sort}
                          onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                    {data && SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </span>
              </div>
            </div>

            <div className="active-chips">
              {chips.map((chip) => (
                <button type="button" className="chip" key={chip.key} onClick={() => update(chip.clear)}>
                  {chip.label}<span className="chip-x" aria-hidden="true">×</span>
                  <span className="visually-hidden">Remove filter</span>
                </button>
              ))}
              {chips.length > 0 && <button type="button" className="chip" onClick={clearAll}>Clear all</button>}
            </div>

            <div className="stack" ref={results}>
              {failed && <LoadError title="The listings did not load" />}
              {!data && !failed && <Skeletons count={5} />}

              {shown.map((job, i) => (
                <JobCard key={job.id} job={job} index={start + i + 1} domain={data.domain}
                         saved={saved.includes(Number(job.id))} onSave={toggleSave} />
              ))}

              {data && matched.length === 0 && (
                <div className="empty">
                  <h3>No roles match those filters</h3>
                  <p>Widen the pay range, clear a discipline, or search a different keyword.
                     The board has {plural(jobs.length, 'role')} in total.</p>
                  <button type="button" className="btn btn--outline" onClick={clearAll}>Clear all filters</button>
                </div>
              )}
            </div>

            <nav className="pager" aria-label="Results pages" style={{ marginTop: 'var(--s7)' }}>
              {pages > 1 && (
                <>
                  <button type="button" disabled={current === 1} aria-label="Previous page"
                          onClick={() => goToPage(current - 1)}>Prev</button>
                  {Array.from({ length: pages }, (_, i) => (
                    <button type="button" key={i} aria-current={i + 1 === current} aria-label={`Page ${i + 1}`}
                            onClick={() => goToPage(i + 1)}>{i + 1}</button>
                  ))}
                  <button type="button" disabled={current === pages} aria-label="Next page"
                          onClick={() => goToPage(current + 1)}>Next</button>
                </>
              )}
            </nav>
          </section>
        </div>
      </section>
    </>
  );
}
