/**
 * Small helpers for money, dates, text, lists and the pay scale.
 * None of these know about React: each one takes values and returns a value.
 */

/* ---------------------------------------------------------------- Money */

/** 140000 -> "$140k". Short, so it fits on a card. */
export const money = (n) => {
  const value = Number(n) || 0;   // not a number? use 0
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${value}`;
};

/** 140000 -> "$140,000". */
export const moneyFull = (n) => {
  const value = Number(n) || 0;
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return formatter.format(value);
};

/* ----------------------------------------------------------------- Time */

const HOUR = 60 * 60 * 1000;   // one hour in milliseconds

/** Listings store "posted N hours ago", so the demo always looks fresh. This turns it into a date. */
export const postedDate = (job) => {
  const hoursAgo = Number(job.postedHoursAgo) || 0;
  return new Date(Date.now() - hoursAgo * HOUR);
};

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 hours ago", "yesterday", "2 months ago". */
export const relTime = (date) => {
  const minutes = Math.round((new Date(date) - Date.now()) / 60000);   // negative = in the past
  const size = Math.abs(minutes);

  if (size < 60) {
    return relativeFormatter.format(minutes, 'minute');
  }
  if (size < 60 * 24) {
    return relativeFormatter.format(Math.round(minutes / 60), 'hour');
  }
  if (size < 60 * 24 * 30) {
    return relativeFormatter.format(Math.round(minutes / 1440), 'day');
  }
  return relativeFormatter.format(Math.round(minutes / 43200), 'month');
};

/** "19 Nov 2026". */
export const dateShort = (date) => {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return formatter.format(new Date(date));
};

/* ----------------------------------------------------------------- Lists */

/** The smallest number in a list. smallest([3, 1, 2]) -> 1 */
export const smallest = (numbers) => {
  let result = numbers[0];
  for (const n of numbers) {
    if (n < result) result = n;
  }
  return result;
};

/** The biggest number in a list. biggest([3, 1, 2]) -> 3 */
export const biggest = (numbers) => {
  let result = numbers[0];
  for (const n of numbers) {
    if (n > result) result = n;
  }
  return result;
};

/** Each value once, in the order first seen. unique(['b', 'a', 'b']) -> ['b', 'a'] */
export const unique = (values) => {
  const result = [];
  for (const value of values) {
    if (!result.includes(value)) {
      result.push(value);
    }
  }
  return result;
};

/** Each value once, in A–Z order. uniqueSorted(['b', 'a', 'b']) -> ['a', 'b'] */
export const uniqueSorted = (values) => unique(values).sort();

/* ---------------------------------------------------------------- Scale */

/** The lowest and highest pay on the board, rounded out to the nearest $20k. */
export const domainFor = (jobs) => {
  if (jobs.length === 0) {
    return { min: 0, max: 100000 };
  }

  const step = 20000;
  const lowest = smallest(jobs.map((job) => job.salaryMin));
  const highest = biggest(jobs.map((job) => job.salaryMax));

  return {
    min: Math.floor(lowest / step) * step,   // round down: 137k -> 120k
    max: Math.ceil(highest / step) * step    // round up:   305k -> 320k
  };
};

/** Where a value sits on the domain, as a percentage from 0 to 100. */
export const posOn = (value, domain) => {
  const width = domain.max - domain.min || 1;   // never divide by 0
  const percent = ((value - domain.min) / width) * 100;

  if (percent < 0) return 0;
  if (percent > 100) return 100;
  return percent;
};

/** Evenly spaced labels under a scale, both ends included. */
export const axisTicks = (domain, count = 5) => {
  const ticks = [];
  for (let i = 0; i < count; i += 1) {
    ticks.push(domain.min + ((domain.max - domain.min) * i) / (count - 1));
  }
  return ticks;
};

/** What percentage of `values` are below `value`. */
export const percentileOf = (value, values) => {
  if (values.length === 0) return 0;

  let below = 0;
  for (const v of values) {
    if (v < value) below += 1;
  }
  return Math.round((below / values.length) * 100);
};

/** The middle value. With an even count, the average of the two middle ones. */
export const median = (values) => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);   // copy, then sort small to big
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];   // odd count: one middle value
  }
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

/* ----------------------------------------------------------------- Text */

/** "Jane Okafor" -> "JO". First letters of the first two words. */
export const initials = (name = '') => {
  const words = name.trim().split(/\s+/);   // split on spaces
  let result = '';

  for (const word of words.slice(0, 2)) {
    result += word.charAt(0).toUpperCase();
  }
  return result || '?';
};

/** plural(1, 'role') -> "1 role", plural(3, 'role') -> "3 roles". */
export const plural = (n, one, many = `${one}s`) => {
  if (n === 1) return `${n} ${one}`;
  return `${n} ${many}`;
};

/** The same name always gets the same colour. */
const PALETTE = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A', '#A22525'];

export const colourFor = (seed = '') => {
  /* Turn the text into a number. The same text always gives the same number. */
  let number = 0;
  for (let i = 0; i < seed.length; i += 1) {
    number = (number * 31 + seed.charCodeAt(i)) % 4294967296;   // keep it below 2^32
  }
  return PALETTE[number % PALETTE.length];
};
