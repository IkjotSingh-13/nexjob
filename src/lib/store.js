/**
 * Browser storage.
 *
 * Jobs and companies live in MySQL (see lib/api.js and backend/). Everything
 * else the app remembers is kept here in localStorage. The keys are the same
 * ones the plain HTML version used, so saved data carries over.
 *
 * localStorage can only hold text, so every value is turned into JSON text
 * when it is saved (JSON.stringify) and back into a value when it is read (JSON.parse).
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
    const text = localStorage.getItem(key);
    if (text === null) {
      return fallback;   // nothing saved under this key yet
    }
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage is full or switched off: carry on without saving */
  }
};

const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/** A random id such as "lq2x9k3ab1c". The time in base 36, plus 5 random characters. */
export const newId = () => {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 7);
  return timePart + randomPart;
};

/** The time now, as text: "2026-11-23T10:15:00.000Z". */
const now = () => new Date().toISOString();

/* The very first version stored saves and theme under older key names.
   Copy them across once. */
export const migrate = () => {
  const alreadyDone = read(KEY.migrated, false);
  if (alreadyDone) return;

  const oldSaved = read('nexjob:saved', null);
  const newSaved = read(KEY.saved, []);
  if (Array.isArray(oldSaved) && oldSaved.length > 0 && newSaved.length === 0) {
    write(KEY.saved, oldSaved.map(Number));
  }

  let oldTheme = null;
  try {
    oldTheme = localStorage.getItem('nexjob:theme');
  } catch {
    /* ignore */
  }
  const isRealTheme = oldTheme === 'light' || oldTheme === 'dark';
  if (isRealTheme && read(KEY.theme, null) === null) {
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

/** Where a stage is in the list: 'applied' -> 0, 'offer' -> 3, unknown -> -1. */
export const stageIndex = (id) => {
  return STAGES.findIndex((stage) => stage.id === id);
};

/** 'interview' -> "Interview". */
export const stageLabel = (id) => {
  if (id === CLOSED_STAGE.id) {
    return CLOSED_STAGE.label;
  }
  for (const stage of STAGES) {
    if (stage.id === id) return stage.label;
  }
  return 'Applied';
};

/* ------------------------------------------------------------------- Theme */

/** 'light', 'dark', or null when the visitor has not picked one. */
export const getTheme = () => {
  const theme = read(KEY.theme, null);
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  return null;
};

export const setTheme = (theme) => write(KEY.theme, theme);

/* ------------------------------------------------------------- Saved roles */

/** The ids of the saved roles, as numbers. */
export const getSaved = () => read(KEY.saved, []).map(Number);

export const isSaved = (jobId) => getSaved().includes(Number(jobId));

/** Save or unsave a role. Returns true if it is now saved. */
export const toggleSaved = (jobId) => {
  const id = Number(jobId);
  const saved = getSaved();

  if (saved.includes(id)) {
    write(KEY.saved, saved.filter((n) => n !== id));   // take it out
    return false;
  }

  write(KEY.saved, [id, ...saved]);   // put it at the front
  return true;
};

/* ---------------------------------------------------------- Recently viewed */

export const getRecent = () => read(KEY.recent, []).map(Number);

/** Remember that a role was viewed. The newest is first, and only 8 are kept. */
export const pushRecent = (jobId) => {
  const id = Number(jobId);
  const others = getRecent().filter((n) => n !== id);   // every other viewed role
  const recent = [id, ...others];                        // this one goes first
  write(KEY.recent, recent.slice(0, 8));
};

/* ------------------------------------------------------------- Applications */

export const getApplications = () => read(KEY.applications, []);

export const applicationsFor = (userId) => {
  return getApplications().filter((application) => application.userId === userId);
};

export const applicationsForJob = (jobId) => {
  return getApplications().filter((application) => Number(application.jobId) === Number(jobId));
};

export const hasApplied = (jobId, userId) => {
  return applicationsFor(userId).some((application) => Number(application.jobId) === Number(jobId));
};

export const addApplication = (details) => {
  const record = {
    id: newId(),
    stage: 'applied',
    appliedAt: now(),
    history: [{ stage: 'applied', at: now() }],
    ...details             // name, email, jobId ... from the form
  };
  write(KEY.applications, [record, ...getApplications()]);   // newest first
  return record;
};

/** Move an application to another stage, and note the move in its history. */
export const setApplicationStage = (applicationId, stage) => {
  const all = getApplications();

  for (const application of all) {
    if (application.id === applicationId) {
      const history = application.history || [];
      history.push({ stage: stage, at: now() });

      application.stage = stage;
      application.history = history;
    }
  }

  write(KEY.applications, all);
};

export const withdrawApplication = (applicationId) => {
  const others = getApplications().filter((application) => application.id !== applicationId);
  write(KEY.applications, others);
};

/* ------------------------------------------------------------------- Alerts */

export const getAlerts = () => read(KEY.alerts, []);

export const addAlert = (details) => {
  const alert = { id: newId(), active: true, createdAt: now(), ...details };
  write(KEY.alerts, [alert, ...getAlerts()]);   // newest first
};

/** Switch an alert on or off. */
export const toggleAlert = (alertId) => {
  const all = getAlerts();
  for (const alert of all) {
    if (alert.id === alertId) {
      alert.active = !alert.active;
    }
  }
  write(KEY.alerts, all);
};

export const removeAlert = (alertId) => {
  const others = getAlerts().filter((alert) => alert.id !== alertId);
  write(KEY.alerts, others);
};

/* ----------------------------------------- Companies created by employers */

export const getCustomCompanies = () => read(KEY.companies, []);

/** Add a company, unless one with the same id is already there. */
export const addCustomCompany = (company) => {
  const companies = getCustomCompanies();
  const alreadyThere = companies.some((c) => c.id === company.id);
  if (!alreadyThere) {
    write(KEY.companies, [...companies, company]);
  }
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

/** A user's profile. Anything they have not filled in comes from emptyProfile. */
export const getProfile = (userId) => {
  const allProfiles = read(KEY.profiles, {});   // { userId: profile, ... }
  const saved = allProfiles[userId] || {};
  return { ...emptyProfile, ...saved };
};

export const setProfile = (userId, profile) => {
  const allProfiles = read(KEY.profiles, {});
  allProfiles[userId] = { ...getProfile(userId), ...profile };
  write(KEY.profiles, allProfiles);
  return allProfiles[userId];
};

/** True when at least one of the profile's links is filled in. */
const hasAnyLink = (links) => {
  for (const name in links) {
    if (links[name]) return true;
  }
  return false;
};

/** How much of a profile is filled in, 0–100. Some parts count more than others. */
export const profileChecks = (profile) => [
  { label: 'Headline',               done: Boolean(profile.headline),                            weight: 2 },
  { label: 'About',                  done: profile.about.length > 40,                            weight: 2 },
  { label: 'Location',               done: Boolean(profile.location),                            weight: 1 },
  { label: 'Three or more skills',   done: profile.skills.length >= 3,                           weight: 2 },
  { label: 'One role of experience', done: profile.experience.length >= 1,                       weight: 3 },
  { label: 'Education',              done: profile.education.length >= 1,                        weight: 1 },
  { label: 'A link',                 done: hasAnyLink(profile.links),                            weight: 1 },
  { label: 'What you are open to',   done: profile.openTo.length > 0,                            weight: 1 }
];

export const profileCompleteness = (profile) => {
  let earned = 0;   // weight of the parts that are done
  let total = 0;    // weight of every part

  for (const check of profileChecks(profile)) {
    total += check.weight;
    if (check.done) {
      earned += check.weight;
    }
  }

  return Math.round((earned / total) * 100);
};

/* ------------------------------------------------------- Accounts, session */

const DEMO_ACCOUNTS = [
  { id: 'u-jane', name: 'Jane Okafor', email: 'jane@example.com', password: 'password123',
    role: 'seeker', avatarBg: '#2B36C4' },
  { id: 'u-alex', name: 'Alex Rivera', email: 'alex@example.com', password: 'password123',
    role: 'employer', companyId: 'linear', avatarBg: '#17694A' }
];

/** Every account. The first time, the two demo accounts are saved and returned. */
export const getAccounts = () => {
  const accounts = read(KEY.accounts, null);
  if (accounts) {
    return accounts;
  }
  write(KEY.accounts, DEMO_ACCOUNTS);
  return DEMO_ACCOUNTS;
};

export const saveAccounts = (accounts) => write(KEY.accounts, accounts);

export const getSession = () => read(KEY.session, null);

export const setSession = (user) => write(KEY.session, user);

export const clearSession = () => remove(KEY.session);
