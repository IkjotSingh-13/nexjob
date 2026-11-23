# Nexjob

A two-sided job platform: one React (JSX) app with React Router, plain CSS, bundled
with Vite, and a FastAPI + MySQL backend. Thirteen pages, mobile-first, light and dark.

Jobs and companies are stored in MySQL and served by the backend in `backend/`.
Employer postings are saved there too. Everything else the app remembers — accounts,
saved roles, applications, alerts, profiles — lives in the browser's `localStorage`.
Without the backend (on GitHub Pages, for example) the site reads the same jobs and
companies from the sample files in `public/data/`.

## Running it

You need Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually <http://localhost:5173>). The data is
loaded with `fetch`, so the site has to be served — opening `index.html` straight
from the file system leaves the listings empty.

Start the backend too (below) to load jobs from MySQL and to post roles. If it is not
running, the site still works from the JSON files, but posting, closing and deleting
a role will say the backend is needed.

```bash
npm run build      # production build into dist/
npm run preview    # serve the built site locally
```

Demo accounts, both with the password `password123`:

| Email | Role | What it opens |
|---|---|---|
| `jane@example.com` | Job seeker | Dashboard, pipeline, profile and CV |
| `alex@example.com` | Employer at Linear | Posting management and the applicant pipeline |

## Backend (FastAPI + MySQL)

`backend/` is a small API that stores jobs and companies in MySQL. It uses plain SQL
through `mysql-connector-python`, with no ORM. You need Python 3.10+ and a running
MySQL server.

The column names match the keys in the JSON files (`salaryMin`, `companyId` …), so the
API returns exactly the shape the React site reads. Lists such as a job's tags are
stored in MySQL `JSON` columns. Jobs also have `status` (`open` or `closed`) and
`postedBy` (the employer who posted it; empty for the sample jobs).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate             # Windows. On macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # then put your MySQL password in .env
python setup_db.py                 # creates the database and tables, loads public/data
uvicorn main:app --reload
```

Open <http://127.0.0.1:8000/docs> to try every endpoint in the browser.

**Opening the data in DB Browser for SQLite.** MySQL keeps its tables in its own
format (`jobs.ibd`, `companies.ibd` under `C:\ProgramData\MySQL\MySQL Server 8.4\Data\nexjob\`),
which DB Browser cannot open. So the backend also keeps a SQLite copy in
`backend/nexjob.db`: `setup_db.py` creates it, and the API rewrites it after every
job that is added, changed or deleted. Open that file in DB Browser, and use its
refresh button (or reopen the file) to see new changes. MySQL is still the real
database: edits made in DB Browser are not sent back. The file is not committed.

To test it, leave the API running and run `python test_api.py` in a second terminal
(inside `backend`, with `.venv` activated). It adds a test job, changes it and
deletes it, so the database ends up as it started.

| Method | Path | What it does |
|---|---|---|
| GET | `/` | Checks that MySQL is connected |
| GET | `/companies` | All companies |
| GET | `/jobs` | All jobs |
| GET | `/jobs/{id}` | One job, or 404 |
| POST | `/jobs` | Add a job |
| PUT | `/jobs/{id}` | Change a job |
| DELETE | `/jobs/{id}` | Delete a job |

```
backend/
  database.py       Connects to MySQL; fetch_all() for SELECT, execute() for changes
  setup_db.py       Creates the nexjob database and two tables, fills them from public/data
  main.py           The FastAPI app and its endpoints
  sqlite_copy.py    save_copy(): writes the MySQL tables into nexjob.db for DB Browser
  test_api.py       17 checks against the running API, using only Python's standard library
  requirements.txt  fastapi, uvicorn, mysql-connector-python, python-dotenv
  .env.example      Copy to .env and add your MySQL password (.env is not committed)
```

The React site calls the API from `src/lib/api.js` whenever it is opened on
`localhost` or `127.0.0.1`. Anywhere else (GitHub Pages can only host static files)
it reads `public/data/` instead, and it does the same locally when the API is not
running.

If you set up the database with an earlier version of `setup_db.py` (columns such as
`salary_min`), drop the two tables in MySQL and run `python setup_db.py` again.

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

## Pages

There is one HTML file. React Router's `HashRouter` picks the page from the part of
the address after the `#`, so every page works on GitHub Pages without server setup.

| Address | What it does |
|---|---|
| `#/` | The thesis, live search, figures, featured roles, pay by discipline |
| `#/jobs` | Search, eight filters, four sorts, pagination — all in the query string |
| `#/job?id=` | Full detail, the pay band in context, inline application, similar roles |
| `#/companies` | Directory with each company's band and open count |
| `#/company?id=` | Profile, what they pay against the board, every open role |
| `#/salaries` | Pay explorer, five groupings, and a percentile check for your own number |
| `#/prep?company=` | The hiring loop stage by stage, what it weights, current intakes |
| `#/dashboard` | Pipeline, matched roles, saved roles, alerts, recently viewed (job seekers) |
| `#/profile` | Profile and CV builder, completeness meter, printable CV (job seekers) |
| `#/post-job` | Three-step posting form with a live preview and a required band (employers) |
| `#/employer` | Postings, applicants, and moving people through the stages (employers) |
| `#/auth` | Sign in and registration for both account types |
| anything else | Everything, in one place, when a link goes wrong |

Filter state lives in the address bar, so a filtered board is shareable and the back
button behaves. Pages marked for job seekers or employers are wrapped in
`<RequireRole>` in `src/main.jsx`, which sends anyone else to sign in. Old links such
as `jobs.html?q=react` still work on GitHub Pages: `public/404.html` forwards them to
`#/jobs?q=react`.

## React features used

| Feature | Where |
|---|---|
| `useState` | Every page: form fields, filters, the open menu, the theme, the signed-in user |
| `useEffect` | Loading data when a page opens (`useBoardData` in `src/lib/hooks.js`), the tab title, the theme, closing menus on Escape |
| `useContext` | `src/lib/UserContext.jsx` shares the signed-in user. The header, menu, sign-in page, dashboards and job page read it with `useContext(UserContext)`; signing in or out calls `setUser` |
| Promises | `fetch().then` and `Promise.all` for the data, every backend call in `src/lib/api.js`, and `fakeServer` for sign in, register and applying (see below) |
| `localStorage` | `src/lib/store.js`: accounts, the session, saved roles, applications, alerts, profiles, the theme |
| React Router | `HashRouter`, `Routes`, `Route`, `Link`, `Navigate`, `useNavigate`, `useLocation` |

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

## Files

```
index.html                     The one page: fonts, the theme script and a #root
vite.config.js                 Vite with the React plugin
public/404.html                GitHub Pages: forwards old links (jobs.html?…) to #/jobs?…
public/data/
  jobs.json                    28 listings (also loaded into MySQL by setup_db.py)
  companies.json               12 companies (also loaded into MySQL)
  prep.json                    12 hiring routes
backend/                       FastAPI + MySQL, see "Backend" above
src/
  main.jsx                     The router: every address and its page, and RequireRole
  styles/
    tokens.css                 Palette, type, space, radii, motion; both themes
    base.css                   Reset, typography, the rule motif, focus
    layout.css                 Shell, containers, splits, visibility utilities
    components.css             Buttons, fields, cards, the pay scale, pipeline, dialogs
    pages.css                  Page-level composition
  lib/
    api.js                     Calls the backend: getJobs, getCompanies, createJob, updateJob, deleteJob
    UserContext.jsx            The signed-in user, shared with React context
    format.js                  Money, dates, and the scale arithmetic
    store.js                   localStorage schema, with a migration from v1
    data.js                    Loading (backend or JSON files), filtering, sorting, scoring
    auth.js                    Accounts and sessions (sign in and register return Promises)
    promise.js                 fakeServer: a Promise that resolves or rejects after 500 ms
    hooks.js                   useBoardData (load the data) and useSaved (bookmarks)
    toast.js                   Sends a status message to <Toasts />
    url.js                     Read ?params from the address, build links
  components/
    Layout.jsx                 Header, footer, menu, the theme, the tab title, signing out
    PayScale.jsx               The signature
    JobCard.jsx                The listing
    Filters.jsx                The rail, including the ruler slider
    Pipeline.jsx               Application stages
    Icon.jsx                   One line weight, one grid
    …                          Header, Drawer, Footer, Toasts, BootCover, Mark, Stats
  pages/                       One component per page
```

Layer order is declared once in `tokens.css` as
`@layer tokens, base, layout, components, pages, utilities`, so later files never have
to fight specificity to win, and a visibility utility can always hide a component.

Listings carry `postedHoursAgo` rather than a fixed date, so a copy checked out a year
from now still reads as a live board.

## Promises

Accounts and applications are not on the backend, so `src/lib/promise.js` provides
`fakeServer(work)`: a Promise that waits half a second and then resolves with whatever
`work` returns, or rejects with whatever it throws. It is used in three places, each
handled with `.then`, `.catch` and `.finally` so the button shows a pending state and
is always released:

- Sign in and register (`src/lib/auth.js`, `src/pages/Auth.jsx`)
- Send application (`src/pages/Job.jsx`)

Every call to the real backend in `src/lib/api.js` returns a Promise from `fetch`, and
is handled the same way: publishing a role (`src/pages/PostJob.jsx`), and closing,
reopening or deleting one (`src/pages/Employer.jsx`).

The jobs, companies and `prep.json` load together with `Promise.all` in
`src/lib/data.js`. If the backend does not answer, `.catch` falls back to the JSON files.

## Deployment

`.github/workflows/deploy-pages.yml` installs the dependencies, runs `npm run build`
and publishes `dist/` to GitHub Pages on every push to `main`. The build uses relative
paths, so it works under any project path. The backend is not deployed: the published
site reads the JSON files, and posting a role there says the backend is needed.

## Caveats

This is a coursework project. The backend only stores jobs and companies, so:

- Passwords sit in plain text in `localStorage`. Do not reuse a real one.
- An account, and a company created when registering as an employer, exist only in
  the browser that made them.
- Job alerts show their current matches instead of sending email.
- The hiring routes in `prep.json` are written from how these processes are generally
  known to work, and the intake windows are illustrative rather than a calendar. The
  page says so too. Check a company's own careers page before relying on a date.
- Company names and brand colours belong to those companies and are used here as
  sample data.

The previous single-page version of this project is preserved in `../nexjob-legacy/`
and in this repository's history.

## Licence

MIT.
