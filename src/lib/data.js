/**
 * The job board data.
 *
 * Loads the three JSON files, adds any roles an employer posted in this
 * browser, and gives each job its company and a few worked-out fields.
 * Also: filtering, sorting and scoring. Nothing here knows about React.
 */

import { domainFor, postedDate } from './format.js';
import { getPostings, getCustomCompanies } from './store.js';

/* fetch() khud ek Promise return karta hai; `.then` mein jawab milta hai. */
const fetchJson = (file) =>
  fetch(`./data/${file}`).then((response) => {
    if (!response.ok) throw new Error(`${file} — HTTP ${response.status}`);
    return response.json();
  });

/** Used when a job points at a company we do not have. */
const unknownCompany = (job) => ({
  id: job.companyId,
  name: job.companyName || 'Unknown',
  initial: (job.companyName || '?').charAt(0).toUpperCase(),
  brandBg: '#2B36C4',
  brandFg: '#FFFFFF',
  industry: '—'
});

/** @returns {Promise<{jobs, companies, prep, domain}>} */
export const loadData = () =>
  /* Teeno JSON files ek saath maango. Promise.all tabhi aage badhta hai jab teeno aa jaayein;
     agar koi ek bhi fail ho toh poora Promise reject ho jaata hai. */
  Promise.all([
    fetchJson('jobs.json'),
    fetchJson('companies.json'),
    fetchJson('prep.json')
  ]).then(([seedJobs, seedCompanies, prep]) => {
    const companies = [...seedCompanies, ...getCustomCompanies()];

    /* Roles posted in this browser go at the top of the board. */
    const postings = getPostings().filter((p) => p.status !== 'deleted');

    const jobs = [...postings, ...seedJobs].map((job) => {
      const company = companies.find((c) => c.id === job.companyId) || unknownCompany(job);
      return {
        ...job,
        company,
        companyName: company.name,
        salaryMid: Math.round((job.salaryMin + job.salaryMax) / 2),
        postedAt: postedDate(job)
      };
    });

    return { jobs, companies, prep, domain: domainFor(jobs) };
  });

/* ------------------------------------------------------------------ Lookups */

export const jobById = (jobs, id) => jobs.find((j) => Number(j.id) === Number(id));

export const companyById = (companies, id) => companies.find((c) => c.id === id);

export const prepFor = (prep, companyId) => prep.find((p) => p.companyId === companyId);

export const jobsAtCompany = (jobs, companyId) => jobs.filter((j) => j.companyId === companyId);

export const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

/** The values the filters offer, taken from the jobs themselves. */
export const facets = (jobs) => ({
  disciplines: [...new Set(jobs.map((j) => j.discipline))].sort(),
  types: [...new Set(jobs.map((j) => j.type))].sort(),
  levels: LEVELS.filter((level) => jobs.some((j) => j.level === level))
});

/** Lowest floor and highest ceiling across some jobs. */
export const payRange = (jobs) => ({
  min: jobs.length ? Math.min(...jobs.map((j) => j.salaryMin)) : 0,
  max: jobs.length ? Math.max(...jobs.map((j) => j.salaryMax)) : 0
});

/* ---------------------------------------------------------------- Filtering */

export const EMPTY_CRITERIA = {
  q: '',
  where: '',
  remote: false,
  savedOnly: false,
  disciplines: [],
  levels: [],
  types: [],
  payMin: null,
  payMax: null,
  within: null,      // hours
  companyId: ''
};

/**
 * @param {Array} jobs
 * @param {Object} criteria  any of the EMPTY_CRITERIA fields
 * @param {number[]} savedIds  needed when criteria.savedOnly is on
 */
export const filterJobs = (jobs, criteria, savedIds = []) => {
  const c = { ...EMPTY_CRITERIA, ...criteria };
  const q = c.q.trim().toLowerCase();
  const where = c.where.trim().toLowerCase();

  return jobs.filter((job) => {
    if (q) {
      const text = [job.title, job.companyName, job.summary, job.discipline, ...(job.tags || [])]
        .join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }

    /* "remote" in the location box also matches every remote role. */
    if (where && !job.location.toLowerCase().includes(where) && !(where.includes('remote') && job.remote)) {
      return false;
    }

    if (c.remote && !job.remote) return false;
    if (c.companyId && job.companyId !== c.companyId) return false;
    if (c.disciplines.length && !c.disciplines.includes(job.discipline)) return false;
    if (c.levels.length && !c.levels.includes(job.level)) return false;
    if (c.types.length && !c.types.includes(job.type)) return false;

    /* A band matches when it overlaps the chosen pay range at all. */
    if (c.payMin && job.salaryMax < c.payMin) return false;
    if (c.payMax && job.salaryMin > c.payMax) return false;

    if (c.within && (job.postedHoursAgo ?? 0) > c.within) return false;
    if (c.savedOnly && !savedIds.includes(Number(job.id))) return false;

    return true;
  });
};

/* ------------------------------------------------------------------ Sorting */

export const SORTS = [
  { id: 'relevance', label: 'Most relevant' },
  { id: 'newest',    label: 'Newest first' },
  { id: 'pay-desc',  label: 'Pay, high to low' },
  { id: 'pay-asc',   label: 'Pay, low to high' }
];

const age = (job) => job.postedHoursAgo ?? 0;

export const sortJobs = (jobs, sort = 'relevance') => {
  const list = [...jobs];
  if (sort === 'newest') return list.sort((a, b) => age(a) - age(b));
  if (sort === 'pay-desc') return list.sort((a, b) => b.salaryMax - a.salaryMax);
  if (sort === 'pay-asc') return list.sort((a, b) => a.salaryMin - b.salaryMin);
  /* Most relevant: featured first, then newest. */
  return list.sort((a, b) => (b.featured === true) - (a.featured === true) || age(a) - age(b));
};

/* ----------------------------------------------------------- Recommendations */

/**
 * Score a job against a profile, 0–100, with the reasons shown to the user.
 */
export const scoreJob = (job, profile) => {
  const reasons = [];
  let score = 0;

  const text = [job.title, job.summary, ...(job.tags || [])].join(' ').toLowerCase();
  const hits = profile.skills.filter((skill) => text.includes(skill.toLowerCase()));

  if (hits.length) {
    score += Math.min(45, hits.length * 15);
    reasons.push(`${hits.length} of your skills match`);
  }

  if (job.discipline === profile.discipline) {
    score += 25;
    reasons.push(`${job.discipline} role`);
  }

  /* Too junior or too senior counts against a role, not just for it. */
  const want = LEVELS.indexOf(profile.level);
  const have = LEVELS.indexOf(job.level);
  if (want > -1 && have > -1) {
    const gap = Math.abs(want - have);
    if (gap === 0) {
      score += 20;
      reasons.push(`${job.level} level`);
    } else if (gap === 1) {
      score += 8;
      reasons.push('One level away');
    } else {
      score -= 20;
      reasons.push(have < want ? 'Below your level' : 'Above your level');
    }
  }

  if (profile.openTo.includes('Remote') && job.remote) {
    score += 10;
    reasons.push('Remote');
  }

  /* A real place only. A location of "Remote" already scored above. */
  const place = profile.location.trim().toLowerCase();
  if (place && !place.startsWith('remote') && job.location.toLowerCase().includes(place)) {
    score += 10;
    reasons.push('In your location');
  }

  return { score: Math.min(100, score), reasons };
};

/** The best-scoring jobs for a profile, highest first. */
export const recommend = (jobs, profile, limit) => jobs
  .map((job) => ({ job, ...scoreJob(job, profile) }))
  .filter((entry) => entry.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);

/**
 * Which of a company's focus areas a profile's skills touch.
 * A skill matches an area when it shares a word (4+ letters) with it.
 */
export const readinessFor = (entry, profile) => {
  const skills = profile.skills.map((s) => s.toLowerCase());
  const covered = [];
  const gaps = [];

  entry.focus.forEach((area) => {
    const words = area.topic.toLowerCase().split(/[^a-z+#]+/).filter((w) => w.length > 3);
    const matched = skills.some((skill) => words.some((word) => skill.includes(word) || word.includes(skill)));
    (matched ? covered : gaps).push(area);
  });

  const earned = covered.reduce((sum, a) => sum + a.weight, 0);
  const total = entry.focus.reduce((sum, a) => sum + a.weight, 0) || 1;

  return { score: Math.round((earned / total) * 100), covered, gaps };
};
