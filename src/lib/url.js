/**
 * The address bar.
 *
 * The site uses React Router's HashRouter, so the page and its ?query sit
 * after the #, e.g.  index.html#/job?id=3  is page "/job" with id=3.
 * (A # address works on GitHub Pages, which can only serve files.)
 */

/** The ?query part of the address. */
export const getParams = () => new URLSearchParams(window.location.hash.split('?')[1] || '');

/** One value from the address, e.g. getParam('id') on #/job?id=3 gives "3". */
export const getParam = (name) => getParams().get(name) || '';

/**
 * Build a link to another page. Empty values are left out.
 * pageUrl('/jobs', { q: 'React', where: '' })  ->  "/jobs?q=React"
 */
export const pageUrl = (page, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `${page}?${text}` : page;
};

/*
 * Change the address bar without opening a new page. The board uses this to
 * keep its filters in the address, and the prep page for the company picked.
 * React Router's own history state is passed along unchanged, so the router
 * does not treat it as a new page.
 */
export const replaceAddress = (path) => window.history.replaceState(window.history.state, '', `#${path}`);

export const pushAddress = (path) => window.history.pushState(window.history.state, '', `#${path}`);
