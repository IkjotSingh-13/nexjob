import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // This is a GitHub Pages project site, not a domain-root deployment.
  // The workflow overrides this from Pages metadata for forks/custom domains.
  base: process.env.VITE_BASE_PATH || '/nexjob/',
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'localhost']
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'localhost']
  }
});
