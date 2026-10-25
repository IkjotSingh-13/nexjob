import { useCallback, useRef } from 'react';
import * as api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useSavedIds } from './useStore.js';

/**
 * Saved roles: the ids to read, and a `toggle` that talks to the service layer.
 *
 * `toggle` settles with a toast either way. A second tap on the same role
 * while the first is still in flight is ignored, so a double-click cannot save
 * and immediately unsave.
 */
export const useSaved = () => {
  const ids = useSavedIds();
  const toast = useToast();
  const inFlight = useRef(new Set());

  const has = useCallback((jobId) => ids.includes(Number(jobId)), [ids]);

  const toggle = useCallback((jobId) => {
    const id = Number(jobId);
    if (inFlight.current.has(id)) return Promise.resolve();

    inFlight.current.add(id);

    return api.toggleSaved(id)
      .then(({ saved }) => toast(saved ? 'Role saved' : 'Role removed from saved', saved ? 'ok' : 'info'))
      .catch((error) => toast(error.message, 'stop'))
      .finally(() => inFlight.current.delete(id));
  }, [toast]);

  return { ids, has, toggle };
};
