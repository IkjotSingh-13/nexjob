/** Run after npm run build. Uses Node's built-in test runner: no new dependency. */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const base = process.env.VITE_BASE_PATH || '/nexjob/';
const dist = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', dist), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
const styles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((href) => href.endsWith('.css'));
const localAssets = [...scripts, ...styles].filter((href) => !/^https?:\/\//.test(href));

test('Pages entry point is compiled JavaScript, not the raw React source', () => {
  assert.ok(scripts.some((src) => src.endsWith('.js')));
  assert.ok(!html.includes('/src/main.jsx'));
  assert.ok(!scripts.some((src) => /\.[jt]sx(?:\?|$)/.test(src)));
});

test('every local script and stylesheet uses the Pages project base', () => {
  assert.ok(localAssets.length >= 2, 'Expected a JS bundle and a CSS bundle.');
  for (const asset of localAssets) {
    assert.ok(asset.startsWith(`${base}assets/`), `${asset} must start with ${base}assets/`);
  }
});

test('all referenced local production assets exist in the publish directory', async () => {
  for (const asset of localAssets) {
    assert.ok((await stat(new URL(asset.slice(base.length), dist))).isFile(), asset);
  }
});

test('the direct-link fallback boots the exact same compiled app', async () => {
  assert.equal(await readFile(new URL('404.html', dist), 'utf8'), html);
});

test('all three sample datasets are shipped unchanged with the website', async () => {
  for (const name of ['jobs', 'companies', 'prep']) {
    const data = JSON.parse(await readFile(new URL(`data/${name}.json`, dist), 'utf8'));
    const source = JSON.parse(
      await readFile(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8')
    );
    assert.ok(Array.isArray(data) && data.length > 0, `${name}.json must contain records.`);
    assert.deepEqual(data, source, `${name}.json must match the current source dataset.`);
  }
});

test('the static publish directory disables Jekyll processing', async () => {
  assert.ok((await stat(new URL('.nojekyll', dist))).isFile());
});
