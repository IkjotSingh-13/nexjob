/**
 * Storage module for NexJob
 * Manages localStorage for saved bookmarks, theme preference, and job alerts.
 */

const SAVED_JOBS_KEY = 'NexJob_saved_jobs';
const THEME_KEY = 'NexJob_theme';
const ALERTS_KEY = 'NexJob_alerts';

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

/* --------------------------------------------------------------------------
   User Authentication & LocalStorage Management
   -------------------------------------------------------------------------- */
const USER_KEY = 'NexJob_user';
const USERS_LIST_KEY = 'NexJob_users_database';

// Pre-populate demo users if not present
const getRegisteredUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_LIST_KEY);
    if (raw) return JSON.parse(raw);
    const initialUsers = [
      {
        id: 1,
        name: 'Jane Builder',
        email: 'jane@builder.dev',
        password: 'password123',
        role: 'Staff Frontend Engineer',
        avatarInitial: 'J',
        avatarBg: '#ec4899'
      },
      {
        id: 2,
        name: 'Alex Rivera',
        email: 'alex@builder.dev',
        password: 'password123',
        role: 'Senior Product Designer',
        avatarInitial: 'A',
        avatarBg: '#3ecf8e'
      }
    ];
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  } catch (err) {
    console.error('Failed to get registered users:', err);
    return [];
  }
};

/**
 * Get current logged in user from localStorage
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to read user from localStorage:', err);
    return null;
  }
};

/**
 * Log in a user by email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {{ success: boolean, user?: Object, message?: string }}
 */
export const loginUser = (email, password) => {
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!found) {
    return { success: false, message: 'No account found with this email address.' };
  }

  if (found.password !== password) {
    return { success: false, message: 'Invalid password. Try again or use demo credentials.' };
  }

  const sessionUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    avatarInitial: found.avatarInitial || found.name.charAt(0).toUpperCase(),
    avatarBg: found.avatarBg || '#ec4899',
    loggedInAt: new Date().toISOString()
  };

  localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  return { success: true, user: sessionUser };
};

/**
 * Register a new user and save to localStorage database
 * @param {{ name: string, email: string, password: string, role?: string }} userData 
 * @returns {{ success: boolean, user?: Object, message?: string }}
 */
export const registerUser = ({ name, email, password, role = 'Software Builder' }) => {
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);

  if (exists) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    password: password,
    role: role.trim() || 'Software Builder',
    avatarInitial: name.trim().charAt(0).toUpperCase(),
    avatarBg: '#7c3aed'
  };

  const updatedUsers = [...users, newUser];
  localStorage.setItem(USERS_LIST_KEY, JSON.stringify(updatedUsers));

  const sessionUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    avatarInitial: newUser.avatarInitial,
    avatarBg: newUser.avatarBg,
    loggedInAt: new Date().toISOString()
  };

  localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  return { success: true, user: sessionUser };
};

/**
 * Log out user and clear session in localStorage
 */
export const logoutUser = () => {
  localStorage.removeItem(USER_KEY);
};
