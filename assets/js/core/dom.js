/**
 * DOM helpers.
 *
 * Small, boring, and used everywhere. Nothing here knows what a job is.
 */

export const $ = (selector, root = document) => root.querySelector(selector);

export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/** Escape a value before it goes anywhere near innerHTML. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

/** Escape a value for use inside a single-quoted HTML attribute. */
export const escAttr = (value) => esc(value).replace(/\n/g, ' ');

export const on = (target, type, handler, options) => {
  target?.addEventListener(type, handler, options);
  return () => target?.removeEventListener(type, handler, options);
};

/**
 * Event delegation. Handler receives (event, matchedElement).
 * Survives re-renders, which is why almost every list uses it.
 */
export const delegate = (root, type, selector, handler) =>
  on(root, type, (event) => {
    const match = event.target.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  });

/** Replace a node's contents and return the node. */
export const html = (node, markup) => {
  if (node) node.innerHTML = markup;
  return node;
};

/** Read a data attribute as a number, falling back when absent. */
export const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Debounce, for search inputs that fire on every keystroke. */
export const debounce = (fn, wait = 220) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

/** Current query string as a plain object. */
export const query = () => Object.fromEntries(new URLSearchParams(location.search));

/**
 * Write params into the address bar without reloading, so filter state is
 * shareable and the back button behaves.
 * @param {Object} params  keys with empty values are dropped
 * @param {boolean} push   true to add a history entry, false to replace
 */
export const setQuery = (params, push = false) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0)) return;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });

  const next = `${location.pathname}${search.toString() ? `?${search}` : ''}`;
  history[push ? 'pushState' : 'replaceState'](null, '', next);
};

/** Build a URL relative to the site root, preserving the ./ convention. */
export const url = (page, params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  return `./${page}${search.toString() ? `?${search}` : ''}`;
};
