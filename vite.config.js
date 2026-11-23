import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One page (index.html). React Router shows the right screen from the address,
// e.g. index.html#/job?id=3.
export default defineConfig({
  plugins: [react()],
  base: './'           // relative paths, so the site works in any folder (GitHub Pages too)
});
