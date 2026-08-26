# Nexjob

A two-sided job platform built with plain HTML, CSS and JavaScript. No framework,
no build step, no dependencies. Thirteen pages, mobile-first, light and dark.

Listings, companies and hiring routes are sample data in `assets/data/`. Everything
the app remembers — accounts, saved roles, applications, alerts, profiles, employer
postings — lives in the browser's `localStorage`.

## Running it

The pages load their data with `fetch` and use ES modules, so the folder has to be
served over HTTP. Opening `index.html` straight from the file system leaves the
listings empty.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. In VS Code, the Live Server extension works too.

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

## Pages

| Page | What it does |
|---|---|
| `index.html` | The thesis, live search, figures, featured roles, pay by discipline |
| `jobs.html` | Search, eight filters, four sorts, pagination — all in the query string |
| `job.html?id=` | Full detail, the pay band in context, inline application, similar roles |
| `companies.html` | Directory with each company's band and open count |
| `company.html?id=` | Profile, what they pay against the board, every open role |
| `salaries.html` | Pay explorer, five groupings, and a percentile check for your own number |
| `prep.html?company=` | The hiring loop stage by stage, what it weights, current intakes |
| `dashboard.html` | Pipeline, matched roles, saved roles, alerts, recently viewed |
| `profile.html` | Profile and CV builder, completeness meter, printable CV |
| `post-job.html` | Three-step posting form with a live preview and a required band |
| `employer.html` | Postings, applicants, and moving people through the stages |
| `auth.html` | Sign in and registration for both account types |
| `404.html` | Everything, in one place, when a link goes wrong |

Filter state lives in the address bar, so a filtered board is shareable and the back
button behaves.

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
index.html … 404.html          One file per page
assets/
  css/
    tokens.css                 Palette, type, space, radii, motion; both themes
    base.css                   Reset, typography, the rule motif, focus
    layout.css                 Shell, containers, splits, visibility utilities
    components.css             Buttons, fields, cards, the pay scale, pipeline, dialogs
    pages.css                  Page-level composition
  js/
    core/
      dom.js                   Selectors, escaping, delegation, query-string helpers
      format.js                Money, dates, and the scale arithmetic
      store.js                 localStorage schema, with a migration from v1
      data.js                  Loading, hydration, filtering, sorting, scoring
      auth.js                  Accounts, sessions, route guards
      theme.js                 Light, dark, and following the system
      toast.js                 Status messages
      shell.js                 Header, drawer and footer wiring for every page
    components/
      pay-scale.js             The signature
      job-card.js              The listing
      filters.js               The rail, including the ruler slider
      pipeline.js              Application stages
      icons.js                 One line weight, one grid
    pages/                     One module per page
  data/
    jobs.json                  28 listings
    companies.json             12 companies
    prep.json                  12 hiring routes
```

Layer order is declared once in `tokens.css` as
`@layer tokens, base, layout, components, pages, utilities`, so later files never have
to fight specificity to win, and a visibility utility can always hide a component.

Listings carry `postedHoursAgo` rather than a fixed date, so a copy checked out a year
from now still reads as a live board.

## Caveats

This is a coursework project. There is no server, so:

- Passwords sit in plain text in `localStorage`. Do not reuse a real one.
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
