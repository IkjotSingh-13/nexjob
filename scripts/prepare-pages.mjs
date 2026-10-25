import { copyFile, readFile, writeFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (entry.includes('/src/main.jsx')) {
  throw new Error('Pages must publish a compiled Vite build, not the JSX source entry.');
}

// Pages has no SPA rewrite rules. Its custom 404 document must boot the same
// compiled app so /nexjob/jobs/1 and old .html bookmarks survive a direct visit.
await copyFile(
  new URL('../dist/index.html', import.meta.url),
  new URL('../dist/404.html', import.meta.url)
);

// Also makes this build safe to publish as static files without Jekyll.
await writeFile(new URL('../dist/.nojekyll', import.meta.url), '');
console.log('Prepared GitHub Pages: compiled 404 fallback and .nojekyll.');
