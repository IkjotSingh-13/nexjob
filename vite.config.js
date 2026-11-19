import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Every page is still its own .html file, so links like ./job.html?id=3 work
// exactly as before. Vite just needs the list of pages to build.
const pages = [
  'index', 'jobs', 'job', 'companies', 'company', 'salaries', 'prep',
  'dashboard', 'profile', 'post-job', 'employer', 'auth', '404'
];

export default defineConfig({
  plugins: [react()],
  base: './',          // relative paths, so the site works in any folder (GitHub Pages too)
  appType: 'mpa',      // many pages, not a single-page app
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((name) => [name, `${name}.html`]))
    }
  }
});
