/**
 * Two small React hooks that several pages share.
 */

import { useEffect, useState } from 'react';
import { loadData } from './data.js';
import { getSaved, toggleSaved } from './store.js';
import { toast } from './toast.js';

/**
 * Load the board data when the page opens.
 * `data` is null until it arrives; `failed` turns true if it cannot load.
 * Call `reload()` to fetch it again (after an employer edits a posting).
 */
export function useBoardData() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const reload = () => {
    loadData()
      .then((result) => setData(result))
      .catch((error) => {
        console.error(error);
        setFailed(true);
      });
  };

  useEffect(() => {
    reload();
  }, []);

  return { data, failed, reload };
}

/**
 * The saved (bookmarked) role ids, and a function to save or unsave one.
 * const [saved, toggleSave] = useSaved();
 */
export function useSaved() {
  const [saved, setSaved] = useState(getSaved);

  const toggleSave = (jobId) => {
    const nowSaved = toggleSaved(jobId);   // saves it in localStorage
    setSaved(getSaved());                  // and updates the screen

    if (nowSaved) {
      toast('Role saved', 'ok');
    } else {
      toast('Role removed from saved', 'info');
    }
  };

  return [saved, toggleSave];
}
