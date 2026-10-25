# GitHub Pages deployment repair

Prepared on **25 October 2026** against `IkjotSingh-13/nexjob` main commit
`dd231cc8b026123477794dc9f6337ad809bc7bfc`.

**Status:** repaired and tested locally. No commit, push, Pages settings change, or
remote deployment was performed by the assistant. Apply these files and activate
the workflow below to update the public website.

## What was broken

At `https://ikjotsingh-13.github.io/nexjob/`, the public HTML was the repository's
unbuilt source entry:

```html
<script type="module" src="/src/main.jsx"></script>
```

That requests `https://ikjotsingh-13.github.io/src/main.jsx`, which returned HTTP
404. A Chromium check confirmed that the React root remained empty. GitHub Pages
does not compile Vite/JSX source automatically just because the repository contains
React. Its successful source-publication run did not mean the React app was built.

The original Vite config also lacked a project base: its production HTML pointed
to `/assets/` instead of `/nexjob/assets/`. Both publication and asset paths needed
repair. A base-path change alone would not compile the source website.

## What this repair changes

| File | Purpose |
| --- | --- |
| `.github/workflows/deploy-pages.yml` | On pushes to `main` or manual runs: install with `npm ci`, build with Node 22, verify the output, upload only `dist`, and deploy using the official Pages actions. |
| `vite.config.js` | Default base `/nexjob/`; optional `VITE_BASE_PATH` for a different host/path. |
| `scripts/prepare-pages.mjs` | Generate `dist/404.html` from the compiled entry and add `.nojekyll`. |
| `tests/deployment.test.mjs` | Six dependency-free checks for compiled bundles, correct asset paths, shipped files/data and the fallback. |
| `package.json`, `package-lock.json` | Hook Pages preparation into the build, add the check command and declare the Node requirement. Locked dependency versions are unchanged. |
| `README.md`, this guide | Setup, activation, limitations and verification instructions. |

The workflow takes its base from `actions/configure-pages` metadata. That gives
`/nexjob/` for this project URL and `/` for a root-hosted Pages custom domain.
React Router's existing basename and the existing Promise-based data service
already consume Vite's `BASE_URL`; no application source changes were necessary.

## Activate the deployment

### 1. Select GitHub Actions as the Pages source

As the repository owner, open:

**https://github.com/IkjotSingh-13/nexjob/settings/pages**

Under **Build and deployment → Source**, choose **GitHub Actions**, not
"Deploy from a branch". Also ensure Actions is enabled for the repository.

This is a repository setting; adding a workflow file cannot be assumed to change
it. The workflow uses scoped `GITHUB_TOKEN` permissions (`contents: read`,
`pages: write`, `id-token: write`) and does not require you to add a personal token
or disclose credentials.

### 2. Apply and push the repair

Choose **one** delivery method:

- **Patch (recommended for an existing clone):** download `nexjob-pages-fix.patch`
  next to your `nexjob` directory, then run the commands below. It targets
  `dd231cc8b026123477794dc9f6337ad809bc7bfc`. If your branch has changed, stop if
  `git apply --check` reports conflicts and merge the listed files instead.
- **Full source ZIP:** extract `nexjob-pages-fixed.zip` and copy its contents into
  the current repository. Include the hidden `.github/workflows/` directory.
  Do not replace your updated app with the older `nexjob-react.zip` migration.
  The ZIP intentionally excludes `.git`, `node_modules` and generated `dist`.

For the patch method, start with a clean working tree and Node 22 LTS:

```sh
cd nexjob
git switch main
git pull --ff-only
git apply --check ../nexjob-pages-fix.patch
git apply ../nexjob-pages-fix.patch
npm ci
npm run lint
npm run build
npm run test:deployment
git add .github/workflows/deploy-pages.yml vite.config.js scripts/prepare-pages.mjs tests/deployment.test.mjs package.json package-lock.json README.md docs/GITHUB_PAGES_FIX.md
git commit -m "Fix Vite build and GitHub Pages deployment"
git push origin main
```

The push starts **Deploy Nexjob to GitHub Pages**. If the files were already
pushed before you changed the Pages source, open
**https://github.com/IkjotSingh-13/nexjob/actions**, select that workflow, and choose
**Run workflow → main**. Wait for both `build` and `deploy` to succeed.

Publish the repository's source files and workflow; do not manually commit
`node_modules`, upload the raw JSX entry as the site, or configure the workflow to
upload the repository root instead of `dist`.

### 3. Verify the real public deployment

After the new workflow succeeds:

1. Open `https://ikjotsingh-13.github.io/nexjob/` and hard-refresh.
2. View source: the script should be `/nexjob/assets/index-<hash>.js`, not
   `/src/main.jsx`. The hashed JavaScript and CSS must return HTTP 200.
3. Check `/nexjob/data/jobs.json`, `/nexjob/data/companies.json` and
   `/nexjob/data/prep.json` load successfully.
4. Open and refresh `/nexjob/jobs/1`; it should render Frontend Engineer.
5. Check `/nexjob/companies/stripe` and the older
   `/nexjob/job.html?id=3` bookmark (which should redirect to `/nexjob/jobs/3`).
6. Check demo sign-in and the seeker/employer dashboard links.

If the source still contains `/src/main.jsx`, the old source publication is still
being served. Recheck the Pages source and the newest custom workflow run rather
than changing the React entry file to a hashed bundle by hand.

## Local verification completed

The following checks passed on the repaired checkout:

- Clean `npm ci`, ESLint, production build and all **6 deployment checks**.
- `VITE_BASE_PATH=/` build and checks, followed by restoration of the default
  `/nexjob/` build.
- Chromium production smoke checks: home, jobs, job detail, companies, company
  detail, salaries, prep, authentication and the unknown-route page.
- Pages-style HTTP 404 document simulation: job detail and refresh, company
  detail, and the legacy job bookmark all rendered the compiled React app.
- Seeker sign-in/profile and employer sign-in/dashboard/posting route.
- A 390px mobile home viewport without horizontal overflow.
- No uncaught browser JavaScript errors or failed first-party asset/data requests
  in those checks. The original 28 jobs, 12 companies and 12 prep records remain.

These are **local build/browser results, not evidence of a completed GitHub
Actions deployment**. The browser smoke checks are separate QA, not an added
Playwright dependency or a claim that every application feature has been retested.

To repeat the production build checks:

```sh
npm ci
npm run lint
npm run build
npm run test:deployment
npm run preview
# Open http://localhost:4173/nexjob/
```

For a root-hosted build, use the same override for both commands:

```sh
VITE_BASE_PATH=/ npm run build
VITE_BASE_PATH=/ npm run test:deployment
```

Rebuild without that override before publishing a manually built artifact to the
`/nexjob/` project URL. The Actions workflow sets the correct value automatically.

## Limitations and retained versions

- GitHub Pages has no server-side SPA rewrite rules. The generated `404.html`
  boots React for direct/deep links, but the initial deep-link HTTP response can
  still be **404**. Normal in-app navigation works without that document request.
  This is not a server-side 200 rewrite or a guarantee of search-engine indexing.
- Demo authentication and browser-only persistence are unchanged; this deployment
  repair does not create a backend, secure production authentication, real job
  applications or email delivery.
- The current remote conversion is distinct from the earlier assistant migration.
  This repair does not add Redux Toolkit, React Hook Form/Zod or `/evaluation` to
  this updated app, and does not claim the earlier migration's test counts.
- The original vanilla JavaScript website at
  `e57185b5bdae3888510be04e4af9e7659e58e835` was retained separately in the shared
  workspace as `nexjob-original-js/`. The updated app and that original snapshot
  have not been overwritten by the earlier migration.
