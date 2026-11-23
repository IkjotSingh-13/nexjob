/**
 * Accounts and sign-in.
 *
 * Demo only: passwords sit in localStorage in plain text because the backend
 * only stores jobs and companies. Never reuse a real password here.
 *
 * Components get the signed-in user from UserContext (lib/UserContext.jsx).
 * After signIn or register, call setUser(user) so every component sees it.
 */

import {
  getAccounts, saveAccounts, setSession, clearSession, addCustomCompany, newId
} from './store.js';
import { initials, colourFor } from './format.js';
import { fakeServer } from './promise.js';

const AVATAR_COLOURS = ['#2B36C4', '#17694A', '#8A5A00', '#7A2E6B', '#1F5C7A'];

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

/** The account that uses this email address (any capitals), or undefined. */
const findAccount = (accounts, email) => {
  const wanted = email.trim().toLowerCase();
  return accounts.find((account) => account.email.toLowerCase() === wanted);
};

/**
 * An id made from a company name: "Acme Labs!" -> "acme-labs".
 * Every run of characters that is not a letter or digit becomes one "-",
 * then any "-" left at the start or end is removed.
 */
const makeCompanyId = (name) => {
  let id = name.toLowerCase();
  id = id.replace(/[^a-z0-9]+/g, '-');   // "acme labs!" -> "acme-labs-"
  id = id.replace(/^-|-$/g, '');         // "acme-labs-" -> "acme-labs"
  if (id === '') {
    id = newId();   // a name with no letters or digits at all
  }
  return id;
};

/** @returns {Promise<Object>} signed-in user, ya error ke saath reject */
export const signIn = (email, password) => fakeServer(() => {
  const account = findAccount(getAccounts(), email);

  if (!account) {
    throw new Error('No account uses that email address.');
  }
  if (account.password !== password) {
    throw new Error('That password does not match.');
  }

  return startSession(account);
});

/**
 * @param {{name, email, password, role, companyId?, companyName?}} details
 * @returns {Promise<Object>} naya user, ya error ke saath reject
 */
export const register = (details) => fakeServer(() => {
  const accounts = getAccounts();
  const email = details.email.trim().toLowerCase();

  if (findAccount(accounts, email)) {
    throw new Error('That email already has an account. Sign in instead.');
  }

  let companyId = details.companyId || null;

  /* An employer at a company we do not list gets a company made for them. */
  if (details.role === 'employer' && !companyId && details.companyName) {
    const name = details.companyName.trim();
    companyId = makeCompanyId(name);

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

  let role = 'seeker';
  if (details.role === 'employer') {
    role = 'employer';
  }

  /* Each new account takes the next colour, going round the list again after the last one. */
  const avatarBg = AVATAR_COLOURS[accounts.length % AVATAR_COLOURS.length];

  const account = {
    id: newId(),
    name: details.name.trim(),
    email,
    password: details.password,
    role,
    companyId,
    avatarBg
  };

  saveAccounts([...accounts, account]);
  return startSession(account);
});

export const signOut = () => clearSession();
