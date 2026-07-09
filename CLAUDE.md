# TutorSync — agent notes

React SPA (Vite, React 18) with an optional ElysiaJS backend (`server/`).

## Guest mode vs cloud mode (important)

The app runs in one of two modes, decided at startup by `App.initCloud()`:
- **Guest mode** (`this.cloud === false`): no backend. State seeds from and
  persists to localStorage. This is the default and what the public demo used
  before the backend, and what the mobile/desktop e2e suites exercise. Its code
  paths must stay behavior-identical — don't regress them.
- **Cloud mode** (`this.cloud === true`): entered only when `VITE_API_URL` is
  set AND `probe()` (GET /health) succeeds. Real OTP+JWT auth, `/state` load,
  debounced per-plan `PUT /plans/:id` sync (`syncCloud`, diffing against
  `_synced`), real invite links (`doInvite` → `/plans/:id/invite`, consumed by
  `consumeInviteFromUrl` on `?invite=` load), 20s polling (`refreshCloud`).
  If the backend is unreachable, `initCloud` calls `initGuest()` → graceful
  fallback, so the site never hard-breaks.

Every mutation (toggleReaction, addComment, saveSession, saveEditTarget,
savePlanEdit, move…) just mutates `state.plans`; `componentDidUpdate` →
`persist()` routes to localStorage (guest) or `syncCloud()` (cloud). Only the
create/delete/copy/publish/like/invite/auth methods have explicit cloud
branches, because they create/destroy server resources or need a server id.
`src/api.js` is the only place that talks HTTP; `stripMeta()` drops `_role`/
`_shared`/`_rev`/etc. before sending a plan doc.

**Calendar export / sync:** `src/ics.js` (client) mirrors `server/src/ics.js`
(`planToICS`, Bangkok→UTC, status→CONFIRMED/TENTATIVE/CANCELLED) — keep them in
sync. Client `downloadICS` triggers an .ics download (guest + cloud);
`googleEventUrl` builds a per-session Google "create event" link. Live
subscribe (cloud): server adds a `feed_token` per plan (`_feedToken` in /state)
and serves a PUBLIC `GET /calendar/:token.ics` (token IS the auth — calendar
apps can't send headers). The Export/Sync sheet offers download + webcal:// +
Google add-by-URL + copy. Feed uses the current year/month for day-of-month
sessions.

**Auto-schedule:** `src/schedule.js` `autoScheduleSessions(plan, {today, dim})`
spreads each category's target across the month within budget/hours caps,
status 'confirmed'. `copyMarket` fills a copied template (so it's not empty);
`autoFillSchedule` does it for any plan. Calendar-tab buttons sit low — the
fixed bottom nav (z:8) is above the scroll content (z:4), so e2e taps them via
`tapCalendarAction` (scroll pane to bottom first).

**Delete journey:** the plan-edit Delete button opens `DeleteConfirm` (not an
immediate delete). Owner → delete-for-everyone; non-owner member → "leave"
(server DELETE already distinguishes). Copy differs per role via `amOwner`.

**Email OTP (Resend):** `server/src/mail.js` sends the code via Resend when
`RESEND_API_KEY` is set (Bun auto-loads `server/.env`, gitignored + rsync
`--exclude .env` so deploys never wipe it). `/auth/request` returns
`{emailed, demoCode?}` — `demoCode` only when NOT emailed (or `TS_EXPOSE_OTP=1`),
so the demo/e2e flow (which reads the on-screen code) keeps working without a
key. Client keys off `r.emailed && !r.demoCode` → `state.authEmailed` → Auth.jsx
shows "check your email" vs the demo-code box. `TS_MAIL_FAKE=1` pretends to send
(tests) — never set it on the e2e/run-cloud backend or the demo code vanishes.

**Tutor-side confirmation loop (cloud):** sessions carry `status`
(pending/confirmed/declined/reschedule + `proposedDay`); `sessionStatus()`
treats missing status as confirmed (back-compat with seeds). `saveSession`
sets `pending` only when `planHasTutor(plan)` (a non-owner member exists in
`plan._members`, which the server now includes in /state) — else auto-confirms.
Actions (`confirmSession`/`declineSession`/`proposeReschedule`/`acceptProposal`/
`keepOriginal`) mutate the shared plan doc → sync via the normal PUT, so both
sides converge (poll/reload); `notifyPlan(event,sessionId)` → `POST /plans/:id/
notify` pushes a server-templated message to the *other* members. Role gate:
`amOwner(plan)` (via `_role`). Tutor UI = slot-sheet actions + Team-tab
"awaiting your confirmation" inbox; owner UI = pending note + accept/keep a
proposal. Shared plans show a 🔗 badge (`planCards[].shared` from `_shared`).

**Reminders (web push, cloud only):** `public/sw.js` (push + click handlers,
copied to dist by Vite), `src/push.js` (SW register + subscribe via server
VAPID key; lazy — only registers the SW when the user enables). Settings shows
the control when `this.cloud && pushSupported`. Server side: `server/src/
reminders.js` (pure scheduling) + `server/src/push.js` (VAPID, send, 60s tick).
Headless browsers deny the notification permission, so the Enable→subscribe
path can't be exercised in CI — the server delivery pipeline is tested against
real FCM in `server/test/delivery.test.js` instead.

Backend + deployment: `server/README.md`, `DEPLOY.md`. Backend runs on
jarvis-agent under launchd, public via a cloudflared quick-tunnel (URL in
`netlify.toml` → `VITE_API_URL`; ephemeral — see DEPLOY.md).

## Original single-mode notes Thai/English app demo with two
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
npm run build     # must pass clean
npm run e2e       # full journey suite (playwright.config.js)
```

E2e notes:
- The suite self-hosts on **port 4519** (`reuseExistingServer: false`) —
  other dev servers on this machine squat common ports like 4173.
- Run from the project directory; from elsewhere `npx` resolves a cached
  Playwright without the local config.
- Isolated runs: `npx playwright test --project=mobile -g "<name>"` (a bare
  file argument fights the per-project `testMatch`).
- Buttons with the infinite `ts-bob` animation are never "stable" — the
  `tap()` helper force-clicks them. Elements inside sheets are fine with
  plain clicks once the entry animation settles; prefer plain clicks there
  (force-clicking mid `ts-sheetUp`/`ts-pop` uses stale coordinates → flake).

## Category → teammate assignment

Each category has an `ins` key into `people` (data.js). The plan-edit sheet
renders a "ผู้สอน · Taught by" chip row per category (`edCats[].tutors` in
`App.jsx`); picking one sets `editDraft.cats[i].ins`, saved by
`savePlanEdit`. Team roster, presence avatars, calendar legend and slot
details all derive from `categories[].ins`, so assignment propagates without
further wiring. Category rate stays with the category (not the person).

## Deploy

Netlify: `netlify deploy --prod` (config in `netlify.toml`, publish `dist/`).
