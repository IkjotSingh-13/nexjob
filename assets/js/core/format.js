/**
 * Formatting and scale maths.
 *
 * The scale functions are the arithmetic behind the product's one visual
 * idea: a salary is not a string, it is a position on a shared domain.
 */

/* ------------------------------------------------------------------ Money */

/** 140000 -> "$140k". Compact, and what fits on a card. */
export const money = (n) => {
  const v = Number(n) || 0;
  return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
};

/** 140000 -> "$140,000". Used where precision reads better than brevity. */
export const moneyFull = (n) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format(Number(n) || 0);

export const band = (min, max) => `${money(min)} – ${money(max)}`;

/* ------------------------------------------------------------------- Time */

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Listings carry `postedHoursAgo` rather than a fixed date, so a demo
 * checked out a year from now still reads as a live board.
 */
export const postedDate = (job) =>
  new Date(Date.now() - (Number(job.postedHoursAgo) || 0) * 3600_000);

export const relTime = (date) => {
  const then = date instanceof Date ? date : new Date(date);
  const mins = Math.round((then - Date.now()) / 60_000);

  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  if (Math.abs(mins) < 60 * 24) return rtf.format(Math.round(mins / 60), 'hour');
  if (Math.abs(mins) < 60 * 24 * 30) return rtf.format(Math.round(mins / 1440), 'day');
  return rtf.format(Math.round(mins / 43_200), 'month');
};

export const dateShort = (date) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric'
}).format(date instanceof Date ? date : new Date(date));

/* ------------------------------------------------------------------ Scale */

/**
 * The shared domain, rounded outward to a round number so the axis labels
 * are readable. Recomputed from the data, never hard-coded.
 */
export const domainFor = (jobs) => {
  const mins = jobs.map((j) => j.salaryMin).filter(Number.isFinite);
  const maxes = jobs.map((j) => j.salaryMax).filter(Number.isFinite);
  if (!mins.length) return { min: 0, max: 100_000 };

  const step = 20_000;
  return {
    min: Math.floor(Math.min(...mins) / step) * step,
    max: Math.ceil(Math.max(...maxes) / step) * step
  };
};

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Map a value onto the domain as a 0–100 percentage. */
export const posOn = (value, domain) => {
  const span = domain.max - domain.min || 1;
  return clamp(((value - domain.min) / span) * 100, 0, 100);
};

/** Evenly spaced axis labels across the domain, inclusive of both ends. */
export const axisTicks = (domain, count = 5) =>
  Array.from({ length: count }, (_, i) =>
    domain.min + ((domain.max - domain.min) * i) / (count - 1));

/** Where a value falls among a sorted set, as a percentile. */
export const percentileOf = (value, values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  return Math.round((below / sorted.length) * 100);
};

export const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/* ------------------------------------------------------------------- Text */

export const initials = (name = '') => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || '?';

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const titleCase = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/** Deterministic colour for a generated avatar or company mark. */
const PALETTE = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A', '#A22525'];

export const colourFor = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};
