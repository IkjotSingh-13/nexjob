/** A value from the address bar, e.g. getParam('id') on job.html?id=3 gives "3". */
export const getParam = (name) => new URLSearchParams(location.search).get(name) || '';

/**
 * Build a link to another page. Empty values are left out.
 * pageUrl('jobs.html', { q: 'React', where: '' })  ->  "./jobs.html?q=React"
 */
export const pageUrl = (page, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `./${page}?${text}` : `./${page}`;
};
