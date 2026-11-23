/**
 * Browser storage.
 *
 * Jobs and companies live in MySQL (see lib/api.js and backend/). Everything
 * else the app remembers is kept here in localStorage. The keys are the same
 * ones the plain HTML version used, so saved data carries over.
 */

const KEY = {
  session:      'nexjob:v2:session',
  accounts:     'nexjob:v2:accounts',
  saved:        'nexjob:v2:saved',
  applications: 'nexjob:v2:applications',
  alerts:       'nexjob:v2:alerts',
  companies:    'nexjob:v2:companies',
  profiles:     'nexjob:v2:profiles',
  recent:       'nexjob:v2:recent',
  theme:        'nexjob:v2:theme',
  migrated:     'nexjob:v2:migrated'
};

/* Read and write JSON. Both fail quietly (private mode, full storage) so the
   app keeps working without storage. */
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

const remove = (key) => {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
};

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const now = () => new Date().toISOString();

/* The very first version stored saves and theme under older key names.
   Copy them across once. */
export const migrate = () => {
  if (read(KEY.migrated, false)) return;

  const oldSaved = read('nexjob:saved', null);
  if (Array.isArray(oldSaved) && oldSaved.length && !read(KEY.saved, []).length) {
    write(KEY.saved, oldSaved.map(Number));
  }

  let oldTheme = null;
  try { oldTheme = localStorage.getItem('nexjob:theme'); } catch { /* ignore */ }
  if ((oldTheme === 'light' || oldTheme === 'dark') && read(KEY.theme, null) === null) {
    write(KEY.theme, oldTheme);
  }

  write(KEY.migrated, true);
};

/* ---------------------------------------------------------------- Pipeline */

export const STAGES = [
  { id: 'applied',   label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer',     label: 'Offer' }
];

export const CLOSED_STAGE = { id: 'closed', label: 'Not moving forward' };

export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

export const stageLabel = (id) => {
  if (id === CLOSED_STAGE.id) return CLOSED_STAGE.label;
  return STAGES.find((s) => s.id === id)?.label ?? 'Applied';
};

/* ------------------------------------------------------------------- Theme */

/** 'light', 'dark', or null when the visitor has not picked one. */
export const getTheme = () => {
  const theme = read(KEY.theme, null);
  return theme === 'light' || theme === 'dark' ? theme : null;
};

export const setTheme = (theme) => write(KEY.theme, theme);

/* ------------------------------------------------------------- Saved roles */

export const getSaved = () => read(KEY.saved, []).map(Number);

export const isSaved = (jobId) => getSaved().includes(Number(jobId));

/** Save or unsave a role. Returns true if it is now saved. */
export const toggleSaved = (jobId) => {
  const id = Number(jobId);
  const saved = getSaved();
  const wasSaved = saved.includes(id);
  write(KEY.saved, wasSaved ? saved.filter((n) => n !== id) : [id, ...saved]);
  return !wasSaved;
};

/* ---------------------------------------------------------- Recently viewed */

export const getRecent = () => read(KEY.recent, []).map(Number);

export const pushRecent = (jobId) => {
  const id = Number(jobId);
  write(KEY.recent, [id, ...getRecent().filter((n) => n !== id)].slice(0, 8));
};

/* ------------------------------------------------------------- Applications */

export const getApplications = () => read(KEY.applications, []);

export const applicationsFor = (userId) => getApplications().filter((a) => a.userId === userId);

export const applicationsForJob = (jobId) =>
  getApplications().filter((a) => Number(a.jobId) === Number(jobId));

export const hasApplied = (jobId, userId) =>
  applicationsFor(userId).some((a) => Number(a.jobId) === Number(jobId));

export const addApplication = (details) => {
  const record = {
    id: newId(),
    stage: 'applied',
    appliedAt: now(),
    history: [{ stage: 'applied', at: now() }],
    ...details
  };
  write(KEY.applications, [record, ...getApplications()]);
  return record;
};

export const setApplicationStage = (applicationId, stage) => {
  const all = getApplications().map((a) => (
    a.id === applicationId ? { ...a, stage, history: [...(a.history || []), { stage, at: now() }] } : a
  ));
  write(KEY.applications, all);
};

export const withdrawApplication = (applicationId) =>
  write(KEY.applications, getApplications().filter((a) => a.id !== applicationId));

/* ------------------------------------------------------------------- Alerts */

export const getAlerts = () => read(KEY.alerts, []);

export const addAlert = (details) =>
  write(KEY.alerts, [{ id: newId(), active: true, createdAt: now(), ...details }, ...getAlerts()]);

export const toggleAlert = (alertId) =>
  write(KEY.alerts, getAlerts().map((a) => (a.id === alertId ? { ...a, active: !a.active } : a)));

export const removeAlert = (alertId) =>
  write(KEY.alerts, getAlerts().filter((a) => a.id !== alertId));

/* ----------------------------------------- Companies created by employers */

export const getCustomCompanies = () => read(KEY.companies, []);

export const addCustomCompany = (company) => {
  const companies = getCustomCompanies();
  if (!companies.some((c) => c.id === company.id)) write(KEY.companies, [...companies, company]);
};

/* ----------------------------------------------------------------- Profiles */

const emptyProfile = {
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
};

export const getProfile = (userId) => ({ ...emptyProfile, ...(read(KEY.profiles, {})[userId] || {}) });

export const setProfile = (userId, profile) => {
  const all = read(KEY.profiles, {});
  all[userId] = { ...getProfile(userId), ...profile };
  write(KEY.profiles, all);
  return all[userId];
};

/** How much of a profile is filled in, 0–100. Some parts count more than others. */
export const profileChecks = (profile) => [
  { label: 'Headline',               done: !!profile.headline,                               weight: 2 },
  { label: 'About',                  done: profile.about.length > 40,                        weight: 2 },
  { label: 'Location',               done: !!profile.location,                               weight: 1 },
  { label: 'Three or more skills',   done: profile.skills.length >= 3,                       weight: 2 },
  { label: 'One role of experience', done: profile.experience.length >= 1,                   weight: 3 },
  { label: 'Education',              done: profile.education.length >= 1,                    weight: 1 },
  { label: 'A link',                 done: Object.values(profile.links).some(Boolean),       weight: 1 },
  { label: 'What you are open to',   done: profile.openTo.length > 0,                        weight: 1 }
];

export const profileCompleteness = (profile) => {
  const checks = profileChecks(profile);
  const earned = checks.filter((c) => c.done).reduce((sum, c) => sum + c.weight, 0);
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  return Math.round((earned / total) * 100);
};

/* ------------------------------------------------------- Accounts, session */

const DEMO_ACCOUNTS = [
  { id: 'u-jane', name: 'Jane Okafor', email: 'jane@example.com', password: 'password123',
    role: 'seeker', avatarBg: '#2B36C4' },
  { id: 'u-alex', name: 'Alex Rivera', email: 'alex@example.com', password: 'password123',
    role: 'employer', companyId: 'linear', avatarBg: '#17694A' }
];

export const getAccounts = () => {
  const accounts = read(KEY.accounts, null);
  if (accounts) return accounts;
  write(KEY.accounts, DEMO_ACCOUNTS);
  return DEMO_ACCOUNTS;
};

export const saveAccounts = (accounts) => write(KEY.accounts, accounts);

export const getSession = () => read(KEY.session, null);

export const setSession = (user) => write(KEY.session, user);

export const clearSession = () => remove(KEY.session);
