/**
 * Typed views onto the store.
 *
 * Each hook reads one key and derives what the interface wants from it. They
 * are the read side of the app: the write side is the service layer, and the
 * store joins the two, so a write there re-renders every component using one
 * of these.
 */

import { useMemo } from 'react';
import { KEY, NONE, NONE_BY_ID } from '../services/storage.js';
import { emptyProfile } from '../lib/profile.js';
import { useDb } from './useDb.js';

export const useSavedIds = () => {
  const raw = useDb(KEY.saved, NONE);
  return useMemo(() => raw.map(Number), [raw]);
};

export const useRecentIds = () => {
  const raw = useDb(KEY.recent, NONE);
  return useMemo(() => raw.map(Number), [raw]);
};

export const useAllApplications = () => useDb(KEY.applications, NONE);

export const useApplicationsFor = (userId) => {
  const all = useAllApplications();
  return useMemo(() => all.filter((a) => a.userId === userId), [all, userId]);
};

export const useAlerts = () => useDb(KEY.alerts, NONE);

export const usePostings = () => useDb(KEY.postings, NONE);

export const useProfile = (userId) => {
  const all = useDb(KEY.profiles, NONE_BY_ID);
  return useMemo(() => ({ ...emptyProfile(), ...(all[userId] || {}) }), [all, userId]);
};
