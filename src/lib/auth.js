/**
 * Accounts and sign-in.
 *
 * Demo only: passwords sit in localStorage in plain text because there is no
 * server to keep them. Never reuse a real password here.
 */

import {
  getAccounts, saveAccounts, getSession, setSession, clearSession, addCustomCompany, newId
} from './store.js';
import { initials, colourFor } from './format.js';
import { fakeServer } from './promise.js';

const AVATAR_COLOURS = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A'];

/** The signed-in user (no password), or null. */
export const currentUser = () => getSession();

/** Store the signed-in user, without the password. */
const startSession = (account) => {
  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    companyId: account.companyId || null,
    avatarBg: account.avatarBg,
    initials: initials(account.name),
    signedInAt: new Date().toISOString()
  };
  setSession(user);
  return user;
};

/** @returns {Promise<Object>} signed-in user, ya error ke saath reject */
export const signIn = (email, password) => fakeServer(() => {
  const target = email.trim().toLowerCase();
  const account = getAccounts().find((a) => a.email.toLowerCase() === target);

  if (!account) throw new Error('No account uses that email address.');
  if (account.password !== password) throw new Error('That password does not match.');

  return startSession(account);
});

/**
 * @param {{name, email, password, role, companyId?, companyName?}} details
 * @returns {Promise<Object>} naya user, ya error ke saath reject
 */
export const register = (details) => fakeServer(() => {
  const accounts = getAccounts();
  const email = details.email.trim().toLowerCase();

  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    throw new Error('That email already has an account. Sign in instead.');
  }

  let companyId = details.companyId || null;

  /* An employer at a company we do not list gets a company made for them. */
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
  return startSession(account);
});

export const signOut = () => clearSession();

/**
 * For pages that need a signed-in user. Sends everyone else to the sign-in
 * page, remembering where they were going.
 * @param {'seeker'|'employer'} role
 * @returns {Object|null} the user, or null when redirecting
 */
export const requireAuth = (role) => {
  const user = currentUser();
  const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);

  if (!user) {
    location.replace(`./auth.html?next=${next}`);
    return null;
  }

  if (user.role !== role) {
    location.replace(`./auth.html?next=${next}&need=${role}`);
    return null;
  }

  return user;
};
