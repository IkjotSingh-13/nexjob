/**
 * The frame around every page: header, footer and the mobile menu.
 * It also owns the light/dark theme, the browser tab title and signing out.
 *
 * main.jsx gives it a new key on every page visit, so it starts fresh each
 * time (menu closed, scrolled to the top), like opening a new page.
 */

import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getTheme, setTheme } from '../lib/store.js';
import { signOut } from '../lib/auth.js';
import { UserContext } from '../lib/UserContext.jsx';
import Header from './Header.jsx';
import Drawer from './Drawer.jsx';
import Footer from './Footer.jsx';

/** The browser tab title for each page. Some pages change it again once their data loads. */
const TITLES = {
  home: 'Nexjob — every salary on one scale',
  jobs: 'Browse roles — Nexjob',
  job: 'Role — Nexjob',
  companies: 'Companies hiring — Nexjob',
  company: 'Company — Nexjob',
  salaries: 'Pay explorer — Nexjob',
  prep: 'How to get in — Nexjob',
  dashboard: 'Your dashboard — Nexjob',
  profile: 'Profile and CV — Nexjob',
  'post-job': 'Post a role — Nexjob',
  employer: 'Employer dashboard — Nexjob',
  auth: 'Sign in — Nexjob'
};

/** The computer's own setting: 'dark' or 'light'. */
const systemTheme = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) return 'dark';
  return 'light';
};

/** The theme the visitor picked, or else the computer's own setting. */
const startingTheme = () => {
  const picked = getTheme();   // 'light', 'dark' or null
  if (picked) return picked;
  return systemTheme();
};

export default function Layout({ children }) {
  const { user, setUser } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
  const page = location.pathname.slice(1) || 'home';   // "/jobs" -> "jobs"

  const [theme, setThemeState] = useState(startingTheme);
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

  /* A new page: name the browser tab, then jump to a #section link or to the top. */
  useEffect(() => {
    document.title = TITLES[page] || 'Page not found — Nexjob';

    if (location.hash) {
      const section = document.getElementById(location.hash.slice(1));   // "#alerts" -> the element with id "alerts"
      if (section) {
        section.scrollIntoView();
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  const toggleTheme = () => {
    let next = 'dark';
    if (theme === 'dark') {
      next = 'light';
    }
    setTheme(next);        // remember it in localStorage
    setThemeState(next);   // and redraw with it
  };

  const signOutAndLeave = () => {
    signOut();        // forget the session in localStorage
    setUser(null);    // tell every component, through the context
    navigate('/');
  };

  /* The # in the address belongs to the router, so move to <main> by hand. */
  const skipToContent = (event) => {
    event.preventDefault();
    document.getElementById('main').focus();
  };

  return (
    <>
      <a className="skip-link" href="#main" onClick={skipToContent}>Skip to content</a>

      <Header page={page} user={user} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOutAndLeave}
              drawerOpen={drawerOpen} onOpenDrawer={() => setDrawerOpen(true)} />

      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>{children}</main>

      <footer className="foot"><Footer /></footer>

      <Drawer page={page} user={user} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOutAndLeave}
              open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
