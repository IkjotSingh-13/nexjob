import { useSyncExternalStore } from 'react';
import { read, subscribe } from '../services/storage.js';

/**
 * Read one stored key and re-render whenever it changes — from this tab or
 * another. Pass a stable fallback (the NONE constants), not a fresh literal:
 * the fallback is the snapshot when nothing is stored, and a new object every
 * render would look like a change every render.
 */
export const useDb = (key, fallback) =>
  useSyncExternalStore(subscribe, () => read(key, fallback));
