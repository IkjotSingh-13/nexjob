import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { KEY, write } from '../services/storage.js';
import { useDb } from '../hooks/useDb.js';

/**
 * Theme.
 *
 * Three states, as the stylesheet expects: an explicit light choice, an
 * explicit dark choice, and no choice at all — which follows the operating
 * system. The inline script in index.html applies the stored value before
 * first paint so the page never flashes the wrong theme; this takes over once
 * React has mounted.
 */

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

const DARK = '(prefers-color-scheme: dark)';

const watchSystem = (callback) => {
  const query = window.matchMedia(DARK);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};

const systemPrefersDark = () => window.matchMedia(DARK).matches;

export function ThemeProvider({ children }) {
  const stored = useDb(KEY.theme, null);
  const prefersDark = useSyncExternalStore(watchSystem, systemPrefersDark);

  const theme = stored === 'light' || stored === 'dark'
    ? stored
    : (prefersDark ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    write(KEY.theme, theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export const useTheme = () => useContext(ThemeContext);
