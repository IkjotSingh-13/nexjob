/**
 * Small helpers for money, dates, text and the pay scale.
 * None of these know about React — they take values and return values.
 */

/* ---------------------------------------------------------------- Money */

/** 140000 -> "$140k". Short, and fits on a card. */
export const money = (n) => {
  const value = Number(n) || 0;
  return value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`;
};

/** 140000 -> "$140,000". */
export const moneyFull = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(Number(n) || 0);

/* ----------------------------------------------------------------- Time */

/** Listings store "posted N hours ago", so the demo always looks fresh. */
export const postedDate = (job) => new Date(Date.now() - (Number(job.postedHoursAgo) || 0) * 3600000);

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 hours ago", "yesterday", "2 months ago". */
export const relTime = (date) => {
  const mins = Math.round((new Date(date) - Date.now()) / 60000);
  const size = Math.abs(mins);

  if (size < 60) return rtf.format(mins, 'minute');
  if (size < 60 * 24) return rtf.format(Math.round(mins / 60), 'hour');
  if (size < 60 * 24 * 30) return rtf.format(Math.round(mins / 1440), 'day');
  return rtf.format(Math.round(mins / 43200), 'month');
};

/** "19 Nov 2026". */
export const dateShort = (date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(date));

/* ---------------------------------------------------------------- Scale */

/** The lowest and highest pay on the board, rounded out to the nearest $20k. */
export const domainFor = (jobs) => {
  if (!jobs.length) return { min: 0, max: 100000 };
  const step = 20000;
  return {
    min: Math.floor(Math.min(...jobs.map((j) => j.salaryMin)) / step) * step,
    max: Math.ceil(Math.max(...jobs.map((j) => j.salaryMax)) / step) * step
  };
};

/** Where a value sits on the domain, as 0–100 (%). */
export const posOn = (value, domain) => {
  const percent = ((value - domain.min) / (domain.max - domain.min || 1)) * 100;
  return Math.min(100, Math.max(0, percent));
};

/** Evenly spaced labels under a scale, both ends included. */
export const axisTicks = (domain, count = 5) =>
  Array.from({ length: count }, (_, i) => domain.min + ((domain.max - domain.min) * i) / (count - 1));

/** What percentage of `values` are below `value`. */
export const percentileOf = (value, values) => {
  if (!values.length) return 0;
  const below = values.filter((v) => v < value).length;
  return Math.round((below / values.length) * 100);
};

export const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/* ----------------------------------------------------------------- Text */

/** "Jane Okafor" -> "JO". */
export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?';

/** plural(1, 'role') -> "1 role", plural(3, 'role') -> "3 roles". */
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The same name always gets the same colour. */
const PALETTE = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A', '#A22525'];

export const colourFor = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};
