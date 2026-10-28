/**
 * The shell that every page shares.
 *
 * The masthead is written into each HTML file so it paints without waiting
 * for JavaScript. This module wires it up, then injects the two pieces that
 * are never above the fold — the drawer and the footer — so the nav is
 * defined in exactly one place.
 */

import { $, $$, on, esc, delegate } from './dom.js';
import { migrate, getSaved, getApplications } from './store.js';
import { initTheme, toggleTheme } from './theme.js';
import { currentUser, signOut } from './auth.js';
import { icon } from '../components/icons.js';

const NAV = [
  { page: 'jobs',      href: './jobs.html',      label: 'Jobs' },
  { page: 'companies', href: './companies.html', label: 'Companies' },
  { page: 'prep',      href: './prep.html',      label: 'Get in' },
  { page: 'salaries',  href: './salaries.html',  label: 'Pay' }
];

const currentPage = () => document.body.dataset.page || '';

/* ------------------------------------------------------------- Account */

const accountMarkup = (user, { inDrawer = false } = {}) => {
  if (!user) {
    return inDrawer
      ? `<a class="btn btn--primary btn--block" href="./auth.html">Sign in</a>`
      : `<a class="btn btn--ghost btn--sm" href="./auth.html">Sign in</a>`;
  }

  const home = user.role === 'employer' ? './employer.html' : './dashboard.html';

  if (inDrawer) {
    return `
      <div class="row" style="gap:var(--s3)">
        <span class="avatar" style="background:${esc(user.avatarBg)}">${esc(user.initials)}</span>
        <div style="min-width:0">
          <p style="font-weight:600;font-size:var(--t-sm)">${esc(user.name)}</p>
          <p class="tick">${esc(user.role === 'employer' ? 'Employer' : 'Job seeker')}</p>
        </div>
      </div>`;
  }

  return `
    <div class="account">
      <button type="button" class="ibtn" data-account-toggle aria-expanded="false"
              aria-haspopup="true" aria-label="Account menu">
        <span class="avatar" style="background:${esc(user.avatarBg)}">${esc(user.initials)}</span>
      </button>

      <div class="account-menu" data-account-menu hidden>
        <div class="account-who">
          <p style="font-weight:600;font-size:var(--t-sm)">${esc(user.name)}</p>
          <p class="tick" style="margin-top:2px">${esc(user.email)}</p>
        </div>
        <a href="${home}">${user.role === 'employer' ? 'Employer dashboard' : 'Your dashboard'}</a>
        ${user.role === 'employer'
          ? `<a href="./post-job.html">Post a role</a>`
          : `<a href="./profile.html">Profile and CV</a><a href="./dashboard.html#saved">Saved roles</a>`}
        <button type="button" data-sign-out>Sign out</button>
      </div>
    </div>`;
};

/* -------------------------------------------------------------- Drawer */

const drawerMarkup = (user) => {
  const seekerLinks = `
    <a class="drawer-link" href="./dashboard.html">Dashboard</a>
    <a class="drawer-link" href="./dashboard.html#saved">
      Saved roles <span class="pill" data-saved-count>0</span>
    </a>
    <a class="drawer-link" href="./dashboard.html#applications">
      Applications <span class="pill" data-application-count>0</span>
    </a>
    <a class="drawer-link" href="./profile.html">Profile and CV</a>`;

  const employerLinks = `
    <a class="drawer-link" href="./employer.html">Employer dashboard</a>
    <a class="drawer-link" href="./post-job.html">Post a role</a>`;

  return `
    <div class="scrim" data-scrim hidden></div>

    <aside class="drawer" id="drawer" aria-label="Menu" hidden>
      <div class="drawer-top">
        <span class="brand">
          <span class="brand-mark">${icon('scale', 15)}</span>
          <span class="brand-name">Nexjob</span>
        </span>
        <button type="button" class="ibtn" data-drawer-close aria-label="Close menu">
          ${icon('close', 17)}
        </button>
      </div>

      <div class="drawer-body">
        <div>${accountMarkup(user, { inDrawer: true })}</div>

        <div class="drawer-group">
          <p class="tick">Browse</p>
          ${NAV.map((item) => `<a class="drawer-link" href="${item.href}" data-nav="${item.page}">${item.label}</a>`).join('')}
        </div>

        <div class="drawer-group">
          <p class="tick">${user?.role === 'employer' ? 'Hiring' : 'For you'}</p>
          ${user?.role === 'employer' ? employerLinks : seekerLinks}
        </div>

        <div class="drawer-group">
          <p class="tick">Display</p>
          <button type="button" class="drawer-link" data-theme-toggle>
            <span data-theme-text>Switch theme</span>
            <span data-icon-sun>${icon('sun', 15)}</span>
            <span data-icon-moon hidden>${icon('moon', 15)}</span>
          </button>
        </div>

        ${user
          ? `<button type="button" class="btn btn--outline btn--block" data-sign-out>Sign out</button>`
          : `<a class="btn btn--primary btn--block" href="./auth.html">Sign in or create account</a>`}
      </div>
    </aside>`;
};

/* -------------------------------------------------------------- Footer */

const footerMarkup = () => `
  <div class="wrap foot-in">
    <div class="foot-grid">
      <div class="foot-brand">
        <span class="brand">
          <span class="brand-mark">${icon('scale', 15)}</span>
          <span class="brand-name">Nexjob</span>
        </span>
        <p style="font-size:var(--t-sm);color:var(--ink-2)">
          A job board that puts every salary on the same scale, so you can see
          where a role really sits before you apply.
        </p>
      </div>

      <div class="foot-col">
        <p class="tick">Find work</p>
        <ul>
          <li><a href="./jobs.html">Browse roles</a></li>
          <li><a href="./jobs.html?saved=1">Saved roles</a></li>
          <li><a href="./dashboard.html#alerts">Job alerts</a></li>
          <li><a href="./dashboard.html">Your dashboard</a></li>
        </ul>
      </div>

      <div class="foot-col">
        <p class="tick">Research</p>
        <ul>
          <li><a href="./companies.html">Companies</a></li>
          <li><a href="./salaries.html">Pay explorer</a></li>
          <li><a href="./prep.html">How to get in</a></li>
        </ul>
      </div>

      <div class="foot-col">
        <p class="tick">Employers</p>
        <ul>
          <li><a href="./post-job.html">Post a role</a></li>
          <li><a href="./employer.html">Manage postings</a></li>
          <li><a href="./auth.html?tab=register&amp;role=employer">Create employer account</a></li>
        </ul>
      </div>

      <div class="foot-col">
        <p class="tick">About</p>
        <ul>
          <li><a href="./index.html#how">How Nexjob works</a></li>
          <li><a href="./profile.html">Your profile</a></li>
          <li><a href="./404.html">Anything else</a></li>
        </ul>
      </div>
    </div>

    <div class="foot-base">
      <span class="tick">Coursework project · listings are sample data</span>
      <span class="tick">HTML, CSS and vanilla JavaScript · no build step</span>
    </div>
  </div>`;

/* --------------------------------------------------------- Drawer state */

let lastFocused = null;

const openDrawer = () => {
  const drawer = $('#drawer');
  const scrim = $('[data-scrim]');
  if (!drawer) return;

  lastFocused = document.activeElement;
  drawer.hidden = false;
  scrim.hidden = false;

  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    scrim.classList.add('is-open');
  });

  document.body.style.overflow = 'hidden';
  $$('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  drawer.querySelector('[data-drawer-close]')?.focus();
};

const closeDrawer = () => {
  const drawer = $('#drawer');
  const scrim = $('[data-scrim]');
  if (!drawer || drawer.hidden) return;

  drawer.classList.remove('is-open');
  scrim.classList.remove('is-open');
  document.body.style.overflow = '';
  $$('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));

  setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, 220);
  lastFocused?.focus?.();
};

/** Keep tab focus inside the open drawer. */
const trapFocus = (event) => {
  const drawer = $('#drawer');
  if (!drawer || drawer.hidden || event.key !== 'Tab') return;

  const focusable = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', drawer);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

/* --------------------------------------------------------------- Counts */

export const refreshCounts = () => {
  const user = currentUser();
  const saved = getSaved().length;
  const applications = user ? getApplications().filter((a) => a.userId === user.id).length : 0;

  $$('[data-saved-count]').forEach((node) => {
    node.textContent = String(saved);
    node.hidden = saved === 0;
  });

  $$('[data-application-count]').forEach((node) => {
    node.textContent = String(applications);
    node.hidden = applications === 0;
  });
};

/* ----------------------------------------------------------------- Boot */

export const initShell = () => {
  migrate();
  initTheme();

  const user = currentUser();

  /* Mark the current page in both navs. */
  $$('[data-nav]').forEach((link) => {
    if (link.dataset.nav === currentPage()) link.setAttribute('aria-current', 'page');
  });

  /* Header account slot. */
  const slot = $('[data-account-slot]');
  if (slot) slot.innerHTML = accountMarkup(user);

  /* Inject drawer and footer. */
  document.body.insertAdjacentHTML('beforeend', drawerMarkup(user));

  const foot = $('#site-foot');
  if (foot) foot.innerHTML = footerMarkup();

  $$('#drawer [data-nav]').forEach((link) => {
    if (link.dataset.nav === currentPage()) link.setAttribute('aria-current', 'page');
  });

  /* Wiring. */
  delegate(document, 'click', '[data-drawer-open]', openDrawer);
  delegate(document, 'click', '[data-drawer-close]', closeDrawer);
  delegate(document, 'click', '[data-scrim]', closeDrawer);
  delegate(document, 'click', '[data-theme-toggle]', toggleTheme);
  delegate(document, 'click', '[data-sign-out]', () => {
    signOut();
    location.href = './index.html';
  });

  delegate(document, 'click', '[data-account-toggle]', (event, button) => {
    const menu = button.parentElement.querySelector('[data-account-menu]');
    const open = menu.hidden;
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    event.stopPropagation();
  });

  on(document, 'click', (event) => {
    const menu = $('[data-account-menu]');
    if (menu && !menu.hidden && !event.target.closest('.account')) {
      menu.hidden = true;
      $('[data-account-toggle]')?.setAttribute('aria-expanded', 'false');
    }
  });

  on(document, 'keydown', (event) => {
    if (event.key === 'Escape') {
      closeDrawer();
      const menu = $('[data-account-menu]');
      if (menu) menu.hidden = true;
    }
    trapFocus(event);
  });

  refreshCounts();

  return user;
};
