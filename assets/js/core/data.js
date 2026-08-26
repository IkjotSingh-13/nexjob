/**
 * Data access.
 *
 * Loads the three JSON files once per page, merges anything an employer has
 * posted in this browser over the top, and hands back listings that already
 * know their company and their position on the shared pay domain.
 *
 * Nothing here touches the DOM.
 */

import { domainFor, postedDate } from './format.js';
import { getPostings, getCustomCompanies } from './store.js';

const BASE = './assets/data/';

let cache = null;

const fetchJson = async (file) => {
  const response = await fetch(`${BASE}${file}`);
  if (!response.ok) throw new Error(`${file} — HTTP ${response.status}`);
  return response.json();
};

/** Attach the company record and the derived fields every view wants. */
const hydrate = (job, companyIndex) => {
  const company = companyIndex.get(job.companyId) || {
    id: job.companyId,
    name: job.companyName || 'Unknown',
    initial: (job.companyName || '?').charAt(0).toUpperCase(),
    brandBg: '#2B36C4',
    brandFg: '#FFFFFF',
    industry: '—'
  };

  return {
    ...job,
    company,
    companyName: company.name,
    salaryMid: Math.round((job.salaryMin + job.salaryMax) / 2),
    postedAt: postedDate(job)
  };
};

/**
 * @returns {Promise<{jobs: Array, companies: Array, prep: Array, domain: {min:number,max:number}}>}
 */
export const load = async () => {
  if (cache) return cache;

  const [seedJobs, seedCompanies, prep] = await Promise.all([
    fetchJson('jobs.json'),
    fetchJson('companies.json'),
    fetchJson('prep.json')
  ]);

  const companies = [...seedCompanies, ...getCustomCompanies()];
  const companyIndex = new Map(companies.map((c) => [c.id, c]));

  /* Employer postings from this browser sit at the top of the board. */
  const postings = getPostings().filter((p) => p.status !== 'deleted');
  const jobs = [...postings, ...seedJobs].map((job) => hydrate(job, companyIndex));

  cache = { jobs, companies, prep, domain: domainFor(jobs) };
  return cache;
};

/** Drop the cache so a page re-reads after a posting is created or edited. */
export const invalidate = () => { cache = null; };

/* ---------------------------------------------------------------- Lookups */

export const jobById = (jobs, id) => jobs.find((j) => Number(j.id) === Number(id));

export const companyById = (companies, id) => companies.find((c) => c.id === id);

export const prepFor = (prep, companyId) => prep.find((p) => p.companyId === companyId);

export const jobsAtCompany = (jobs, companyId) => jobs.filter((j) => j.companyId === companyId);

export const facets = (jobs) => ({
  disciplines: [...new Set(jobs.map((j) => j.discipline))].sort(),
  types: [...new Set(jobs.map((j) => j.type))].sort(),
  levels: ['Junior', 'Mid', 'Senior', 'Staff', 'Principal']
    .filter((l) => jobs.some((j) => j.level === l))
});

/* -------------------------------------------------------------- Filtering */

export const EMPTY_CRITERIA = {
  q: '',
  where: '',
  remote: false,
  disciplines: [],
  types: [],
  levels: [],
  payMin: null,
  payMax: null,
  within: null,      /* hours */
  savedOnly: false,
  companyId: ''
};

export const filterJobs = (jobs, criteria = {}) => {
  const c = { ...EMPTY_CRITERIA, ...criteria };
  const q = c.q.trim().toLowerCase();
  const where = c.where.trim().toLowerCase();

  return jobs.filter((job) => {
    if (q) {
      const haystack = [job.title, job.companyName, job.summary, job.discipline, ...(job.tags || [])]
        .join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (where) {
      const isRemoteSearch = /remote/.test(where);
      const matchesLocation = job.location.toLowerCase().includes(where);
      if (!(matchesLocation || (isRemoteSearch && job.remote))) return false;
    }

    if (c.remote && !job.remote) return false;
    if (c.companyId && job.companyId !== c.companyId) return false;
    if (c.disciplines.length && !c.disciplines.includes(job.discipline)) return false;
    if (c.types.length && !c.types.includes(job.type)) return false;
    if (c.levels.length && !c.levels.includes(job.level)) return false;

    /* A band overlaps the filter if it is not entirely outside it. */
    if (Number.isFinite(c.payMin) && c.payMin !== null && job.salaryMax < c.payMin) return false;
    if (Number.isFinite(c.payMax) && c.payMax !== null && job.salaryMin > c.payMax) return false;

    if (c.within && (job.postedHoursAgo ?? 0) > c.within) return false;
    if (c.savedOnly && !c.savedIds?.includes(Number(job.id))) return false;

    return true;
  });
};

/* ---------------------------------------------------------------- Sorting */

export const SORTS = [
  { id: 'relevance', label: 'Most relevant' },
  { id: 'newest',    label: 'Newest first' },
  { id: 'pay-desc',  label: 'Pay, high to low' },
  { id: 'pay-asc',   label: 'Pay, low to high' }
];

export const sortJobs = (jobs, sort = 'relevance') => {
  const list = [...jobs];

  switch (sort) {
    case 'newest':
      return list.sort((a, b) => (a.postedHoursAgo ?? 0) - (b.postedHoursAgo ?? 0));
    case 'pay-desc':
      return list.sort((a, b) => b.salaryMax - a.salaryMax);
    case 'pay-asc':
      return list.sort((a, b) => a.salaryMin - b.salaryMin);
    default:
      /* Featured first, then most recent. */
      return list.sort((a, b) =>
        (b.featured === true) - (a.featured === true) ||
        (a.postedHoursAgo ?? 0) - (b.postedHoursAgo ?? 0));
  }
};

/* -------------------------------------------------------- Recommendations */

const LEVEL_ORDER = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

/**
 * Score a listing against a profile, 0–100. Deliberately simple and
 * explainable: the dashboard shows the reasons alongside the number, so a
 * black box would be worse than a blunt instrument.
 */
export const scoreJob = (job, profile) => {
  if (!profile) return { score: 0, reasons: [] };

  const reasons = [];
  let score = 0;

  const skills = (profile.skills || []).map((s) => s.toLowerCase());
  const haystack = [job.title, job.summary, ...(job.tags || [])].join(' ').toLowerCase();
  const hits = skills.filter((skill) => haystack.includes(skill));

  if (hits.length) {
    score += Math.min(45, hits.length * 15);
    reasons.push(`${hits.length} of your skills match`);
  }

  if (profile.discipline && job.discipline === profile.discipline) {
    score += 25;
    reasons.push(`${job.discipline} role`);
  }

  /* Level has to cut both ways. Without a penalty a junior role that happens
     to name three of your skills outranks the senior one you actually want. */
  const wantIndex = LEVEL_ORDER.indexOf(profile.level);
  const jobIndex = LEVEL_ORDER.indexOf(job.level);
  if (wantIndex > -1 && jobIndex > -1) {
    const gap = Math.abs(wantIndex - jobIndex);
    if (gap === 0) { score += 20; reasons.push(`${job.level} level`); }
    else if (gap === 1) { score += 8; reasons.push('One level away'); }
    else {
      score -= 20;
      reasons.push(jobIndex < wantIndex ? 'Below your level' : 'Above your level');
    }
  }

  const wantsRemote = (profile.openTo || []).includes('Remote');

  if (wantsRemote && job.remote) {
    score += 10;
    reasons.push('Remote');
  }

  /* Only a real place match counts here — otherwise a profile whose location
     is "Remote" scores the remote bonus twice under two different names. */
  const place = (profile.location || '').trim().toLowerCase();
  if (place && !/^remote/.test(place) && job.location.toLowerCase().includes(place)) {
    score += 10;
    reasons.push('In your location');
  }

  return { score: Math.min(100, score), reasons };
};

export const recommend = (jobs, profile, limit = 6) => jobs
  .map((job) => ({ job, ...scoreJob(job, profile) }))
  .filter((entry) => entry.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);

/**
 * How ready a profile looks against one company's stated focus areas.
 * Same shape as scoreJob, reused by the prep page.
 */
export const readinessFor = (prepEntry, profile) => {
  if (!prepEntry || !profile) return { score: 0, covered: [], gaps: [] };

  const skills = (profile.skills || []).map((s) => s.toLowerCase());
  const covered = [];
  const gaps = [];

  prepEntry.focus.forEach((area) => {
    const words = area.topic.toLowerCase().split(/[^a-z+#]+/).filter((w) => w.length > 3);
    const matched = skills.some((skill) =>
      words.some((word) => skill.includes(word) || word.includes(skill)));
    (matched ? covered : gaps).push(area);
  });

  const earned = covered.reduce((sum, a) => sum + a.weight, 0);
  const total = prepEntry.focus.reduce((sum, a) => sum + a.weight, 0) || 1;

  return { score: Math.round((earned / total) * 100), covered, gaps };
};
