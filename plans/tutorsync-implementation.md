# TutorSync — implement design as production React SPA, improve flows, deploy to Netlify

Build TutorSync — a Thai/English multi-goal planning app for tutoring & training
(shared calendars, budgets, community templates, AI helper) — from the Claude
Design project file `design/TutorSync.dc.html` into a production static React
SPA, improve its user journeys with patterns researched on Mobbin, publish to
GitHub, and deploy to Netlify.

## Context

- **Design source**: claude.ai/design project `52f0b6d5-cef4-41a3-b591-39d3cde2b1f1`,
  file `TutorSync.dc.html` (saved at `design/TutorSync.dc.html`). It is a
  390×844 mobile design: `<x-dc>` HTML template + a React-class-style
  `Component extends DCLogic` script with all state/logic.
- **Screens**: passwordless OTP auth → onboarding → Home (Mine/Explore tabs) →
  per-plan view with bottom nav (Calendar / Goals / Team / AI), plus sheets:
  day detail, slot detail (reactions/comments), add-session, create-goal,
  market detail, plan edit, edit target, publish confirm, settings.
- **Aesthetic**: Thai pastel — fonts *Baloo Thai 2* + *Nunito*; theme palettes
  coral/lilac/mint/sky; 20–34px radii; soft pink shadows `rgba(180,120,150,…)`;
  emoji-forward; bilingual Thai-primary copy. Keep faithful.
- **Design quirks to preserve**: drag a calendar day to move sessions (with
  confirm dialog), demo OTP code shown in UI, presence avatars, simulated live
  reaction toast, type-adaptive goal cards (budget/hours/window/sessions).
- **Must replace**: `window.claude.complete` (AI chat) — not available on
  Netlify. Replace with a local heuristic assistant computing real answers
  from plan data (budget left, lagging categories, session suggestions).

## Mobbin research → journey improvements

1. **Stepped onboarding with goal personalization** (Liven
   `mobbin.com/flows/ba9958ef-…`, ABY Journal `93f83efc-…`): replace the single
   static intro with 3 steps + progress dots: value intro → "What should we
   call you?" name capture → "Pick your first goal" template chips that
   pre-seed the create-goal sheet. Skippable.
2. **Post-booking confirmation** (Peloton `d7105a25-…`): after "Book session",
   show a success sheet (session summary + View day / Done actions) instead of
   toast-only feedback.
3. **"Up next" card** (Airbnb Trips `8cbcaf23-…`): show the next upcoming
   session atop the Calendar tab so the tab is instantly actionable.
4. **Weekly momentum strip** (adidas Running/Atoms/Google Fit screens): 7-day
   dots + streak count on the Goals tab.
5. **Template gallery search + category filters** (Airtable/Craft template
   pickers): search field + Study/Fitness/Skills chips on the Explore tab.
6. **Cost reassurance in booking** (GetYourGuide): explicit total + budget
   impact before the CTA (design partially had this; keep and label clearly).

## Phases

### Phase 1 — Scaffold (done when `npm run dev` serves a blank app)
- [x] `npm create vite` React project, `netlify.toml`, `.gitignore`
- [x] Fonts preconnect + Google Fonts link, base CSS (keyframes from design)
- [x] Phone-frame shell: 390×844 rounded frame centered on desktop,
      full-bleed scaling on ≤430px viewports

### Phase 2 — Core port (done when all design screens render with seed data)
- [x] `src/data.js`: themes, people, goalTypeMeta, seedPlans, seedMarket
- [x] `src/App.jsx`: class component port of DCLogic state + methods
- [x] Screens: Auth (email→OTP), Onboarding, Home (Mine/Explore), Calendar,
      Goals, Team, AI; header + bottom nav + FAB
- [x] Sheets: day, slot, add, create, market, plan-edit, edit-target,
      publish, settings; toast; move-confirm; reschedule
- [x] Drag-day-to-move on calendar (pointer events)
- [x] Local AI assistant replies (no external API)

### Phase 3 — Flow improvements (done when all 6 Mobbin items above work)
- [x] Stepped onboarding (3 steps, dots, name capture, first-goal chips)
- [x] Booking success sheet
- [x] Up-next card on Calendar
- [x] Momentum strip on Goals
- [x] Explore search + filter chips
- [x] localStorage persistence (session, name, theme, plans)

### Phase 4 — Ship
- [x] `npm run build` clean; smoke-test with local server & browser
- [x] README.md + CLAUDE.md
- [x] GitHub repo (gh CLI), initial commit, push
- [x] `netlify deploy --prod`, verify live URL

### Phase 5 — Desktop viewport (added 2026-07-08)
- [x] `state.desktop` flag (≥1024px, resize-aware) threaded through `v`
- [x] `DesktopShell` + `Sidebar` + `DesktopHeader` in `Chrome.jsx`; phone
      frame kept for narrower windows
- [x] `SheetShell` wrapper: bottom sheets → centered modals on desktop
- [x] Layout recomposition: home/market card grids, calendar + legend rail,
      goals 2-col grid, team grid, AI dock as in-flow bottom bar
- [x] Desktop Playwright smoke suite (17 checks) + mobile regression rerun

### Phase 6 — Category→teammate assignment + repo e2e suite (added 2026-07-08)
- [x] "ผู้สอน · Taught by" tutor-chip picker per category in the plan-edit
      sheet; `ins` carried through `editDraft` → `savePlanEdit`; flows into
      team roster, presence, calendar legend, slot details
- [x] `beforeunload` flush for the debounced localStorage save (reloading
      immediately after a change used to lose it)
- [x] Permanent e2e suite: `@playwright/test`, `playwright.config.js`
      (self-hosted on port 4519), `e2e/mobile.spec.js` (15 journey tests) +
      `e2e/desktop.spec.js` (5), `npm run e2e` — 20/20 green twice in a row

### Phase 7 — Cloud backend + real accounts/sync/invites (added 2026-07-08)
Addresses the honest-critique gaps (accounts, cross-device persistence, real
shared collaboration was previously simulated).
- [x] `server/` ElysiaJS + Bun + `bun:sqlite`: OTP+JWT auth, plans as server
      resources with membership, real invite links (accept → shared plan),
      market publish/copy, `/health`. 8 API tests incl. two-account
      invite→shared-plan collaboration.
- [x] Frontend cloud mode (`src/api.js`, `App.initCloud/loadCloudState/
      syncCloud/consumeInviteFromUrl`) with startup health-probe and automatic
      guest fallback; server-tracked `onboarded` flag; 20s poll for collaborators.
- [x] Deploy on jarvis-agent: Bun installed, API under launchd (`KeepAlive`),
      cloudflared quick-tunnel under launchd for public HTTPS. `DEPLOY.md`.
- [x] `e2e/cloud.spec.js` + `e2e/run-cloud.sh`: real-account reload persistence
      and two-account invite→shared-plan, run against the live jarvis backend —
      2/2 green. Guest suite still 20/20 (cloud specs skip without API).
- [x] Netlify redeployed in cloud mode (`netlify.toml` VITE_API_URL); verified a
      real signup on the public site creates an account on jarvis.
- [ ] Still outstanding (next): reminders/notifications, tutor-side confirm,
      real email OTP delivery, live sockets instead of polling.

## Validation

- `npm run build` exits 0; no console errors on load
- Manual: auth with any email + shown code → onboarding steps → create plan
  from onboarding template → book session → success sheet → day sheet shows
  session → goals reflect cost/hours → publish → appears in Explore → copy
- Drag day 18 → 22 on calendar shows confirm dialog and moves sessions

## Out of scope

- Real backend/auth/email delivery (demo OTP stays client-side)
- Real-time multiplayer (presence is simulated, as in the design)
- Real LLM calls for the assistant (local heuristic instead)
- i18n framework (copy stays bilingual Thai/English inline, per design)
