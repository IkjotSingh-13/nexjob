/**
 * Browser storage.
 *
 * There is no server behind this project, so localStorage is the database.
 * Every key is namespaced and versioned; a v1 migration runs once on boot so
 * anyone upgrading from the old single-page build keeps their saves.
 *
 * Two things make it usable from React:
 *
 *  - It is subscribable. `subscribe` is the external-store contract that
 *    useSyncExternalStore expects, so a write anywhere re-renders every
 *    component that reads the key — no manual re-render calls.
 *  - `read` hands back the *same object* while the stored text is unchanged.
 *    useSyncExternalStore compares snapshots by identity; parsing fresh JSON
 *    on every call would look like a change each time and loop forever.
 *
 * Treat everything `read` returns as immutable. Write a new value instead.
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

/** Shared, frozen fallbacks, so "nothing stored yet" is also a stable snapshot. */
export const NONE = Object.freeze([]);
export const NONE_BY_ID = Object.freeze({});

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------ Primitives */

const listeners = new Set();
const memory = new Map();   /* values localStorage refused: private mode, or quota */
const parsed = new Map();   /* key -> { raw, value } */

const rawOf = (key) => {
  if (memory.has(key)) return memory.get(key);
  try { return localStorage.getItem(key); } catch { return null; }
};

export const read = (key, fallback) => {
  const raw = rawOf(key);
  if (raw === null) return fallback;

  const hit = parsed.get(key);
  if (hit?.raw === raw) return hit.value;

  try {
    const value = JSON.parse(raw);
    parsed.set(key, { raw, value });
    return value;
  } catch {
    return fallback;
  }
};

const emit = () => listeners.forEach((listener) => listener());

let watchingOtherTabs = false;

export const subscribe = (listener) => {
  listeners.add(listener);

  /* A write from another tab arrives as a `storage` event. */
  if (!watchingOtherTabs) {
    window.addEventListener('storage', emit);
    watchingOtherTabs = true;
  }

  return () => { listeners.delete(listener); };
};

/**
 * @returns {boolean} whether the value reached localStorage. When it did not
 * the app keeps working from memory for the rest of the session.
 */
export const write = (key, value) => {
  const raw = JSON.stringify(value);
  let persisted = true;

  try {
    localStorage.setItem(key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
    persisted = false;
  }

  emit();
  return persisted;
};

export const drop = (key) => {
  try {
    localStorage.removeItem(key);
    memory.delete(key);
  } catch {
    memory.set(key, null);   /* null reads as "nothing stored" */
  }

  emit();
};

/* --------------------------------------------------------------- Migration
   The v1 build stored saves and theme under a flat namespace. Carry them
   across once, then leave the old keys alone. */

export const migrate = () => {
  if (read(KEY.migrated, false)) return;

  const oldSaved = read('nexjob:saved', null);
  if (Array.isArray(oldSaved) && oldSaved.length && !read(KEY.saved, NONE).length) {
    write(KEY.saved, oldSaved.map(Number));
  }

  const oldTheme = (() => { try { return localStorage.getItem('nexjob:theme'); } catch { return null; } })();
  if ((oldTheme === 'light' || oldTheme === 'dark') && read(KEY.theme, null) === null) {
    write(KEY.theme, oldTheme);
  }

  write(KEY.migrated, true);
};
