import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KEY, NONE } from '../services/storage.js';
import { loadSeed } from '../services/api.js';
import { hydrate } from '../lib/jobs.js';
import { domainFor } from '../lib/format.js';
import { useDb } from '../hooks/useDb.js';

/**
 * The board: every listing, company and hiring route, ready to use.
 *
 * The sample data arrives once, as a promise (`loadSeed`). What an employer
 * has posted in this browser, and any company they created, are read from the
 * store and merged on top — so publishing a role changes the board without
 * anyone having to remember to invalidate a cache.
 *
 * `status` is 'loading' | 'ready' | 'error'. Until it is ready the lists are
 * empty rather than missing, so a page can destructure safely and branch on
 * status where it matters.
 */

const BoardContext = createContext(null);

const EMPTY = { jobs: NONE, companies: NONE, prep: NONE, domain: domainFor([]) };

export function BoardProvider({ children }) {
  const [load, setLoad] = useState({ status: 'loading', seed: null, error: null });
  const [attempt, setAttempt] = useState(0);

  const postings = useDb(KEY.postings, NONE);
  const customCompanies = useDb(KEY.companies, NONE);

  useEffect(() => {
    let live = true;

    loadSeed()
      .then((seed) => { if (live) setLoad({ status: 'ready', seed, error: null }); })
      .catch((error) => { if (live) setLoad({ status: 'error', seed: null, error }); });

    return () => { live = false; };
  }, [attempt]);

  const reload = useCallback(() => {
    setLoad({ status: 'loading', seed: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  const board = useMemo(() => {
    if (!load.seed) return EMPTY;

    const companies = [...load.seed.companies, ...customCompanies];
    const index = new Map(companies.map((c) => [c.id, c]));

    /* Employer postings from this browser sit at the top of the board. */
    const live = postings.filter((p) => p.status !== 'deleted');
    const jobs = [...live, ...load.seed.jobs].map((job) => hydrate(job, index));

    return { jobs, companies, prep: load.seed.prep, domain: domainFor(jobs) };
  }, [load.seed, postings, customCompanies]);

  const value = useMemo(
    () => ({ status: load.status, error: load.error, reload, ...board }),
    [load.status, load.error, reload, board]
  );

  return <BoardContext value={value}>{children}</BoardContext>;
}

export const useBoard = () => useContext(BoardContext);
