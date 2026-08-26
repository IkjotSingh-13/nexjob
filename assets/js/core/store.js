/**
 * Browser storage.
 *
 * There is no server behind this project, so localStorage is the database.
 * Every key is namespaced and versioned; a v1 migration runs once on boot
 * so anyone upgrading from the old single-page build keeps their saves.
 */

const NS = 'nexjob:v2:';

export const KEY = {
  session:      `${NS}session`,
  accounts:     `${NS}accounts`,
  saved:        `${NS}saved`,
  applications: `${NS}applications`,
  alerts:       `${NS}alerts`,
  postings:     `${NS}postings`,
  companies:    `${NS}companies`,
  profiles:     `${NS}profiles`,
  recent:       `${NS}recent`,
  theme:        `${NS}theme`,
  migrated:     `${NS}migrated`
};

/** The hiring pipeline, in order. Position on this track is the whole point. */
export const STAGES = [
  { id: 'applied',   label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer',     label: 'Offer' }
];

export const CLOSED_STAGE = { id: 'closed', label: 'Not moving forward' };

export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

export const stageLabel = (id) =>
  (id === CLOSED_STAGE.id ? CLOSED_STAGE : STAGES.find((s) => s.id === id))?.label ?? 'Applied';

/* ------------------------------------------------------------ Primitives */

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;   /* private mode, or quota — the app keeps working */
  }
};

const drop = (key) => {
  try { localStorage.removeItem(key); } catch { /* nothing to clear */ }
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* --------------------------------------------------------------- Migration
   The v1 build stored saves and theme under a flat namespace. Carry them
   across once, then leave the old keys alone. */

export const migrate = () => {
  if (read(KEY.migrated, false)) return;

  const oldSaved = read('nexjob:saved', null);
  if (Array.isArray(oldSaved) && oldSaved.length && !read(KEY.saved, []).length) {
    write(KEY.saved, oldSaved.map(Number));
  }

  const oldTheme = (() => { try { return localStorage.getItem('nexjob:theme'); } catch { return null; } })();
  if ((oldTheme === 'light' || oldTheme === 'dark') && read(KEY.theme, null) === null) {
    write(KEY.theme, oldTheme);
  }

  write(KEY.migrated, true);
};

/* ------------------------------------------------------------------ Theme */

export const getTheme = () => {
  const stored = read(KEY.theme, null);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

export const setTheme = (theme) => write(KEY.theme, theme);

/* ------------------------------------------------------------ Saved roles */

export const getSaved = () => read(KEY.saved, []).map(Number);

export const isSaved = (jobId) => getSaved().includes(Number(jobId));

export const toggleSaved = (jobId) => {
  const id = Number(jobId);
  const current = getSaved();
  const wasSaved = current.includes(id);
  const next = wasSaved ? current.filter((n) => n !== id) : [id, ...current];

  write(KEY.saved, next);
  return { saved: !wasSaved, count: next.length };
};

/* ------------------------------------------------------------ Recently seen */

export const pushRecent = (jobId) => {
  const id = Number(jobId);
  const next = [id, ...read(KEY.recent, []).map(Number).filter((n) => n !== id)].slice(0, 8);
  write(KEY.recent, next);
};

export const getRecent = () => read(KEY.recent, []).map(Number);

/* ------------------------------------------------------------ Applications */

export const getApplications = () => read(KEY.applications, []);

export const applicationsFor = (userId) =>
  getApplications().filter((a) => a.userId === userId);

export const applicationsForJob = (jobId) =>
  getApplications().filter((a) => Number(a.jobId) === Number(jobId));

export const hasApplied = (jobId, userId) =>
  getApplications().some((a) => Number(a.jobId) === Number(jobId) && a.userId === userId);

export const addApplication = (application) => {
  const record = {
    id: uid(),
    stage: STAGES[0].id,
    appliedAt: new Date().toISOString(),
    history: [{ stage: STAGES[0].id, at: new Date().toISOString() }],
    ...application
  };

  write(KEY.applications, [record, ...getApplications()]);
  return record;
};

export const setApplicationStage = (applicationId, stage) => {
  const next = getApplications().map((a) => (
    a.id === applicationId
      ? { ...a, stage, history: [...(a.history || []), { stage, at: new Date().toISOString() }] }
      : a
  ));

  write(KEY.applications, next);
  return next.find((a) => a.id === applicationId);
};

export const withdrawApplication = (applicationId) =>
  write(KEY.applications, getApplications().filter((a) => a.id !== applicationId));

/* ------------------------------------------------------------------ Alerts */

export const getAlerts = () => read(KEY.alerts, []);

export const addAlert = (alert) => {
  const record = { id: uid(), active: true, createdAt: new Date().toISOString(), ...alert };
  write(KEY.alerts, [record, ...getAlerts()]);
  return record;
};

export const toggleAlert = (alertId) =>
  write(KEY.alerts, getAlerts().map((a) => (a.id === alertId ? { ...a, active: !a.active } : a)));

export const removeAlert = (alertId) =>
  write(KEY.alerts, getAlerts().filter((a) => a.id !== alertId));

/* ------------------------------------------------- Employer job postings */

export const getPostings = () => read(KEY.postings, []);

export const addPosting = (posting) => {
  const existing = getPostings();
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
};

export const updatePosting = (id, patch) => {
  const next = getPostings().map((p) => (p.id === Number(id) ? { ...p, ...patch } : p));
  write(KEY.postings, next);
  return next.find((p) => p.id === Number(id));
};

export const removePosting = (id) =>
  write(KEY.postings, getPostings().filter((p) => p.id !== Number(id)));

/* -------------------------------------------------- Employer-made companies */

export const getCustomCompanies = () => read(KEY.companies, []);

export const addCustomCompany = (company) => {
  const existing = getCustomCompanies();
  if (existing.some((c) => c.id === company.id)) return company;
  write(KEY.companies, [...existing, company]);
  return company;
};

/* --------------------------------------------------------------- Profiles */

const emptyProfile = () => ({
  headline: '',
  about: '',
  location: '',
  discipline: 'Engineering',
  level: 'Mid',
  skills: [],
  experience: [],
  education: [],
  links: { website: '', github: '', linkedin: '' },
  openTo: []
});

export const getProfile = (userId) => ({
  ...emptyProfile(),
  ...(read(KEY.profiles, {})[userId] || {})
});

export const setProfile = (userId, profile) => {
  const all = read(KEY.profiles, {});
  all[userId] = { ...getProfile(userId), ...profile };
  write(KEY.profiles, all);
  return all[userId];
};

/**
 * How much of the profile is filled in, as a percentage. Weighted so the
 * fields employers actually read count for more.
 */
export const profileCompleteness = (profile) => {
  const checks = [
    [!!profile.headline, 2],
    [!!profile.about && profile.about.length > 40, 2],
    [!!profile.location, 1],
    [profile.skills.length >= 3, 2],
    [profile.experience.length >= 1, 3],
    [profile.education.length >= 1, 1],
    [Object.values(profile.links).some(Boolean), 1],
    [profile.openTo.length > 0, 1]
  ];

  const earned = checks.reduce((sum, [ok, weight]) => sum + (ok ? weight : 0), 0);
  const total = checks.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round((earned / total) * 100);
};

/* --------------------------------------------------- Accounts and session */

export const getAccounts = () => {
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

export const saveAccounts = (accounts) => write(KEY.accounts, accounts);

export const getSession = () => read(KEY.session, null);

export const setSession = (user) => write(KEY.session, user);

export const clearSession = () => drop(KEY.session);

export const newId = uid;
