/**
 * Accounts and sessions.
 *
 * Demo only. Passwords sit in localStorage in plain text because there is
 * no server to hold them — this is a coursework project, not a login you
 * should reuse anywhere real. The page says so too.
 */

import {
  getAccounts, saveAccounts, getSession, setSession, clearSession,
  addCustomCompany, newId
} from './store.js';
import { initials, colourFor } from './format.js';

const AVATAR_COLOURS = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A'];

/** Strip the password before anything reaches the session. */
const toSession = (account) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: account.role,
  companyId: account.companyId || null,
  avatarBg: account.avatarBg,
  initials: initials(account.name),
  signedInAt: new Date().toISOString()
});

export const currentUser = () => getSession();

export const isEmployer = () => currentUser()?.role === 'employer';

export const signIn = (email, password) => {
  const target = String(email).trim().toLowerCase();
  const account = getAccounts().find((a) => a.email.toLowerCase() === target);

  if (!account) return { ok: false, message: 'No account uses that email address.' };
  if (account.password !== password) return { ok: false, message: 'That password does not match.' };

  const user = toSession(account);
  setSession(user);
  return { ok: true, user };
};

/**
 * @param {{name:string, email:string, password:string, role:'seeker'|'employer',
 *          companyId?:string, companyName?:string}} details
 */
export const register = (details) => {
  const accounts = getAccounts();
  const email = String(details.email).trim().toLowerCase();

  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    return { ok: false, message: 'That email already has an account. Sign in instead.' };
  }

  let companyId = details.companyId || null;

  /* An employer naming a company we do not carry gets one created for them,
     so their postings have somewhere to hang. */
  if (details.role === 'employer' && !companyId && details.companyName) {
    const name = details.companyName.trim();
    companyId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || newId();

    addCustomCompany({
      id: companyId,
      name,
      initial: name.charAt(0).toUpperCase(),
      brandBg: colourFor(name),
      brandFg: '#FFFFFF',
      industry: 'Not stated',
      size: 'Not stated',
      hq: 'Not stated',
      founded: new Date().getFullYear(),
      site: '',
      tagline: '',
      about: `${name} has not written a company profile yet.`,
      perks: []
    });
  }

  const account = {
    id: newId(),
    name: details.name.trim(),
    email,
    password: details.password,
    role: details.role === 'employer' ? 'employer' : 'seeker',
    companyId,
    avatarBg: AVATAR_COLOURS[accounts.length % AVATAR_COLOURS.length]
  };

  saveAccounts([...accounts, account]);

  const user = toSession(account);
  setSession(user);
  return { ok: true, user };
};

export const signOut = () => clearSession();

/**
 * Send an unauthenticated visitor to the sign-in page, remembering where
 * they were headed.
 * @param {'seeker'|'employer'|null} role  required role, if any
 * @returns {Object|null} the user, or null if a redirect was issued
 */
export const requireAuth = (role = null) => {
  const user = currentUser();
  const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);

  if (!user) {
    location.replace(`./auth.html?next=${next}`);
    return null;
  }

  if (role && user.role !== role) {
    location.replace(`./auth.html?next=${next}&need=${role}`);
    return null;
  }

  return user;
};
