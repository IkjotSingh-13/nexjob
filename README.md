# Nexjob

A two-sided job platform built with React, plain CSS and a Promise-based service
layer. Thirteen routes, mobile-first, light and dark.

Listings, companies and hiring routes are sample data in `public/data/`. Everything
the app remembers — accounts, saved roles, applications, alerts, profiles, employer
postings — lives in the browser's `localStorage`. There is no server.

## Running it

Use Node.js 22 LTS (recommended). Node 20.19+ also supports the locked build tools.

```bash
npm ci
npm run dev        # http://localhost:5173/nexjob/
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint, including the React hooks rules |
| `npm run test:deployment` | Six production-build checks; run after `npm run build` |

## GitHub Pages deployment

The site is published at <https://ikjotsingh-13.github.io/nexjob/>. GitHub Pages must
publish the **compiled `dist/` directory**, not the React source files in the
repository root.

**One-time repository setting:** in **Settings → Pages → Build and deployment**,
set **Source** to **GitHub Actions**. Then push to `main`, or run **Deploy Nexjob to
GitHub Pages** from the Actions tab. The included workflow installs with `npm ci`,
builds with Node 22, verifies the output and deploys only `dist/`.

The Vite base defaults to `/nexjob/`, so scripts, CSS, React Router and JSON requests
all use the project path. The workflow obtains the base from GitHub Pages metadata,
which also supports forks or a configured custom domain.

`npm run build` also generates `dist/404.html` from the compiled entry point, so
refreshed links such as `/nexjob/jobs/1` and old `.html` bookmarks can boot the router.
GitHub Pages can still return HTTP 404 for the initial deep-link document; the app
then renders the requested route. For root-domain hosting instead, build with
`VITE_BASE_PATH=/ npm run build`.

See [the deployment repair guide](docs/GITHUB_PAGES_FIX.md) for the diagnosed cause,
exact activation steps and verification commands.

Demo accounts, both with the password `password123`:

| Email | Role | What it opens |
|---|---|---|
| `jane@example.com` | Job seeker | Dashboard, pipeline, profile and CV |
| `alex@example.com` | Employer at Linear | Posting management and the applicant pipeline |

## The idea

A job hunt is a series of questions about where you stand. Is this pay any good?
How far along is my application? How ready am I for this company's loop? So the
whole interface is built from one primitive — **a scale with ticks and a marker** —
and nothing decorative is layered on top of it.

**The pay scale is the signature.** Every salary in the dataset maps onto one shared
domain, computed from the data rather than hard-coded. The same component draws:

| Where | What it shows |
|---|---|
| Every listing card | A compact band |
| The job page | A tall band, a labelled axis, and the role against the board's midpoint |
| The board's filter | Two real range inputs painted as a ruler |
| Company pages | What that company pays, against everyone else |
| The pay explorer | One row per discipline, level, location, company or contract |
| The home page | All 28 bands at once — the shape of the market in one figure |

Twenty-eight listings stop being twenty-eight strings you have to hold in your head
and become one chart.

The same grammar carries two more domains. An application is a position on a hiring
pipeline. A profile is a position on a completeness scale. Because they share the
vocabulary, the product reads as one thing rather than a pile of features.

## Routes

| Route | What it does |
|---|---|
| `/` | The thesis, live search, figures, featured roles, pay by discipline |
| `/jobs` | Search, eight filters, four sorts, pagination — all in the query string |
| `/jobs/:id` | Full detail, the pay band in context, inline application, similar roles |
| `/companies` | Directory with each company's band and open count |
| `/companies/:id` | Profile, what they pay against the board, every open role |
| `/salaries` | Pay explorer, five groupings, and a percentile check for your own number |
| `/prep?company=` | The hiring loop stage by stage, what it weights, current intakes |
| `/dashboard` | Pipeline, matched roles, saved roles, alerts, recently viewed |
| `/profile` | Profile and CV builder, completeness meter, printable CV |
| `/post-job` | Three-step posting form with a live preview and a required band |
| `/employer` | Postings, applicants, and moving people through the stages |
| `/auth` | Sign in and registration for both account types |
| `*` | Everything, in one place, when a link goes wrong |

Filter state lives in the address bar, so a filtered board is shareable and the back
button behaves. Links from the earlier multi-page build (`jobs.html?q=react`,
`job.html?id=3`) redirect to their new routes.

`/dashboard` and `/profile` are for job seekers, `/post-job` and `/employer` for
employers. Visiting one while signed out goes to `/auth` and comes back afterwards;
an employer who lands on a seeker page is sent to their own dashboard.

## Features

**For job seekers** — search by keyword and location; filter by pay range, remote,
discipline, level, contract type and posting age; sort four ways; save roles; apply
and track each application through applied, screening, interview and offer; build a
profile and print it as a CV; create job alerts that show their current matches;
get roles scored against your own skills with the reasons shown rather than hidden;
see what it takes to get into each company.

**For employers** — register against a company, post roles through a three-step form
with a live preview, manage and close postings, read every applicant, and move them
through the pipeline. Moving someone from screening to interview changes what shows
on that person's dashboard, because both sides read one store.

## How it is built

```
Components ──read──▶ hooks ──subscribe──▶ store (localStorage)
     │                                         ▲
     └──────────write──▶ services/api.js ──────┘      every write returns a Promise
```

**Reading is reactive.** `services/storage.js` wraps `localStorage` as a subscribable
store, and `useDb` reads it through `useSyncExternalStore`. A write from anywhere —
another component, another tab — re-renders everything that reads that key, so no
page has to remember to refresh itself. The store hands back the same object while
the stored text is unchanged, which is what keeps that from looping. If the browser
refuses storage (private mode, quota) the app carries on from memory for the session.

**Writing is Promise-based.** Every operation the interface performs lives in
`services/api.js` and returns a Promise: `signIn`, `register`, `applyToJob`,
`moveApplication`, `publishPosting`, `saveProfile`, `toggleSaved` and the rest. With
no server, each call waits out a simulated round trip (`LATENCY` in
`services/promises.js`) and then touches the store — the shape a real backend would
have, so swapping in `fetch` means changing that one file. Domain failures reject
with an `ApiError` whose message is safe to show: a wrong password, a taken email, a
second application to the same role.

The UI treats them as real requests. The `useAction` hook tracks `pending`, so a
button reads "Signing in…" or "Sending…" and is released in `finally` whatever
happens; callers chain `.then` for the success toast and `.catch` for the error.

Where Promises are composed, rather than just returned:

| Where | How |
|---|---|
| `loadSeed` | `Promise.all` fetches the three data files together; the promise is shared, so every page waits on one request |
| `loadSeed` | `withTimeout` races it against a clock (`Promise.race`) and `retry` re-attempts with exponential backoff before giving up |
| `loadSeed` | A failure is not cached, so a "Try again" button really does try again |
| `BootCover` | `Promise.allSettled` waits for both the progress bar and the data, and lifts the cover even if the load failed — a cover that never lifts is a blank site |
| Job page share | `Promise.resolve().then(...)` turns a synchronous failure (no clipboard API) into a rejection the same `.catch` handles |

Set `VITE_API_LATENCY_SCALE=0` to switch the simulated waiting off, or `2` to see
the pending states for longer.

The board itself (`context/BoardContext.jsx`) is the loaded sample data with
whatever an employer has posted in this browser merged on top, so publishing a role
changes the board immediately.

## Design system

Every colour, typeface, space and radius is a custom property defined once in
`tokens.css`, so the two themes are the same rules with a different token set.

Two inks on paper. **Blue** is structure — rules, ticks, primary actions, the system
itself. **Orange** is position, and nothing else: the median tick, the current
pipeline stage, the active filter, the focus ring. If it ever covered more than a few
hundred pixels on a screen it would stop meaning anything, and that restraint is the
design.

| | Light | Dark |
|---|---|---|
| Paper | `#ECEDE8` | `#121317` |
| Panel | `#F8F8F4` | `#1A1C21` |
| Ink | `#14151A` | `#E9EAE4` |
| Blue | `#2B36C4` | `#7E8AFF` |
| Orange | `#FF5A1F` | `#FF6B3D` |

Type contrast is **width**, not style — fitting for a product about measurement, and
all three faces carry a width axis. [Archivo](https://fonts.google.com/specimen/Archivo)
sets headlines at `wdth 112–122`, widening as they grow, the way a ruler's major ticks
run longer than its minor ones. [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans)
carries body and interface text. [Martian Mono](https://fonts.google.com/specimen/Martian+Mono)
sets every figure, unit and field label, so data reads as data.

Radii are 2px. Machined, not doctrinaire.

## Accessibility

- Semantic landmarks and a skip link on every page
- Every control labelled; icon-only buttons carry `aria-label`
- Save buttons expose state through `aria-pressed`; the current page through `aria-current`
- The pay filter is two real `<input type="range">` elements painted to look like a
  ruler, so keyboard operation and screen reader announcements come free
- Every scale carries `role="img"` and a spoken description of the band it draws
- Result counts and errors announce through `aria-live`
- Visible focus ring on everything, in the position colour
- Text meets 4.5:1 in both themes; the focus ring uses a darkened orange to clear 3:1
- `prefers-reduced-motion` honoured throughout
- Moving between routes scrolls to the top (or the `#anchor`) and moves focus to the
  page, as the browser did on a full page load
- The drawer traps Tab, closes on Escape and hands focus back; the mobile filter
  sheet takes focus and closes on Escape

## Files

```
index.html                     Vite entry: head, pre-paint theme script, #root
vite.config.js, eslint.config.js
public/data/
  jobs.json                    28 listings
  companies.json               12 companies
  prep.json                    12 hiring routes
src/
  main.jsx                     Mounts the app; imports the stylesheets in order
  App.jsx                      Providers and the route table
  styles/
    tokens.css                 Palette, type, space, radii, motion; both themes
    base.css                   Reset, typography, the rule motif, focus
    layout.css                 Shell, containers, splits, visibility utilities
    components.css             Buttons, fields, cards, the pay scale, pipeline, dialogs
    pages.css                  Page-level composition
  pages/                       One component per route
  components/
    PayScale.jsx               The signature
    JobCard.jsx                The listing, its mini form and its skeletons
    Filters.jsx                The rail, including the ruler slider
    Pipeline.jsx               Application stages
    Layout, Header, Drawer, Footer, RequireAuth, BootCover, LoadError, Icon
  context/                     Theme, toasts, auth session, the board
  hooks/
    useDb.js                   Subscribe a component to one stored key
    useStore.js                Saved ids, applications, alerts, profile
    useAction.js               A Promise-returning operation plus its pending flag
    useSaved.js, usePageMeta.js
  services/
    storage.js                 localStorage as a subscribable store; v1 migration
    promises.js                delay, simulate, withTimeout, retry, LATENCY
    api.js                     Every operation the UI performs, as a Promise
  lib/                         Pure functions: formatting, scale maths, filtering,
                               sorting, scoring, profile completeness, URLs
```

Layer order is declared once in `tokens.css` as
`@layer tokens, base, layout, components, pages, utilities`, so later files never have
to fight specificity to win, and a visibility utility can always hide a component.

Listings carry `postedHoursAgo` rather than a fixed date, so a copy checked out a year
from now still reads as a live board.

## Caveats

This is a coursework project. There is no server, so:

- Passwords sit in plain text in `localStorage`. Do not reuse a real one.
- The "network" is simulated: requests wait a fixed time and never fail at random.
  The failure handling (retry, timeout, "Try again") is real and is exercised when
  the sample-data request itself fails.
- Job alerts show their current matches instead of sending email.
- The hiring routes in `prep.json` are written from how these processes are generally
  known to work, and the intake windows are illustrative rather than a calendar. The
  page says so too. Check a company's own careers page before relying on a date.
- Company names and brand colours belong to those companies and are used here as
  sample data.

The multi-page vanilla JavaScript build this was converted from is in this
repository's history; `e57185b` is the last commit before the conversion.

## Licence

MIT.
