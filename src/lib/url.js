/**
 * Query-string helpers.
 *
 * Filter state lives in the address bar so a filtered board is shareable and
 * the back button behaves. React Router owns the reading; this only builds.
 */

/** Drop empty values and join arrays with commas. */
export const toSearchParams = (params) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0)) return;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });

  return search;
};

/** A path with an optional query string: link('/jobs', { q: 'react' }) -> '/jobs?q=react'. */
export const link = (path, params = {}) => {
  const search = toSearchParams(params).toString();
  return search ? `${path}?${search}` : path;
};

/**
 * Only follow a `next` that points inside the app. Anything that could leave
 * the site — an absolute URL, a protocol-relative `//host` — is ignored.
 */
export const safeNext = (next) =>
  (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : null);
