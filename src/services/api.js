/**
 * The service layer.
 *
 * Every operation the interface performs lives here and returns a Promise —
 * the contract a real backend would offer. Today the "server" is
 * localStorage, so each call waits out a simulated round trip (see
 * `LATENCY`) and then reads or writes the store. Swapping in `fetch` later
 * means changing this file and nothing above it.
 *
 * Domain failures reject with an ApiError whose message is safe to show:
 * a wrong password, an email already taken, a second application to the same
 * role. Callers use `.then`, `.catch` and `.finally`, or `await`.
 *
 * Reads that the UI subscribes to (saved roles, applications, the session…)
 * do not go through here; components read them from the store with hooks, so
 * a write made here re-renders everything that depends on it.
 */

import { KEY, NONE, NONE_BY_ID, read, write, drop, uid } from './storage.js';
import { LATENCY, simulate, withTimeout, retry } from './promises.js';
import { STAGES } from '../lib/stages.js';
import { emptyProfile } from '../lib/profile.js';
import { initials, colourFor } from '../lib/format.js';

export class ApiError extends Error {
  constructor(message, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/* ============================================================ Sample data */

const BASE = `${import.meta.env.BASE_URL}data/`;

const fetchJson = (file) => fetch(`${BASE}${file}`).then((response) => {
  if (!response.ok) throw new ApiError(`${file} — HTTP ${response.status}`, 'http');
  return response.json();
});

let seedPromise = null;

/**
 * The three JSON files, fetched together. The promise is shared, so every
 * caller on every page waits on one request. A failure is not cached: it
 * clears the slot so the next call — a "Try again" button — starts over.
 *
 * @returns {Promise<{jobs: Array, companies: Array, prep: Array}>}
 */
export const loadSeed = () => {
  if (!seedPromise) {
    const attempt = () => Promise.all([
      fetchJson('jobs.json'),
      fetchJson('companies.json'),
      fetchJson('prep.json')
    ]);

    seedPromise = withTimeout(retry(attempt, { attempts: 3 }), 10_000, 'The listings took too long to load.')
      .then(([jobs, companies, prep]) => ({ jobs, companies, prep }))
      .catch((error) => {
        seedPromise = null;
        throw error;
      });
  }

  return seedPromise;
};

/* ======================================================== Accounts + session
   Demo only. Passwords sit in localStorage in plain text because there is no
   server to hold them — this is a coursework project, not a login you should
   reuse anywhere real. The page says so too. */

const AVATAR_COLOURS = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A'];

const accounts = () => {
  const existing = read(KEY.accounts, null);
  if (existing) return existing;

  const seed = [
    {
      id: 'u-jane',
      name: 'Jane Okafor',
      email: 'jane@example.com',
      password: 'password123',
      role: 'seeker',
      avatarBg: '#2B36C4'
    },
    {
      id: 'u-alex',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      password: 'password123',
      role: 'employer',
      companyId: 'linear',
      avatarBg: '#17694A'
    }
  ];

  write(KEY.accounts, seed);
  return seed;
};

/** Strip the password before anything reaches the session. */
const toSession = (account) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: account.role,
  companyId: account.companyId || null,
  avatarBg: account.avatarBg,
  initials: initials(account.name),
  signedInAt: new Date().toISOString()
});

/** @returns {Promise<Object>} the session user */
export const signIn = (email, password) => simulate(() => {
  const target = String(email).trim().toLowerCase();
  const account = accounts().find((a) => a.email.toLowerCase() === target);

  if (!account) throw new ApiError('No account uses that email address.', 'no-account');
  if (account.password !== password) throw new ApiError('That password does not match.', 'bad-password');

  const user = toSession(account);
  write(KEY.session, user);
  return user;
}, LATENCY.auth);

/**
 * @param {{name:string, email:string, password:string, role:'seeker'|'employer',
 *          companyId?:string, companyName?:string}} details
 * @returns {Promise<Object>} the session user
 */
export const register = (details) => simulate(() => {
  const existing = accounts();
  const email = String(details.email).trim().toLowerCase();

  if (existing.some((a) => a.email.toLowerCase() === email)) {
    throw new ApiError('That email already has an account. Sign in instead.', 'email-taken');
  }

  let companyId = details.companyId || null;

  /* An employer naming a company we do not carry gets one created for them,
     so their postings have somewhere to hang. */
  if (details.role === 'employer' && !companyId && details.companyName) {
    const name = details.companyName.trim();
    companyId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid();

    const customs = read(KEY.companies, NONE);
    if (!customs.some((c) => c.id === companyId)) {
      write(KEY.companies, [...customs, {
        id: companyId,
        name,
        initial: name.charAt(0).toUpperCase(),
        brandBg: colourFor(name),
        brandFg: '#FFFFFF',
        industry: 'Not stated',
        size: 'Not stated',
        hq: 'Not stated',
        founded: new Date().getFullYear(),
        site: '',
        tagline: '',
        about: `${name} has not written a company profile yet.`,
        perks: []
      }]);
    }
  }

  const account = {
    id: uid(),
    name: details.name.trim(),
    email,
    password: details.password,
    role: details.role === 'employer' ? 'employer' : 'seeker',
    companyId,
    avatarBg: AVATAR_COLOURS[existing.length % AVATAR_COLOURS.length]
  };

  write(KEY.accounts, [...existing, account]);

  const user = toSession(account);
  write(KEY.session, user);
  return user;
}, LATENCY.auth);

export const signOut = () => simulate(() => drop(KEY.session), LATENCY.quick);

/* ============================================================ Saved roles */

/** @returns {Promise<{saved: boolean, count: number}>} */
export const toggleSaved = (jobId) => simulate(() => {
  const id = Number(jobId);
  const current = read(KEY.saved, NONE).map(Number);
  const wasSaved = current.includes(id);
  const next = wasSaved ? current.filter((n) => n !== id) : [id, ...current];

  write(KEY.saved, next);
  return { saved: !wasSaved, count: next.length };
}, LATENCY.quick);

/** Recently opened roles. A side effect of looking, so it does not wait. */
export const pushRecent = (jobId) => {
  const id = Number(jobId);
  write(KEY.recent, [id, ...read(KEY.recent, NONE).map(Number).filter((n) => n !== id)].slice(0, 8));
};

/* ========================================================== Applications */

/** @returns {Promise<Object>} the new application */
export const applyToJob = (application) => simulate(() => {
  const all = read(KEY.applications, NONE);

  const duplicate = all.some((a) =>
    Number(a.jobId) === Number(application.jobId) && a.userId === application.userId);
  if (duplicate) throw new ApiError('You have already applied for this role.', 'duplicate');

  const now = new Date().toISOString();
  const record = {
    id: uid(),
    stage: STAGES[0].id,
    appliedAt: now,
    history: [{ stage: STAGES[0].id, at: now }],
    ...application
  };

  write(KEY.applications, [record, ...all]);
  return record;
}, LATENCY.normal);

/** @returns {Promise<Object>} the updated application */
export const moveApplication = (applicationId, stage) => simulate(() => {
  const all = read(KEY.applications, NONE);
  const target = all.find((a) => a.id === applicationId);

  if (!target) throw new ApiError('That application no longer exists.', 'not-found');

  const next = {
    ...target,
    stage,
    history: [...(target.history || []), { stage, at: new Date().toISOString() }]
  };

  write(KEY.applications, all.map((a) => (a.id === applicationId ? next : a)));
  return next;
}, LATENCY.quick);

export const withdrawApplication = (applicationId) => simulate(() => {
  write(KEY.applications, read(KEY.applications, NONE).filter((a) => a.id !== applicationId));
}, LATENCY.quick);

/* ================================================================== Alerts */

export const createAlert = (alert) => simulate(() => {
  const record = { id: uid(), active: true, createdAt: new Date().toISOString(), ...alert };
  write(KEY.alerts, [record, ...read(KEY.alerts, NONE)]);
  return record;
}, LATENCY.normal);

export const toggleAlert = (alertId) => simulate(() => {
  write(KEY.alerts, read(KEY.alerts, NONE).map((a) => (a.id === alertId ? { ...a, active: !a.active } : a)));
}, LATENCY.quick);

export const deleteAlert = (alertId) => simulate(() => {
  write(KEY.alerts, read(KEY.alerts, NONE).filter((a) => a.id !== alertId));
}, LATENCY.quick);

/* ======================================================= Employer postings */

/** @returns {Promise<Object>} the new posting, with the id the board will use */
export const publishPosting = (posting) => simulate(() => {
  const existing = read(KEY.postings, NONE);
  const record = {
    ...posting,
    id: Math.max(10_000, ...existing.map((p) => p.id || 0)) + 1,
    postedHoursAgo: 0,
    createdAt: new Date().toISOString(),
    status: 'open',
    views: 0
  };

  write(KEY.postings, [record, ...existing]);
  return record;
}, LATENCY.normal);

/** @returns {Promise<Object>} the updated posting */
export const setPostingStatus = (id, status) => simulate(() => {
  const existing = read(KEY.postings, NONE);
  const target = existing.find((p) => p.id === Number(id));

  if (!target) throw new ApiError('That posting no longer exists.', 'not-found');

  const next = { ...target, status };
  write(KEY.postings, existing.map((p) => (p.id === Number(id) ? next : p)));
  return next;
}, LATENCY.quick);

export const deletePosting = (id) => simulate(() => {
  write(KEY.postings, read(KEY.postings, NONE).filter((p) => p.id !== Number(id)));
}, LATENCY.quick);

/* ================================================================ Profiles */

/** @returns {Promise<Object>} the stored profile */
export const saveProfile = (userId, profile) => simulate(() => {
  const all = read(KEY.profiles, NONE_BY_ID);
  const next = { ...emptyProfile(), ...(all[userId] || {}), ...profile };

  write(KEY.profiles, { ...all, [userId]: next });
  return next;
}, LATENCY.normal);
