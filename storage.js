/**
 * Browser storage.
 *
 * Everything the app remembers between visits lives here: saved roles,
 * theme choice, job alerts, and the demo account list. All of it is
 * localStorage — there is no server behind this project.
 */

const KEY = {
  saved: 'nexjob:saved',
  theme: 'nexjob:theme',
  alerts: 'nexjob:alerts',
  session: 'nexjob:session',
  accounts: 'nexjob:accounts'
};

/** Read and parse a key, returning `fallback` if it's missing or corrupt. */
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/* ---------------------------------------------------------------- Saved */

/** @returns {number[]} */
export const getSavedJobs = () => read(KEY.saved, []);

/**
 * Add or remove a role from the saved list.
 * @param {number|string} jobId
 * @returns {{saved: boolean, count: number}}
 */
export const toggleSaveJob = (jobId) => {
  const id = Number(jobId);
  const current = getSavedJobs();
  const wasSaved = current.includes(id);
  const next = wasSaved ? current.filter((n) => n !== id) : [...current, id];

  write(KEY.saved, next);
  return { saved: !wasSaved, count: next.length };
};

/** @returns {boolean} */
export const isJobSaved = (jobId) => getSavedJobs().includes(Number(jobId));

/* ---------------------------------------------------------------- Theme */

/**
 * The stored theme, defaulting to light for first-time visitors.
 * @returns {'light' | 'dark'}
 */
export const getTheme = () => {
  try {
    const stored = localStorage.getItem(KEY.theme);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* fall through to the default */ }

  return 'light';
};

/** @param {'light' | 'dark'} theme */
export const setTheme = (theme) => {
  try {
    localStorage.setItem(KEY.theme, theme);
  } catch { /* private mode — the choice just won't persist */ }
};

/* --------------------------------------------------------------- Alerts */

/** @param {{email: string, discipline: string, frequency: string}} alert */
export const saveAlert = (alert) => write(KEY.alerts, [
  ...read(KEY.alerts, []),
  { ...alert, createdAt: new Date().toISOString() }
]);

/* ------------------------------------------------------------- Accounts */

const AVATAR_COLOURS = ['#12503b', '#1f4d6b', '#6b3a5c', '#7a4a1c'];

/** Seeds two demo accounts the first time the app runs. */
const getAccounts = () => {
  const existing = read(KEY.accounts, null);
  if (existing) return existing;

  const seed = [
    {
      id: 1,
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      role: 'Software Engineer',
      avatarBg: '#12503b'
    },
    {
      id: 2,
      name: 'Alex Rivera',
      email: 'alex@example.com',
      password: 'password123',
      role: 'Product Designer',
      avatarBg: '#1f4d6b'
    }
  ];

  write(KEY.accounts, seed);
  return seed;
};

/** Strip the password before anything touches the session. */
const toSession = (account) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: account.role,
  initial: account.name.trim().charAt(0).toUpperCase(),
  avatarBg: account.avatarBg,
  signedInAt: new Date().toISOString()
});

/** @returns {Object|null} */
export const getCurrentUser = () => read(KEY.session, null);

/**
 * @param {string} email
 * @param {string} password
 * @returns {{ok: boolean, user?: Object, message?: string}}
 */
export const signIn = (email, password) => {
  const target = email.trim().toLowerCase();
  const account = getAccounts().find((a) => a.email.toLowerCase() === target);

  if (!account) {
    return { ok: false, message: 'No account uses that email address.' };
  }

  if (account.password !== password) {
    return { ok: false, message: 'That password does not match. Try again.' };
  }

  const user = toSession(account);
  write(KEY.session, user);
  return { ok: true, user };
};

/**
 * @param {{name: string, email: string, password: string, role?: string}} details
 * @returns {{ok: boolean, user?: Object, message?: string}}
 */
export const register = ({ name, email, password, role = 'Software Engineer' }) => {
  const accounts = getAccounts();
  const target = email.trim().toLowerCase();

  if (accounts.some((a) => a.email.toLowerCase() === target)) {
    return { ok: false, message: 'That email already has an account. Sign in instead.' };
  }

  const account = {
    id: Date.now(),
    name: name.trim(),
    email: target,
    password,
    role,
    avatarBg: AVATAR_COLOURS[accounts.length % AVATAR_COLOURS.length]
  };

  write(KEY.accounts, [...accounts, account]);

  const user = toSession(account);
  write(KEY.session, user);
  return { ok: true, user };
};

export const signOut = () => {
  try {
    localStorage.removeItem(KEY.session);
  } catch { /* nothing to clear */ }
};
