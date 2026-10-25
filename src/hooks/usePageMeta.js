import { useEffect } from 'react';

/** Keep the tab title and meta description in step with the page on screen. */
export const usePageMeta = (title, description) => {
  useEffect(() => {
    document.title = title;

    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }
  }, [title, description]);
};
