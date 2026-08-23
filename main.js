/**
 * Main Controller Module for BuilderLoop
 * Coordinates state, UI rendering, event handling, storage, and theme switching.
 */
import { fetchJobs } from './api.js';
import { renderJobs, filterJobs, showToast, renderJobDetailModal } from './ui.js';
import { getSavedJobs, toggleSaveJob, isJobSaved, getTheme, setTheme, saveAlert } from './storage.js';

// Application State
const state = {
  allJobs: [],
  filters: {
    keyword: '',
    location: '',
    discipline: 'all',
    savedOnly: false
  }
};

/**
 * Centered Fullscreen Preloader Controller
 * Deliberate, smooth 2-second progression with real-time percentage and status text.
 */
const initCenterPreloader = () => {
  const preloader = document.getElementById('page-preloader');
  const bar = document.getElementById('preloader-bar');
  const percentText = document.getElementById('preloader-percent');
  const statusText = document.getElementById('preloader-status-text');

  if (!preloader) return { complete: () => Promise.resolve() };

  const setProgress = (percent, status) => {
    if (bar) bar.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (statusText && status) statusText.textContent = status;
  };

  // Initial step
  setProgress(8, 'Connecting to platform...');

  return {
    complete: () => {
      return new Promise((resolve) => {
        // Deliberate stepped progress over ~2 seconds
        setTimeout(() => setProgress(28, 'Loading developer & design roles...'), 350);
        setTimeout(() => setProgress(58, 'Syncing category-defining companies...'), 750);
        setTimeout(() => setProgress(82, 'Curating verified builder opportunities...'), 1200);
        setTimeout(() => setProgress(96, 'Preparing workspace...'), 1600);
        setTimeout(() => {
          setProgress(100, 'Welcome to BuilderLoop');
          setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
              preloader.style.display = 'none';
              resolve();
            }, 600);
          }, 450);
        }, 2000);
      });
    }
  };
};

/**
 * Theme Controller (Tokyo Night Dark / Emerald Porcelain Light)
 */
const initTheme = () => {
  const currentTheme = getTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

  const themeToggleBtn = document.getElementById('theme-toggle');
  const drawerThemeToggleBtn = document.getElementById('drawer-theme-toggle');
  const drawerThemeText = document.getElementById('drawer-theme-text');

  const applyTheme = (themeName) => {
    document.documentElement.setAttribute('data-theme', themeName);
    setTheme(themeName);

    if (themeToggleBtn) updateThemeButtonAria(themeToggleBtn, themeName);
    if (drawerThemeText) {
      drawerThemeText.textContent = themeName === 'dark' 
        ? '☀️ Switch to Emerald Light' 
        : '🌌 Switch to Tokyo Night Dark';
    }

    showToast(
      themeName === 'dark' ? '🌌 Switched to Tokyo Night (Dark)' : '🌿 Switched to Emerald Porcelain (Light)',
      'info'
    );
  };

  // Sync initial states
  if (themeToggleBtn) updateThemeButtonAria(themeToggleBtn, currentTheme);
  if (drawerThemeText) {
    drawerThemeText.textContent = currentTheme === 'dark' 
      ? '☀️ Switch to Emerald Light' 
      : '🌌 Switch to Tokyo Night Dark';
  }

  const toggleTheme = () => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  };

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (drawerThemeToggleBtn) drawerThemeToggleBtn.addEventListener('click', toggleTheme);
};

const updateThemeButtonAria = (btn, theme) => {
  const isDark = theme === 'dark';
  btn.setAttribute('aria-label', `Switch to ${isDark ? 'Emerald Porcelain Light' : 'Tokyo Night Dark'} mode`);
  btn.setAttribute('title', `Switch to ${isDark ? 'Emerald Porcelain Light' : 'Tokyo Night Dark'} mode`);
};

/**
 * Update saved roles count badges across header, drawer, and filter tabs
 */
const updateSavedCounts = () => {
  const savedIds = getSavedJobs();
  const count = savedIds.length;

  const navCount = document.getElementById('nav-saved-count');
  const drawerCount = document.getElementById('drawer-saved-count');
  const tabCount = document.getElementById('saved-tab-count');

  if (navCount) navCount.textContent = count;
  if (drawerCount) drawerCount.textContent = count;
  if (tabCount) tabCount.textContent = count;
};

/**
 * Filter and render current job listings
 */
const applyFiltersAndRender = () => {
  const jobsContainer = document.getElementById('jobs-container');
  const resultsCountText = document.getElementById('results-count-text');
  const opportunitiesTitle = document.getElementById('featured-heading');

  const filtered = filterJobs(state.allJobs, state.filters);
  renderJobs(filtered, jobsContainer);

  if (resultsCountText) {
    if (state.filters.savedOnly) {
      resultsCountText.textContent = `Showing ${filtered.length} saved ${filtered.length === 1 ? 'role' : 'roles'}`;
      if (opportunitiesTitle) opportunitiesTitle.textContent = 'Saved Opportunities';
    } else {
      resultsCountText.textContent = `Showing ${filtered.length} of ${state.allJobs.length} available builder roles`;
      if (opportunitiesTitle) opportunitiesTitle.textContent = 'Featured opportunities';
    }
  }

  updateSavedCounts();
};

/**
 * Mobile Drawer Navigation Controller
 */
const initMobileDrawer = () => {
  const hamburgerBtn = document.getElementById('hamburger-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close');

  if (!hamburgerBtn || !drawer || !backdrop) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburgerBtn.addEventListener('click', openDrawer);
  backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  return { closeDrawer };
};

/**
 * Setup Event Listeners
 */
const setupEventListeners = (drawerController) => {
  const searchForm = document.getElementById('search-form');
  const searchKeyword = document.getElementById('search-keyword');
  const searchLocation = document.getElementById('search-location');
  const jobsContainer = document.getElementById('jobs-container');

  // 1. Dual Search Form Submit & Live Input
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.filters.keyword = searchKeyword ? searchKeyword.value : '';
      state.filters.location = searchLocation ? searchLocation.value : '';
      applyFiltersAndRender();
      
      const targetSection = document.getElementById('opportunities');
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (searchKeyword) {
    searchKeyword.addEventListener('input', (e) => {
      state.filters.keyword = e.target.value;
      applyFiltersAndRender();
    });
  }

  if (searchLocation) {
    searchLocation.addEventListener('input', (e) => {
      state.filters.location = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 2. Popular Searches Chips
  const popularChips = document.querySelectorAll('.popular-chip');
  popularChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const searchTerm = chip.getAttribute('data-search') || chip.textContent.trim();
      if (searchKeyword) {
        searchKeyword.value = searchTerm;
        state.filters.keyword = searchTerm;
        applyFiltersAndRender();
        showToast(`Filtered by "${searchTerm}"`, 'info');
      }
    });
  });

  // 3. Discipline Category Cards
  const disciplineCards = document.querySelectorAll('.discipline-card');
  const resetDisciplineBtn = document.getElementById('reset-discipline-filter');

  const setDiscipline = (disc) => {
    state.filters.discipline = disc;
    disciplineCards.forEach((card) => {
      const cardDisc = card.getAttribute('data-discipline');
      const isActive = cardDisc.toLowerCase() === disc.toLowerCase();
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    applyFiltersAndRender();
  };

  disciplineCards.forEach((card) => {
    card.addEventListener('click', () => {
      const disc = card.getAttribute('data-discipline') || 'all';
      setDiscipline(disc);
    });
  });

  if (resetDisciplineBtn) {
    resetDisciplineBtn.addEventListener('click', () => {
      setDiscipline('all');
      showToast('Showing all disciplines', 'info');
    });
  }

  // 4. Filter Tabs: All Roles vs Saved Roles
  const tabAllRoles = document.getElementById('tab-all-roles');
  const tabSavedRoles = document.getElementById('tab-saved-roles');
  const navSavedBtn = document.getElementById('nav-saved-btn');
  const drawerSavedBtn = document.getElementById('drawer-saved-btn');
  const footerSavedLink = document.getElementById('footer-saved-link');
  const navAllRoles = document.getElementById('nav-all-roles');
  const drawerAllRoles = document.getElementById('drawer-all-roles');
  const brandLogoBtn = document.getElementById('brand-logo-btn');
  const footerBrowseLink = document.getElementById('footer-browse-link');

  const switchToSavedRoles = () => {
    state.filters.savedOnly = true;
    if (tabSavedRoles) tabSavedRoles.classList.add('active');
    if (tabAllRoles) tabAllRoles.classList.remove('active');
    applyFiltersAndRender();
    if (drawerController) drawerController.closeDrawer();
    
    const oppsSection = document.getElementById('opportunities');
    if (oppsSection) oppsSection.scrollIntoView({ behavior: 'smooth' });
  };

  const switchToAllRoles = () => {
    state.filters.savedOnly = false;
    if (tabAllRoles) tabAllRoles.classList.add('active');
    if (tabSavedRoles) tabSavedRoles.classList.remove('active');
    applyFiltersAndRender();
    if (drawerController) drawerController.closeDrawer();
  };

  if (tabAllRoles) tabAllRoles.addEventListener('click', switchToAllRoles);
  if (tabSavedRoles) tabSavedRoles.addEventListener('click', switchToSavedRoles);
  if (navSavedBtn) navSavedBtn.addEventListener('click', switchToSavedRoles);
  if (drawerSavedBtn) drawerSavedBtn.addEventListener('click', switchToSavedRoles);
  if (footerSavedLink) footerSavedLink.addEventListener('click', (e) => { e.preventDefault(); switchToSavedRoles(); });
  if (navAllRoles) navAllRoles.addEventListener('click', (e) => { e.preventDefault(); switchToAllRoles(); });
  if (drawerAllRoles) drawerAllRoles.addEventListener('click', (e) => { e.preventDefault(); switchToAllRoles(); });
  if (brandLogoBtn) brandLogoBtn.addEventListener('click', (e) => { e.preventDefault(); switchToAllRoles(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  if (footerBrowseLink) footerBrowseLink.addEventListener('click', (e) => { e.preventDefault(); switchToAllRoles(); });

  // 5. Job Card Event Delegation (Save & Detail Modal)
  const jobDialog = document.getElementById('job-dialog');
  const dialogJobContent = document.getElementById('dialog-job-content');

  if (jobsContainer) {
    // Reset filters button in empty state
    jobsContainer.addEventListener('click', (e) => {
      if (e.target.id === 'reset-filters-btn') {
        state.filters = { keyword: '', location: '', discipline: 'all', savedOnly: false };
        if (searchKeyword) searchKeyword.value = '';
        if (searchLocation) searchLocation.value = '';
        setDiscipline('all');
        switchToAllRoles();
        showToast('All filters have been reset', 'info');
      }
    });

    // Save bookmark toggle
    jobsContainer.addEventListener('click', (e) => {
      const saveBtn = e.target.closest('.save-btn');
      if (saveBtn) {
        e.stopPropagation();
        const jobId = Number(saveBtn.getAttribute('data-job-id'));
        const { isSaved } = toggleSaveJob(jobId);

        showToast(
          isSaved ? 'Role bookmarked to your saved list' : 'Role removed from bookmarks',
          isSaved ? 'success' : 'info'
        );

        applyFiltersAndRender();
        return;
      }

      // View details modal trigger
      const detailsBtn = e.target.closest('.view-details-btn') || e.target.closest('.apply-fast-btn');
      if (detailsBtn) {
        const jobId = Number(detailsBtn.getAttribute('data-job-id'));
        const job = state.allJobs.find((j) => j.id === jobId);
        if (job && jobDialog && dialogJobContent) {
          renderJobDetailModal(job, dialogJobContent);
          jobDialog.showModal();
        }
      }
    });
  }

  // Modal interactions
  if (jobDialog) {
    jobDialog.addEventListener('click', (e) => {
      // Backdrop click closes dialog
      const rect = jobDialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog || e.target.id === 'close-modal-btn') {
        jobDialog.close();
      }

      // Save toggle inside modal
      const modalSaveBtn = e.target.closest('#modal-save-toggle-btn');
      if (modalSaveBtn) {
        const jobId = Number(modalSaveBtn.getAttribute('data-job-id'));
        const { isSaved } = toggleSaveJob(jobId);
        modalSaveBtn.innerHTML = isSaved ? '★ Bookmarked' : '☆ Save Role';
        applyFiltersAndRender();
        showToast(isSaved ? 'Role bookmarked!' : 'Role removed from bookmarks', 'info');
      }
    });

    // Application Form Submission
    jobDialog.addEventListener('submit', (e) => {
      if (e.target.id === 'application-form') {
        e.preventDefault();
        const applicantName = document.getElementById('applicant-name')?.value || 'Applicant';
        jobDialog.close();
        showToast(`🎉 Application submitted for ${applicantName}! Best of luck.`, 'success');
      }
    });
  }

  // 6. Create Alert Modal
  const alertDialog = document.getElementById('alert-dialog');
  const createAlertBtn = document.getElementById('create-alert-btn');
  const closeAlertModalBtn = document.getElementById('close-alert-modal-btn');
  const cancelAlertBtn = document.getElementById('cancel-alert-btn');
  const alertForm = document.getElementById('alert-form');

  if (createAlertBtn && alertDialog) {
    createAlertBtn.addEventListener('click', () => {
      alertDialog.showModal();
    });
  }

  const closeAlertDialog = () => {
    if (alertDialog) alertDialog.close();
  };

  if (closeAlertModalBtn) closeAlertModalBtn.addEventListener('click', closeAlertDialog);
  if (cancelAlertBtn) cancelAlertBtn.addEventListener('click', closeAlertDialog);

  if (alertForm) {
    alertForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('alert-email')?.value;
      const discipline = document.getElementById('alert-discipline')?.value;
      const frequency = document.getElementById('alert-frequency')?.value;

      saveAlert({ email, discipline, frequency });
      closeAlertDialog();
      alertForm.reset();
      showToast(`🔔 Alert created for ${email} (${discipline} roles)`, 'success');
    });
  }

  // 7. Post a Role Modal
  const postRoleDialog = document.getElementById('post-role-dialog');
  const postJobCta = document.getElementById('post-job-cta');
  const drawerPostJobBtn = document.getElementById('drawer-post-job-btn');
  const closePostRoleModal = document.getElementById('close-post-role-modal');
  const cancelPostRole = document.getElementById('cancel-post-role');
  const postRoleForm = document.getElementById('post-role-form');

  const openPostDialog = () => {
    if (drawerController) drawerController.closeDrawer();
    if (postRoleDialog) postRoleDialog.showModal();
  };

  const closePostDialog = () => {
    if (postRoleDialog) postRoleDialog.close();
  };

  if (postJobCta) postJobCta.addEventListener('click', openPostDialog);
  if (drawerPostJobBtn) drawerPostJobBtn.addEventListener('click', openPostDialog);
  if (closePostRoleModal) closePostRoleModal.addEventListener('click', closePostDialog);
  if (cancelPostRole) cancelPostRole.addEventListener('click', closePostDialog);

  if (postRoleForm) {
    postRoleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const company = document.getElementById('post-company')?.value || 'Startup';
      const title = document.getElementById('post-title')?.value || 'Builder';
      const discipline = document.getElementById('post-discipline')?.value || 'Engineering';
      const location = document.getElementById('post-location')?.value || 'Remote';
      const salary = document.getElementById('post-salary')?.value || '$120k – $160k';
      const tagsRaw = document.getElementById('post-tags')?.value || 'Full-stack, TypeScript';
      const description = document.getElementById('post-description')?.value || '';

      const newJob = {
        id: Date.now(),
        title,
        company,
        companyInitial: company.charAt(0).toUpperCase(),
        companyBg: '#6366F1',
        companyColor: '#FFFFFF',
        location,
        type: 'Full-time',
        discipline,
        salary,
        postedTime: 'Just now',
        featured: true,
        tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
        description,
        requirements: ['High agency and execution speed', 'Strong collaboration and ownership']
      };

      state.allJobs.unshift(newJob);
      applyFiltersAndRender();
      closePostDialog();
      postRoleForm.reset();
      showToast(`🚀 "${title}" posted successfully!`, 'success');
    });
  }
};

/**
 * Bootstrap the Application
 */
document.addEventListener('DOMContentLoaded', async () => {
  const loaderController = initCenterPreloader();
  initTheme();
  const drawerController = initMobileDrawer();

  try {
    // Fetch jobs asynchronously
    const fetchedJobs = await fetchJobs();
    state.allJobs = fetchedJobs;

    // Initial render
    applyFiltersAndRender();
    updateSavedCounts();
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to load job listings. Please refresh.', 'warning');
  } finally {
    if (loaderController) {
      await loaderController.complete();
    }
  }

  // Register interactive event listeners
  setupEventListeners(drawerController);
});
