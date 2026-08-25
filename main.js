/**
 * Application controller.
 *
 * Holds the current query, wires up events, and asks ui.js to re-render
 * whenever that query changes.
 */
import { fetchJobs } from './api.js';
import { renderJobs, filterJobs, summarise, showToast, renderJobDetail } from './ui.js';
import {
  getSavedJobs, toggleSaveJob, isJobSaved,
  getTheme, setTheme, saveAlert,
  getCurrentUser, signIn, register, signOut
} from './storage.js';

const $ = (id) => document.getElementById(id);

const state = {
  jobs: [],
  query: { keyword: '', location: '', discipline: 'all', savedOnly: false }
};

/* ------------------------------------------------------------- Rendering */

const paintCounts = () => {
  const count = getSavedJobs().length;
  ['count-nav', 'count-drawer', 'count-scope'].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = count;
  });
};

const paintSummary = () => {
  const { roles, companies, remote, medianFloor } = summarise(state.jobs);
  const figures = { 'fig-roles': roles, 'fig-companies': companies, 'fig-remote': remote, 'fig-pay': medianFloor };

  Object.entries(figures).forEach(([id, value]) => {
    const el = $(id);
    if (el) el.textContent = value;
  });
};

const render = () => {
  const matches = filterJobs(state.jobs, state.query);
  renderJobs(matches, $('jobs'));

  const heading = $('listings-title');
  const note = $('result-count');

  if (heading) heading.textContent = state.query.savedOnly ? 'Saved roles' : 'Open positions';

  if (note) {
    note.textContent = state.query.savedOnly
      ? `${matches.length} saved`
      : `${matches.length} of ${state.jobs.length}`;
  }

  paintCounts();
};

/* ----------------------------------------------------------------- Theme */

const initTheme = () => {
  const apply = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    setTheme(theme);

    const toggle = $('theme-toggle');
    const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    if (toggle) toggle.setAttribute('aria-label', label);

    const drawerText = $('drawer-theme-text');
    if (drawerText) drawerText.textContent = label;
  };

  apply(getTheme());

  const flip = () => {
    const current = document.documentElement.getAttribute('data-theme');
    apply(current === 'dark' ? 'light' : 'dark');
  };

  $('theme-toggle')?.addEventListener('click', flip);
  $('drawer-theme')?.addEventListener('click', flip);
};

/* ---------------------------------------------------------------- Drawer */

const initDrawer = () => {
  const drawer = $('drawer');
  const scrim = $('scrim');
  const trigger = $('drawer-open');
  if (!drawer || !scrim || !trigger) return { close: () => {} };

  const open = () => {
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('is-open'));
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    $('drawer-close')?.focus();
  };

  const close = () => {
    scrim.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { scrim.hidden = true; }, 200);
  };

  trigger.addEventListener('click', open);
  scrim.addEventListener('click', close);
  $('drawer-close')?.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });

  return { close };
};

/* --------------------------------------------------------------- Dialogs */

const openDialog = (id) => $(id)?.showModal();
const closeDialog = (id) => $(id)?.close();

/** Close on backdrop click and on any [data-close] button. */
const initDialogs = () => {
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.addEventListener('click', (event) => {
    const closer = event.target.closest('[data-close]');
    if (closer) closeDialog(closer.dataset.close);
  });
};

/* ---------------------------------------------------------------- Account */

const paintAccount = () => {
  const user = getCurrentUser();
  const header = $('account-slot');
  const drawer = $('drawer-account-slot');

  if (header) {
    header.innerHTML = user
      ? `<div class="account">
           <button type="button" class="account-trigger" id="account-open" aria-expanded="false">
             <span class="avatar" style="background:${user.avatarBg}">${user.initial}</span>
             <span class="account-name hide-sm">${user.name.split(' ')[0]}</span>
           </button>
           <div class="account-menu" id="account-menu">
             <div class="account-card">
               <p class="account-card-name">${user.name}</p>
               <p class="account-card-mail">${user.email}</p>
               <span class="account-card-role">${user.role}</span>
             </div>
             <div class="account-sep"></div>
             <button type="button" class="account-action" data-signout>Sign out</button>
           </div>
         </div>`
      : `<button type="button" class="btn btn--outline btn--sm" data-signin>Sign in</button>`;
  }

  if (drawer) {
    drawer.innerHTML = user
      ? `<div class="drawer-user">
           <div class="drawer-user-row">
             <span class="avatar avatar--lg" style="background:${user.avatarBg}">${user.initial}</span>
             <div>
               <p class="drawer-user-name">${user.name}</p>
               <p class="drawer-user-role">${user.role}</p>
             </div>
           </div>
           <button type="button" class="btn btn--outline btn--block" data-signout>Sign out</button>
         </div>`
      : `<button type="button" class="btn btn--outline btn--block" data-signin>Sign in or create an account</button>`;
  }
};

const initAuth = (drawer) => {
  const error = $('auth-error');
  const signinForm = $('signin-form');
  const registerForm = $('register-form');

  const showError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  const setMode = (mode) => {
    const signingIn = mode === 'signin';
    $('tab-signin')?.classList.toggle('is-active', signingIn);
    $('tab-register')?.classList.toggle('is-active', !signingIn);
    $('tab-signin')?.setAttribute('aria-selected', String(signingIn));
    $('tab-register')?.setAttribute('aria-selected', String(!signingIn));
    if (signinForm) signinForm.hidden = !signingIn;
    if (registerForm) registerForm.hidden = signingIn;
    if (error) error.hidden = true;

    const title = $('auth-dialog-title');
    const sub = $('auth-dialog-sub');
    if (title) title.textContent = signingIn ? 'Sign in' : 'Create an account';
    if (sub) {
      sub.textContent = signingIn
        ? "Save roles and track the ones you've applied to."
        : 'Takes a moment. Everything stays in this browser.';
    }
  };

  $('tab-signin')?.addEventListener('click', () => setMode('signin'));
  $('tab-register')?.addEventListener('click', () => setMode('register'));

  $('demo-fill')?.addEventListener('click', () => {
    $('signin-email').value = 'jane@example.com';
    $('signin-password').value = 'password123';
  });

  signinForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = signIn($('signin-email').value, $('signin-password').value);

    if (!result.ok) return showError(result.message);

    paintAccount();
    closeDialog('auth-dialog');
    signinForm.reset();
    showToast(`Signed in as ${result.user.name}`, 'success');
  });

  registerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = register({
      name: $('register-name').value,
      email: $('register-email').value,
      password: $('register-password').value,
      role: $('register-role').value
    });

    if (!result.ok) return showError(result.message);

    paintAccount();
    closeDialog('auth-dialog');
    registerForm.reset();
    showToast(`Account created for ${result.user.name}`, 'success');
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-signin]')) {
      drawer.close();
      setMode('signin');
      openDialog('auth-dialog');
      return;
    }

    if (event.target.closest('[data-signout]')) {
      signOut();
      paintAccount();
      drawer.close();
      showToast('Signed out', 'info');
      return;
    }

    const menu = $('account-menu');
    if (!menu) return;

    if (event.target.closest('#account-open')) {
      const open = menu.classList.toggle('is-open');
      $('account-open')?.setAttribute('aria-expanded', String(open));
    } else if (!event.target.closest('.account')) {
      menu.classList.remove('is-open');
      $('account-open')?.setAttribute('aria-expanded', 'false');
    }
  });

  paintAccount();
};

/* ---------------------------------------------------------------- Events */

const initEvents = (drawer) => {
  const keyword = $('q');
  const location = $('where');

  /* Search */
  $('search')?.addEventListener('submit', (event) => {
    event.preventDefault();
    $('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  keyword?.addEventListener('input', (event) => {
    state.query.keyword = event.target.value;
    render();
  });

  location?.addEventListener('input', (event) => {
    state.query.location = event.target.value;
    render();
  });

  /* Suggested searches */
  document.querySelectorAll('.quick-item').forEach((chip) => {
    chip.addEventListener('click', () => {
      const term = chip.dataset.term;
      if (keyword) keyword.value = term;
      state.query.keyword = term;
      render();
      $('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* Discipline filters */
  const filters = document.querySelectorAll('.filter');
  const setDiscipline = (value) => {
    state.query.discipline = value;
    filters.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.discipline === value);
    });
    render();
  };

  filters.forEach((btn) => {
    btn.addEventListener('click', () => setDiscipline(btn.dataset.discipline));
  });

  /* All / Saved scope */
  const setScope = (savedOnly) => {
    state.query.savedOnly = savedOnly;
    $('scope-all')?.classList.toggle('is-active', !savedOnly);
    $('scope-saved')?.classList.toggle('is-active', savedOnly);
    render();
    drawer.close();
  };

  const goToSaved = () => {
    setScope(true);
    $('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  $('scope-all')?.addEventListener('click', () => setScope(false));
  $('scope-saved')?.addEventListener('click', () => setScope(true));
  $('nav-saved')?.addEventListener('click', goToSaved);
  $('drawer-saved')?.addEventListener('click', goToSaved);
  $('foot-saved')?.addEventListener('click', goToSaved);
  $('foot-all')?.addEventListener('click', () => setScope(false));

  $('brand-home')?.addEventListener('click', (event) => {
    event.preventDefault();
    setScope(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Listing interactions, delegated so re-renders don't need rebinding */
  $('jobs')?.addEventListener('click', (event) => {
    const saveBtn = event.target.closest('[data-save]');
    if (saveBtn) {
      const { saved } = toggleSaveJob(saveBtn.dataset.save);
      showToast(saved ? 'Role saved' : 'Role removed from saved', saved ? 'success' : 'info');
      render();
      return;
    }

    const detailBtn = event.target.closest('[data-open]');
    if (detailBtn) {
      const job = state.jobs.find((j) => String(j.id) === detailBtn.dataset.open);
      if (job) {
        renderJobDetail(job, $('job-dialog-body'));
        openDialog('job-dialog');
      }
      return;
    }

    if (event.target.closest('[data-reset]')) {
      state.query = { keyword: '', location: '', discipline: 'all', savedOnly: false };
      if (keyword) keyword.value = '';
      if (location) location.value = '';
      setDiscipline('all');
      setScope(false);
      showToast('Filters cleared', 'info');
    }
  });

  /* Detail dialog: save toggle and application */
  $('job-dialog')?.addEventListener('click', (event) => {
    const saveBtn = event.target.closest('[data-detail-save]');
    if (!saveBtn) return;

    const { saved } = toggleSaveJob(saveBtn.dataset.save);
    saveBtn.textContent = saved ? 'Saved' : 'Save role';
    render();
  });

  $('job-dialog')?.addEventListener('submit', (event) => {
    if (event.target.id !== 'apply-form') return;
    event.preventDefault();
    closeDialog('job-dialog');
    showToast('Application sent', 'success');
  });

  /* Alerts */
  $('alert-open')?.addEventListener('click', () => openDialog('alert-dialog'));
  $('foot-alert')?.addEventListener('click', () => openDialog('alert-dialog'));

  $('alert-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveAlert({
      email: $('alert-email').value,
      discipline: $('alert-discipline').value,
      frequency: $('alert-frequency').value
    });
    closeDialog('alert-dialog');
    event.target.reset();
    showToast('Alert created', 'success');
  });

  /* Post a role */
  const openPost = () => {
    drawer.close();
    openDialog('post-dialog');
  };

  $('post-role-open')?.addEventListener('click', openPost);
  $('drawer-post-role')?.addEventListener('click', openPost);
  $('foot-post')?.addEventListener('click', openPost);

  $('post-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const company = $('post-company').value.trim();
    const title = $('post-title').value.trim();

    state.jobs.unshift({
      id: Date.now(),
      title,
      company,
      companyInitial: company.charAt(0).toUpperCase(),
      companyBg: '#12503b',
      companyColor: '#ffffff',
      location: $('post-location').value.trim(),
      type: 'Full-time',
      discipline: $('post-discipline').value,
      salary: $('post-salary').value.trim(),
      postedTime: 'Just now',
      featured: false,
      tags: $('post-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      description: $('post-description').value.trim(),
      requirements: []
    });

    closeDialog('post-dialog');
    event.target.reset();
    paintSummary();
    render();
    showToast(`${title} published`, 'success');
  });

  /* Drawer links that only scroll */
  $('drawer-browse')?.addEventListener('click', () => drawer.close());
};

/* -------------------------------------------------------------- Bootstrap */

const start = async () => {
  initTheme();
  const drawer = initDrawer();
  initDialogs();
  initAuth(drawer);
  initEvents(drawer);

  const jobs = await fetchJobs();

  if (!jobs.length) {
    const container = $('jobs');
    if (container) {
      container.setAttribute('aria-busy', 'false');
      container.innerHTML = `
        <div class="empty">
          <h3>Listings didn't load</h3>
          <p>Serve this page over HTTP rather than opening the file directly, then reload.</p>
        </div>`;
    }
    const note = $('result-count');
    if (note) note.textContent = 'Unavailable';
    return;
  }

  state.jobs = jobs;
  paintSummary();
  render();
};

document.addEventListener('DOMContentLoaded', start);
