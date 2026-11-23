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

/** "a,b,c" in the address -> ['a', 'b', 'c']. Missing -> []. */
const readList = (params, name) => {
  const text = params.get(name) || '';
  return text.split(',').filter((part) => part !== '');
};

/** A number in the address, or null when it is missing. */
const readNumber = (params, name) => {
  const text = params.get(name);
  if (!text) {
    return null;
  }
  return Number(text);
};

/** Read the filters, sort and page number from the address bar. */
const readUrl = () => {
  const params = getParams();

  const criteria = {
    ...EMPTY_CRITERIA,
    q: params.get('q') || '',
    where: params.get('where') || '',
    remote: params.get('remote') === '1',
    savedOnly: params.get('saved') === '1',
    disciplines: readList(params, 'disciplines'),
    levels: readList(params, 'levels'),
    types: readList(params, 'types'),
    payMin: readNumber(params, 'payMin'),
    payMax: readNumber(params, 'payMax'),
    within: readNumber(params, 'within'),
    companyId: params.get('company') || ''
  };

  /* Only a sort we know about; otherwise the default. */
  let sort = 'relevance';
  const sortInAddress = params.get('sort');
  if (SORTS.some((option) => option.id === sortInAddress)) {
    sort = sortInAddress;
  }

  /* The page number, never below 1. */
  let page = Number(params.get('page')) || 1;
  if (page < 1) {
    page = 1;
  }

  return { criteria, sort, page };
};

/** true -> "1". false -> "" (left out of the address). */
const asFlag = (on) => {
  if (on) return '1';
  return '';
};

/** The address bar for the current filters. Defaults are left out. */
const toUrl = (c, sort, page) => {
  let sortText = sort;
  if (sort === 'relevance') {
    sortText = '';   // the default sort is left out
  }

  let pageText = '';
  if (page > 1) {
    pageText = page;   // page 1 is left out
  }

  return pageUrl('/jobs', {
    q: c.q,
    where: c.where,
    remote: asFlag(c.remote),
    saved: asFlag(c.savedOnly),
    disciplines: c.disciplines.join(','),
    levels: c.levels.join(','),
    types: c.types.join(','),
    payMin: c.payMin,
    payMax: c.payMax,
    within: c.within,
    company: c.companyId,
    sort: sortText,
    page: pageText
  });
};

/** "Past day", "Past week" or "Past month" for a number of hours. */
const withinLabel = (hours) => {
  if (hours <= 24) return 'Past day';
  if (hours <= 168) return 'Past week';
  return 'Past month';
};

/** The company's name, found from one of its jobs. Falls back to the id. */
const companyNameFor = (jobs, companyId) => {
  const job = jobs.find((j) => j.companyId === companyId);
  if (job && job.companyName !== undefined && job.companyName !== null) {
    return job.companyName;
  }
  return companyId;
};

/**
 * A removable chip for every filter that is switched on.
 * Each chip has a label, and `clear`: the change that switches its filter off.
 */
const activeChips = (c, jobs, domain) => {
  const chips = [];

  if (c.q) chips.push({ key: 'q', label: `“${c.q}”`, clear: { q: '' } });
  if (c.where) chips.push({ key: 'where', label: c.where, clear: { where: '' } });
  if (c.remote) chips.push({ key: 'remote', label: 'Remote only', clear: { remote: false } });
  if (c.savedOnly) chips.push({ key: 'saved', label: 'Saved only', clear: { savedOnly: false } });

  if (c.companyId) {
    chips.push({ key: 'company', label: companyNameFor(jobs, c.companyId), clear: { companyId: '' } });
  }

  /* One chip for each ticked box. Clearing it takes just that value out of its list. */
  for (const name of ['disciplines', 'levels', 'types']) {
    for (const value of c[name]) {
      const withoutThis = c[name].filter((v) => v !== value);
      chips.push({ key: `${name}:${value}`, label: value, clear: { [name]: withoutThis } });
    }
  }

  if (c.payMin || c.payMax) {
    let low = domain.min;
    if (c.payMin !== null && c.payMin !== undefined) low = c.payMin;
    let high = domain.max;
    if (c.payMax !== null && c.payMax !== undefined) high = c.payMax;

    chips.push({ key: 'pay', label: `${money(low)}–${money(high)}`, clear: { payMin: null, payMax: null } });
  }

  if (c.within) {
    chips.push({ key: 'within', label: withinLabel(c.within), clear: { within: null } });
  }

  return chips;
};

export default function Jobs() {
  const { data, failed } = useBoardData();
  const [saved, toggleSave] = useSaved();

  /* The filters, sort and page come from the address when the page opens. */
  const fromAddress = readUrl();
  const [criteria, setCriteria] = useState(fromAddress.criteria);
  const [sort, setSort] = useState(fromAddress.sort);
  const [page, setPage] = useState(fromAddress.page);

  /* What is typed in the search boxes. It only filters when the form is submitted. */
  const [qText, setQText] = useState(criteria.q);
  const [whereText, setWhereText] = useState(criteria.where);

  const [sheetOpen, setSheetOpen] = useState(false);   // the filter panel on phones
  const results = useRef(null);

  /* Change some filters, and go back to page 1. */
  const update = (changes) => {
    setCriteria({ ...criteria, ...changes });
    setPage(1);

    /* Keep the search boxes showing the same words. */
    if (changes.q !== undefined) setQText(changes.q);
    if (changes.where !== undefined) setWhereText(changes.where);
  };

  const changeSort = (event) => {
    setSort(event.target.value);
    setPage(1);
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
  let jobs = [];
  let chips = [];
  if (data) {
    jobs = data.jobs;
    chips = activeChips(criteria, jobs, data.domain);
  }

  const filtered = filterJobs(jobs, criteria, saved);
  const matched = sortJobs(filtered, sort);

  /* Pages of 8 roles. There is always at least 1 page. */
  let pages = Math.ceil(matched.length / PER_PAGE);
  if (pages < 1) {
    pages = 1;
  }

  /* The page to show: the one asked for, but never past the last page. */
  let current = page;
  if (current > pages) {
    current = pages;
  }

  /* The roles on this page. Page 2 starts at role 8 (counting from 0). */
  const start = (current - 1) * PER_PAGE;
  const shown = matched.slice(start, start + PER_PAGE);

  /* [1, 2, 3 ...] for the page buttons. */
  const pageNumbers = [];
  for (let n = 1; n <= pages; n += 1) {
    pageNumbers.push(n);
  }

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
                          onChange={changeSort}>
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
                  {pageNumbers.map((n) => (
                    <button type="button" key={n - 1} aria-current={n === current} aria-label={`Page ${n}`}
                            onClick={() => goToPage(n)}>{n}</button>
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
