/**
 * Storage module for BuilderLoop
 * Manages localStorage for saved bookmarks, theme preference, and job alerts.
 */

const SAVED_JOBS_KEY = 'builderloop_saved_jobs';
const THEME_KEY = 'builderloop_theme';
const ALERTS_KEY = 'builderloop_alerts';

/**
 * Retrieve saved job IDs from localStorage
 * @returns {Array<number>}
 */
export const getSavedJobs = () => {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY) || localStorage.getItem('savedJobs');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse saved jobs from localStorage:', err);
    return [];
  }
};

/**
 * Toggle bookmark state for a job ID
 * @param {number} jobId 
 * @returns {{ isSaved: boolean, count: number }}
 */
export const toggleSaveJob = (jobId) => {
  const numericId = Number(jobId);
  const savedJobs = getSavedJobs();
  const exists = savedJobs.includes(numericId);

  const updatedJobs = exists 
    ? savedJobs.filter((id) => id !== numericId)
    : [...savedJobs, numericId];

  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(updatedJobs));
  return {
    isSaved: !exists,
    count: updatedJobs.length
  };
};

/**
 * Check if a job ID is currently saved
 * @param {number} jobId 
 * @returns {boolean}
 */
export const isJobSaved = (jobId) => {
  const savedJobs = getSavedJobs();
  return savedJobs.includes(Number(jobId));
};

/**
 * Get current theme preference ('dark' = Tokyo Night, 'light' = Emerald Porcelain)
 * @returns {'dark' | 'light'}
 */
export const getTheme = () => {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }
  return 'dark';
};

/**
 * Save theme preference
 * @param {'dark' | 'light'} theme 
 */
export const setTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme);
};

/**
 * Save a job alert preference
 * @param {{ email: string, role: string, frequency: string }} alertData 
 */
export const saveAlert = (alertData) => {
  try {
    const existing = JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
    const updated = [...existing, { ...alertData, createdAt: new Date().toISOString() }];
    localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save alert:', err);
    return false;
  }
};
