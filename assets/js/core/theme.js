/**
 * Theme.
 *
 * Three states, as the stylesheet expects: an explicit light choice, an
 * explicit dark choice, and no choice at all — which follows the operating
 * system. The inline script in each page's <head> applies the stored value
 * before first paint so the page never flashes the wrong theme.
 */

import { getTheme, setTheme } from './store.js';
import { $$ } from './dom.js';

const systemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export const activeTheme = () => getTheme() ?? (systemPrefersDark() ? 'dark' : 'light');

const paint = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);

  const next = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;

  $$('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);

    const sun = button.querySelector('[data-icon-sun]');
    const moon = button.querySelector('[data-icon-moon]');
    if (sun) sun.hidden = theme !== 'dark';
    if (moon) moon.hidden = theme === 'dark';
  });

  $$('[data-theme-text]').forEach((node) => { node.textContent = `Switch to ${next}`; });
};

export const toggleTheme = () => {
  const next = activeTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  paint(next);
  return next;
};

export const initTheme = () => {
  paint(activeTheme());

  /* Follow the OS while the visitor has made no explicit choice. */
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => { if (!getTheme()) paint(activeTheme()); });
};
