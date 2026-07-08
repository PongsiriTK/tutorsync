# TutorSync — agent notes

Static React SPA (Vite, React 18, no backend). Thai/English app demo with two
layouts chosen at runtime by `state.desktop` (`window.innerWidth >= 1024`,
updated on resize):

- **Mobile/phone** (<1024px): fixed 390×844 "phone frame" that scales to the
  viewport (`PhoneFrame` in `Chrome.jsx`).
- **Desktop** (≥1024px): `DesktopShell` — left sidebar (brand, nav, plan
  identity chip, Book-session/New-goal CTA, profile), header row, max-width
  main column. Home/market cards become grids, calendar gets a right legend
  rail, goals a 2-column grid. Bottom sheets render as centered modals via
  the `SheetShell` wrapper in `Sheets.jsx` (`v.desktop` branch).

## File map

- `design/TutorSync.dc.html` — the original Claude Design source (x-dc template
  + `DCLogic` class script). **Source of truth for visuals.** Not shipped.
- `src/App.jsx` — one class component holding ALL state and logic. Ported
  nearly 1:1 from the design's `Component extends DCLogic`:
  `renderVals()` computes a big `v` object (values + inline-CSS strings +
  handler closures) that every presentational component consumes.
- `src/util.js` — `sx('css:string')` parses CSS strings into React style
  objects (memoized). This keeps the port mechanical; don't "clean up" inline
  styles into CSS classes without checking the design source.
- `src/data.js` — themes/people/seeds. Session `day` is a bare day-of-month;
  seeds are generated relative to "today" at first mount.
- `src/ai.js` — local heuristic assistant (replaces the design's
  `window.claude.complete`, which doesn't exist on a static deploy).
- `src/components/` — pure-presentation: `Chrome.jsx` (frame, header, bottom
  nav, composition root), `Auth.jsx`, `Onboarding.jsx`, `Home.jsx`,
  `Tabs.jsx` (Calendar/Goals/Team/AI), `Sheets.jsx` (all bottom sheets +
  dialogs).

## Conventions & gotchas

- Styles are inline CSS **strings** passed through `sx()`. Interpolate theme
  colors from `v.g` / `v.pt` exactly like the design file does.
- Drag-to-move-day uses document-level pointer events + `data-day`/`data-has`
  attributes on calendar cells (`_setupDrag` in App.jsx). Calendar cell
  buttons must keep those attributes.
- Several CTAs have `animation: ts-bob … infinite` — Playwright needs
  `force=True` clicks on them.
- Persistence: `ts_session` (email) + `ts_data_v1` (plans/market/theme/name,
  keyed to seed year+month — a new month reseeds demo data).
- Onboarding is 3 steps (`onbStep`); finishing with a chosen template opens
  the create-goal sheet pre-seeded. Auth overlay (z-70) sits above
  onboarding (z-60) — users authenticate first.
- Mobbin-informed additions vs the original design: stepped onboarding,
  booked-confirmation dialog, up-next card (calendar), momentum strip
  (goals), market search/filter chips. See `plans/tutorsync-implementation.md`.
- Desktop-vs-mobile branching lives in the components (`v.desktop`), never in
  CSS media queries — inline-style strings can't carry media queries. Tab
  content is split into small shared pieces (e.g. `CalendarGrid`,
  `LegendCard`, `MomentumCard` in `Tabs.jsx`) recomposed per layout.

## Test / verify

```bash
npm run build                       # must pass clean
npx vite preview --port 4173       # then run the smoke script
```

A Playwright smoke script covering auth→onboarding→create→book→confirm→
explore lives in session scratchpad history; re-create from
`plans/tutorsync-implementation.md` § Validation if needed.

## Deploy

Netlify: `netlify deploy --prod` (config in `netlify.toml`, publish `dist/`).
