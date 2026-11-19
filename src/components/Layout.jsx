/**
 * The frame around every page: header, footer, the mobile menu and the
 * toast messages. It also owns the light/dark theme.
 */

import { useEffect, useState } from 'react';
import { getTheme, setTheme } from '../lib/store.js';
import { currentUser } from '../lib/auth.js';
import Header from './Header.jsx';
import Drawer from './Drawer.jsx';
import Footer from './Footer.jsx';
import Toasts from './Toasts.jsx';

const systemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export default function Layout({ page, children }) {
  const user = currentUser();
  const [theme, setThemeState] = useState(() => getTheme() ?? systemTheme());
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* The CSS reads the theme from <html data-theme="...">. */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* Follow the operating system until the visitor picks a theme. */
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      if (!getTheme()) setThemeState(systemTheme());
    };
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  /* The page is drawn by JavaScript, so jump to a #section link ourselves. */
  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <Header page={page} user={user} theme={theme} onToggleTheme={toggleTheme}
              drawerOpen={drawerOpen} onOpenDrawer={() => setDrawerOpen(true)} />

      <main id="main">{children}</main>

      <footer className="foot"><Footer /></footer>

      <Toasts />

      <Drawer page={page} user={user} theme={theme} onToggleTheme={toggleTheme}
              open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
