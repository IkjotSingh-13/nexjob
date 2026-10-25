/**
 * The board.
 *
 * Filter state lives in the query string, so a filtered view is shareable and
 * the back button does what it should. The address bar is the single source
 * of truth: criteria, sort and page are all derived from it on every render,
 * and every control writes back to it. There is no second copy to drift.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { EMPTY_CRITERIA, facets, filterJobs, sortJobs, SORTS } from '../lib/jobs.js';
import { money, plural } from '../lib/format.js';
import { toSearchParams } from '../lib/url.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useSavedIds } from '../hooks/useStore.js';
import { JobCard, Skeletons } from '../components/JobCard.jsx';
import { Filters } from '../components/Filters.jsx';
import { LoadError } from '../components/LoadError.jsx';
import { Icon } from '../components/Icon.jsx';

const PER_PAGE = 8;

/* ------------------------------------------------ Query string mapping */

const csv = (value) => (value ? String(value).split(',').filter(Boolean) : []);

const criteriaFromParams = (params) => ({
  ...EMPTY_CRITERIA,
  q: params.get('q') || '',
  where: params.get('where') || '',
  remote: params.get('remote') === '1',
  savedOnly: params.get('saved') === '1',
  disciplines: csv(params.get('disciplines')),
  levels: csv(params.get('levels')),
  types: csv(params.get('types')),
  payMin: params.get('payMin') ? Number(params.get('payMin')) : null,
  payMax: params.get('payMax') ? Number(params.get('payMax')) : null,
  within: params.get('within') ? Number(params.get('within')) : null,
  companyId: params.get('company') || ''
});

const paramsFromState = (c, sort, page) => toSearchParams({
  q: c.q,
  where: c.where,
  remote: c.remote ? '1' : '',
  saved: c.savedOnly ? '1' : '',
  disciplines: c.disciplines,
  levels: c.levels,
  types: c.types,
  payMin: c.payMin ?? '',
  payMax: c.payMax ?? '',
  within: c.within ?? '',
  company: c.companyId,
  sort: sort === 'relevance' ? '' : sort,
  page: page > 1 ? page : ''
});

/* ------------------------------------------------------------- Chips */

/** Each active filter as a removable chip: a label, and what removing it does. */
const activeChips = (c, { jobs, domain }) => {
  const chips = [];
  const without = (patch) => ({ ...c, ...patch });

  if (c.q) chips.push({ id: 'q', label: `“${c.q}”`, drop: () => without({ q: '' }) });
  if (c.where) chips.push({ id: 'where', label: c.where, drop: () => without({ where: '' }) });
  if (c.remote) chips.push({ id: 'remote', label: 'Remote only', drop: () => without({ remote: false }) });
  if (c.savedOnly) chips.push({ id: 'saved', label: 'Saved only', drop: () => without({ savedOnly: false }) });

  if (c.companyId) {
    chips.push({
      id: 'company',
      label: jobs.find((j) => j.companyId === c.companyId)?.companyName ?? c.companyId,
      drop: () => without({ companyId: '' })
    });
  }

  ['disciplines', 'levels', 'types'].forEach((field) => {
    c[field].forEach((value) => chips.push({
      id: `${field}:${value}`,
      label: value,
      drop: () => without({ [field]: c[field].filter((v) => v !== value) })
    }));
  });

  if (c.payMin || c.payMax) {
    chips.push({
      id: 'pay',
      label: `${money(c.payMin ?? domain.min)}–${money(c.payMax ?? domain.max)}`,
      drop: () => without({ payMin: null, payMax: null })
    });
  }

  if (c.within) {
    chips.push({
      id: 'within',
      label: c.within <= 24 ? 'Past day' : c.within <= 168 ? 'Past week' : 'Past month',
      drop: () => without({ within: null })
    });
  }

  return chips;
};

/* -------------------------------------------------------------- Page */

export default function Jobs() {
  usePageMeta(
    'Browse roles — Nexjob',
    'Search and filter open engineering, design, product and data roles by pay band, level, contract type and location.'
  );

  const { status, error, reload, jobs, domain } = useBoard();
  const savedIds = useSavedIds();
  const [params, setParams] = useSearchParams();

  const criteria = useMemo(() => criteriaFromParams(params), [params]);
  const sort = SORTS.some((s) => s.id === params.get('sort')) ? params.get('sort') : 'relevance';
  const requestedPage = Math.max(1, Number(params.get('page')) || 1);

  /* Every change goes back into the address bar, replacing the entry rather
     than stacking one per keystroke. */
  const commit = (nextCriteria, { nextSort = sort, page = 1 } = {}) =>
    setParams(paramsFromState(nextCriteria, nextSort, page), { replace: true });

  /* The two search boxes hold text while it is being typed and only commit on
     submit. They follow the address bar when something else changes it. */
  const [text, setText] = useState({ q: criteria.q, where: criteria.where });
  const [synced, setSynced] = useState({ q: criteria.q, where: criteria.where });

  if (synced.q !== criteria.q || synced.where !== criteria.where) {
    setSynced({ q: criteria.q, where: criteria.where });
    setText({ q: criteria.q, where: criteria.where });
  }

  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!sheetOpen) return undefined;

    const onKey = (event) => { if (event.key === 'Escape') setSheetOpen(false); };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  /* ---------------------------------------------------------- Derived */

  const ready = status === 'ready';

  const sorted = useMemo(
    () => sortJobs(filterJobs(jobs, { ...criteria, savedIds }), sort),
    [jobs, criteria, savedIds, sort]
  );

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * PER_PAGE;
  const slice = sorted.slice(start, start + PER_PAGE);

  const chips = ready ? activeChips(criteria, { jobs, domain }) : [];

  /* ------------------------------------------------------------ Events */

  const onSearch = (event) => {
    event.preventDefault();
    commit({ ...criteria, q: text.q.trim(), where: text.where.trim() });
  };

  const clearAll = () => {
    setParams({}, { replace: true });
    setSheetOpen(false);
  };

  const goTo = (next) => {
    commit(criteria, { page: next });
    window.scrollTo({ top: (resultsRef.current?.offsetTop ?? 0) - 100, behavior: 'smooth' });
  };

  /* ----------------------------------------------------------- Render */

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>Open roles</h1>
              <p id="board-lede">
                {ready
                  ? `${plural(jobs.length, 'role')} from ${money(domain.min)} to ${money(domain.max)}, every band on the same scale.`
                  : 'Every band drawn on the same scale.'}
              </p>
            </div>
          </div>

          <form className="hero-search" id="board-search" role="search" style={{ marginTop: 0 }} onSubmit={onSearch}>
            <div className="hero-search-field">
              <Icon name="search" />
              <label className="visually-hidden" htmlFor="board-q">Role, skill or company</label>
              <input className="input" type="search" id="board-q" name="q" placeholder="Role, skill or company"
                     autoComplete="off" value={text.q}
                     onChange={(event) => setText({ ...text, q: event.target.value })} />
            </div>

            <div className="hero-search-field">
              <Icon name="pin" />
              <label className="visually-hidden" htmlFor="board-where">Location</label>
              <input className="input" type="search" id="board-where" name="where" placeholder="Location, or remote"
                     autoComplete="off" value={text.where}
                     onChange={(event) => setText({ ...text, where: event.target.value })} />
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

            {ready ? (
              <Filters
                facets={facets(jobs)}
                domain={domain}
                criteria={criteria}
                open={sheetOpen}
                onChange={(patch) => commit({ ...criteria, ...patch })}
                onClear={clearAll}
                onClose={() => setSheetOpen(false)}
              />
            ) : (
              <div className="filters" id="filters" />
            )}
          </aside>

          <section aria-labelledby="results-title">
            <h2 className="visually-hidden" id="results-title">Results</h2>

            <div className="board-head">
              <p className="board-count" id="result-count" aria-live="polite" aria-atomic="true">
                {!ready ? (status === 'error' ? 'The listings did not load' : 'Loading…')
                  : sorted.length ? (
                    <>
                      <strong>{sorted.length}</strong> {sorted.length === 1 ? 'role' : 'roles'}
                      {pages > 1 ? ` · page ${page} of ${pages}` : ''}
                    </>
                  ) : 'No roles match those filters'}
              </p>

              <div className="row row--tight">
                <label className="tick" htmlFor="sort">Sort</label>
                <span className="select-wrap">
                  <select className="select" id="sort" style={{ width: 'auto', paddingBlock: 7 }} value={sort}
                          onChange={(event) => commit(criteria, { nextSort: event.target.value })}>
                    {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </span>
              </div>
            </div>

            <div className="active-chips" id="active-chips">
              {chips.length > 0 && (
                <>
                  {chips.map((chip) => (
                    <button key={chip.id} type="button" className="chip" onClick={() => commit(chip.drop())}>
                      {chip.label}<span className="chip-x" aria-hidden="true">×</span>
                      <span className="visually-hidden">Remove filter</span>
                    </button>
                  ))}
                  <button type="button" className="chip" onClick={clearAll}>Clear all</button>
                </>
              )}
            </div>

            <div className="stack" id="results" ref={resultsRef}>
              {status === 'error' && <LoadError title="The listings did not load" error={error} onRetry={reload} />}
              {status === 'loading' && <Skeletons count={5} />}
              {ready && (slice.length
                ? slice.map((job, i) => <JobCard key={job.id} job={job} index={start + i + 1} domain={domain} />)
                : (
                  <div className="empty">
                    <h3>No roles match those filters</h3>
                    <p>
                      Widen the pay range, clear a discipline, or search a different keyword.
                      The board has {plural(jobs.length, 'role')} in total.
                    </p>
                    <button type="button" className="btn btn--outline" onClick={clearAll}>Clear all filters</button>
                  </div>
                ))}
            </div>

            <nav className="pager" id="pager" aria-label="Results pages" style={{ marginTop: 'var(--s7)' }}>
              {ready && pages > 1 && (
                <>
                  <button type="button" disabled={page === 1} aria-label="Previous page"
                          onClick={() => goTo(page - 1)}>Prev</button>

                  {Array.from({ length: pages }, (_, i) => (
                    <button key={i} type="button" aria-current={i + 1 === page} aria-label={`Page ${i + 1}`}
                            onClick={() => goTo(i + 1)}>
                      {i + 1}
                    </button>
                  ))}

                  <button type="button" disabled={page === pages} aria-label="Next page"
                          onClick={() => goTo(page + 1)}>Next</button>
                </>
              )}
            </nav>
          </section>
        </div>
      </section>
    </>
  );
}
