# NexJob

A job board for engineering, design and product roles, built with plain HTML, CSS
and JavaScript. No framework, no build step, no dependencies.

Listings are sample data held in `jobs.json`. Everything the app remembers — saved
roles, theme, alerts, accounts — lives in the browser's `localStorage`.

## Running it

The app loads `jobs.json` with `fetch` and uses ES modules, so it needs to be
served over HTTP. Opening `index.html` from the file system will leave the
listings empty.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. In VS Code, the Live Server extension works too.

## What it does

- **Search** by title, company, description or skill tag, and by location
- **Filter** by discipline, with an all/saved scope switch
- **Save roles** to a bookmark list that survives a reload
- **View details** in a dialog with the full description, requirements and an
  application form
- **Post a role**, which prepends it to the current session's listings
- **Set up alerts** by discipline and frequency
- **Sign in or register**, against a demo account list in `localStorage`
- **Switch themes** between light and dark

Demo account: `jane@example.com` / `password123`.

## Layout

Mobile-first. Base styles target a phone; three `min-width` breakpoints progressively
widen the layout.

The listing is the piece worth looking at. On a phone each role is a card with its
pay, location and type stacked as labelled field/value pairs. At 860px the same
markup becomes a dense table row — the `<dl>` switches to `display: contents` so its
pairs drop into the row's grid as aligned columns, with pay right-aligned and set in
tabular figures. One set of markup, two layouts, no duplication.

## Design system

Every colour, typeface and radius is a custom property defined once in
`style.css`, so the two themes are the same rules with a different token set.

| | Light | Dark |
|---|---|---|
| Ground | `#f8fbf9` | `#080b0a` |
| Panel | `#ffffff` | `#101614` |
| Ink | `#0e1613` | `#eaf2ee` |
| Brand | `#12503b` | `#3cb98a` |

Type is [Chivo](https://fonts.google.com/specimen/Chivo) for the interface and
[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for data —
pay, location, counts and field labels. The monospace face is what makes a listing
scannable: figures line up, and labels read as labels.

Colour is used sparingly and always means something. Green marks the primary
action and saved state, amber marks a recent posting, and the only other colour on
the page comes from the company marks, which carry each employer's real brand
colour out of `jobs.json`.

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `footer`, `aside`) and a skip link
- Native `<dialog>` with `showModal()`, so focus trapping and Escape come free
- Every control labelled; icon-only buttons carry `aria-label`
- Save buttons expose state through `aria-pressed`
- Visible focus ring on every interactive element
- `prefers-reduced-motion` honoured

## Files

| File | Role |
|---|---|
| `index.html` | Markup and the inline script that sets the theme before first paint |
| `style.css` | Tokens, components and breakpoints |
| `main.js` | State, event wiring, bootstrap |
| `ui.js` | Rendering, filtering, summary figures |
| `storage.js` | `localStorage` for saves, theme, alerts, accounts |
| `api.js` | Fetches `jobs.json` |
| `jobs.json` | Sample listings |

`main.js` holds all the state and event binding; `ui.js` only turns data into
markup and never reads state. Keeping that split means the render functions can be
reasoned about on their own.

## Licence

MIT.
