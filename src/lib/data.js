/**
 * The job board data.
 *
 * Loads the jobs and companies from the backend (MySQL), the interview routes
 * from prep.json, and gives each job its company and a few worked-out fields.
 * Also: filtering, sorting and scoring. Nothing here knows about React.
 */

import { domainFor, postedDate, smallest, biggest, uniqueSorted } from './format.js';
import { getCustomCompanies } from './store.js';
import { getJobs, getCompanies, hasBackend } from './api.js';

/* ------------------------------------------------------------------ Loading */

/* fetch() khud ek Promise return karta hai; `.then` mein jawab milta hai. */
const fetchJson = (file) => {
  return fetch(`./data/${file}`).then((response) => {
    if (!response.ok) {
      throw new Error(`${file} — HTTP ${response.status}`);
    }
    return response.json();
  });
};

/* Jobs and companies from the JSON files in public/data. Gives [jobs, companies]. */
const fromFiles = () => {
  return Promise.all([fetchJson('jobs.json'), fetchJson('companies.json')]);
};

/* Jobs and companies from the backend (MySQL). Gives [jobs, companies].
   If the backend does not answer, use the JSON files instead. */
const fromBackend = () => {
  return Promise.all([getJobs(), getCompanies()]).catch((error) => {
    console.warn('The backend is not running, so the JSON files are used instead.', error);
    return fromFiles();
  });
};

/* The backend runs on your own computer only. On GitHub Pages, read the files. */
const loadJobsAndCompanies = () => {
  if (hasBackend) {
    return fromBackend();
  }
  return fromFiles();
};

/** Used when a job points at a company we do not have. */
const unknownCompany = (job) => {
  const name = job.companyName || 'Unknown';
  const firstLetter = (job.companyName || '?').charAt(0).toUpperCase();

  return {
    id: job.companyId,
    name: name,
    initial: firstLetter,
    brandBg: '#2B36C4',
    brandFg: '#FFFFFF',
    industry: '—'
  };
};

/** A job as the pages use it: with its company, its middle salary and its posting date. */
const prepareJob = (job, companies) => {
  let company = companyById(companies, job.companyId);
  if (!company) {
    company = unknownCompany(job);
  }

  return {
    ...job,                 // every field the job already has
    company: company,
    companyName: company.name,
    salaryMid: Math.round((job.salaryMin + job.salaryMax) / 2),
    postedAt: postedDate(job)
  };
};

/** @returns {Promise<{jobs, companies, prep, domain}>} */
export const loadData = () => {
  /* Jobs + companies aur prep.json ek saath maango. Promise.all tabhi aage badhta hai jab
     dono aa jaayein; agar koi ek bhi fail ho toh poora Promise reject ho jaata hai. */
  return Promise.all([loadJobsAndCompanies(), fetchJson('prep.json')]).then((answers) => {
    const jobsAndCompanies = answers[0];   // [jobs, companies]
    const prep = answers[1];

    const savedJobs = jobsAndCompanies[0];
    const savedCompanies = jobsAndCompanies[1];

    /* Companies an employer created when they registered are kept in this browser. */
    const companies = [...savedCompanies, ...getCustomCompanies()];

    /* Roles posted through the site go at the top of the board, newest first.
       unshift() adds to the front of a list, so the last one posted ends up first. */
    const posted = [];
    const samples = [];
    for (const job of savedJobs) {
      if (job.postedBy) {
        posted.unshift(job);
      } else {
        samples.push(job);
      }
    }

    const jobs = [];
    for (const job of [...posted, ...samples]) {
      jobs.push(prepareJob(job, companies));
    }

    return { jobs, companies, prep, domain: domainFor(jobs) };
  });
};

/* ------------------------------------------------------------------ Lookups */

/** The job with this id, or undefined. Ids are compared as numbers ("3" and 3 match). */
export const jobById = (jobs, id) => {
  return jobs.find((job) => Number(job.id) === Number(id));
};

export const companyById = (companies, id) => {
  return companies.find((company) => company.id === id);
};

export const prepFor = (prep, companyId) => {
  return prep.find((entry) => entry.companyId === companyId);
};

export const jobsAtCompany = (jobs, companyId) => {
  return jobs.filter((job) => job.companyId === companyId);
};

export const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

/** The values the filters offer, taken from the jobs themselves. */
export const facets = (jobs) => {
  const disciplines = uniqueSorted(jobs.map((job) => job.discipline));
  const types = uniqueSorted(jobs.map((job) => job.type));

  /* Levels keep their own order (Junior first), and only the ones some job has. */
  const levels = [];
  for (const level of LEVELS) {
    const someJobHasIt = jobs.some((job) => job.level === level);
    if (someJobHasIt) levels.push(level);
  }

  return { disciplines, types, levels };
};

/** Lowest floor and highest ceiling across some jobs. */
export const payRange = (jobs) => {
  if (jobs.length === 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: smallest(jobs.map((job) => job.salaryMin)),
    max: biggest(jobs.map((job) => job.salaryMax))
  };
};

/** How many hours ago a job was posted. 0 when the job does not say. */
const hoursOld = (job) => {
  if (job.postedHoursAgo === undefined || job.postedHoursAgo === null) {
    return 0;
  }
  return job.postedHoursAgo;
};

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

/** True when one job passes every filter that is switched on. */
const passesFilters = (job, c, q, where, savedIds) => {
  /* Search words: look in the title, company, summary, discipline and tags. */
  if (q) {
    const parts = [job.title, job.companyName, job.summary, job.discipline];
    if (job.tags) {
      parts.push(...job.tags);
    }
    const text = parts.join(' ').toLowerCase();
    if (!text.includes(q)) return false;
  }

  /* Location. Typing "remote" in the location box also matches every remote role. */
  if (where) {
    const placeMatches = job.location.toLowerCase().includes(where);
    const remoteMatches = where.includes('remote') && job.remote;
    if (!placeMatches && !remoteMatches) return false;
  }

  if (c.remote && !job.remote) return false;
  if (c.companyId && job.companyId !== c.companyId) return false;

  /* Ticked boxes. An empty list means "any". */
  if (c.disciplines.length > 0 && !c.disciplines.includes(job.discipline)) return false;
  if (c.levels.length > 0 && !c.levels.includes(job.level)) return false;
  if (c.types.length > 0 && !c.types.includes(job.type)) return false;

  /* Pay. A band matches when it overlaps the chosen range at all. */
  if (c.payMin && job.salaryMax < c.payMin) return false;
  if (c.payMax && job.salaryMin > c.payMax) return false;

  /* Posted within the last N hours. */
  if (c.within && hoursOld(job) > c.within) return false;

  if (c.savedOnly && !savedIds.includes(Number(job.id))) return false;

  return true;
};

/**
 * @param {Array} jobs
 * @param {Object} criteria  any of the EMPTY_CRITERIA fields
 * @param {number[]} savedIds  needed when criteria.savedOnly is on
 */
export const filterJobs = (jobs, criteria, savedIds = []) => {
  const c = { ...EMPTY_CRITERIA, ...criteria };   // fill in any missing filters with "off"
  const q = c.q.trim().toLowerCase();
  const where = c.where.trim().toLowerCase();

  const result = [];
  for (const job of jobs) {
    if (passesFilters(job, c, q, where, savedIds)) {
      result.push(job);
    }
  }
  return result;
};

/* ------------------------------------------------------------------ Sorting */

export const SORTS = [
  { id: 'relevance', label: 'Most relevant' },
  { id: 'newest',    label: 'Newest first' },
  { id: 'pay-desc',  label: 'Pay, high to low' },
  { id: 'pay-asc',   label: 'Pay, low to high' }
];

/*
 * A sort function compares two jobs, a and b:
 *   a negative number -> a comes first
 *   a positive number -> b comes first
 *   0                 -> keep them as they are
 */
const byNewest = (a, b) => hoursOld(a) - hoursOld(b);

const byPayHighToLow = (a, b) => b.salaryMax - a.salaryMax;

const byPayLowToHigh = (a, b) => a.salaryMin - b.salaryMin;

/* Most relevant: featured roles first, then the newest. */
const byRelevance = (a, b) => {
  const aFeatured = a.featured === true;
  const bFeatured = b.featured === true;

  if (aFeatured && !bFeatured) return -1;
  if (bFeatured && !aFeatured) return 1;
  return byNewest(a, b);
};

export const sortJobs = (jobs, sort = 'relevance') => {
  const list = [...jobs];   // a copy, so the original list is not changed

  if (sort === 'newest') return list.sort(byNewest);
  if (sort === 'pay-desc') return list.sort(byPayHighToLow);
  if (sort === 'pay-asc') return list.sort(byPayLowToHigh);
  return list.sort(byRelevance);
};

/* ----------------------------------------------------------- Recommendations */

/**
 * Score a job against a profile, 0–100, with the reasons shown to the user.
 */
export const scoreJob = (job, profile) => {
  const reasons = [];
  let score = 0;

  /* Skills: 15 points for each skill that appears in the job, at most 45. */
  const parts = [job.title, job.summary];
  if (job.tags) {
    parts.push(...job.tags);
  }
  const text = parts.join(' ').toLowerCase();
  const hits = profile.skills.filter((skill) => text.includes(skill.toLowerCase()));

  if (hits.length > 0) {
    score += Math.min(45, hits.length * 15);
    reasons.push(`${hits.length} of your skills match`);
  }

  /* Same discipline (Engineering, Design ...): 25 points. */
  if (job.discipline === profile.discipline) {
    score += 25;
    reasons.push(`${job.discipline} role`);
  }

  /* Level. Too junior or too senior counts against a role, not just for it. */
  const want = LEVELS.indexOf(profile.level);   // -1 when not in the list
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
      if (have < want) {
        reasons.push('Below your level');
      } else {
        reasons.push('Above your level');
      }
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

/** The best-scoring jobs for a profile, highest first. At most `limit` of them. */
export const recommend = (jobs, profile, limit) => {
  const scored = [];
  for (const job of jobs) {
    const result = scoreJob(job, profile);
    if (result.score > 0) {
      scored.push({ job: job, score: result.score, reasons: result.reasons });
    }
  }

  scored.sort((a, b) => b.score - a.score);   // highest score first
  return scored.slice(0, limit);
};

/**
 * Does any skill share a word (4+ letters) with this topic?
 * "React" matches "React and state management".
 */
const skillsMatchTopic = (skills, topic) => {
  const words = topic.toLowerCase().split(/[^a-z+#]+/);   // split on anything that is not a letter, + or #
  const longWords = words.filter((word) => word.length > 3);

  for (const skill of skills) {
    for (const word of longWords) {
      if (skill.includes(word) || word.includes(skill)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Which of a company's focus areas a profile's skills touch.
 * A skill matches an area when it shares a word (4+ letters) with it.
 */
export const readinessFor = (entry, profile) => {
  const skills = profile.skills.map((skill) => skill.toLowerCase());
  const covered = [];
  const gaps = [];

  for (const area of entry.focus) {
    if (skillsMatchTopic(skills, area.topic)) {
      covered.push(area);
    } else {
      gaps.push(area);
    }
  }

  /* Each area has a weight. The score is the share of the weight you cover. */
  let earned = 0;
  for (const area of covered) {
    earned += area.weight;
  }

  let total = 0;
  for (const area of entry.focus) {
    total += area.weight;
  }
  if (total === 0) {
    total = 1;   // never divide by 0
  }

  return { score: Math.round((earned / total) * 100), covered, gaps };
};
