# TutorSync 🗓️

**หลายเป้าหมาย หลายปฏิทิน ในที่เดียว · Every goal gets its own calendar.**

TutorSync is a Thai/English mobile-first planning app for tutoring, training and
deadline goals. Each goal gets its own shared calendar with a budget, hours,
deadline or session target — plus a community template market and a built-in
planning assistant.

Built from a [Claude Design](https://claude.ai/design) project
(`TutorSync.dc.html`, kept in `design/`) and implemented as a static React SPA.
User journeys were refined against real-app patterns researched on
[Mobbin](https://mobbin.com) (Liven/ABY onboarding, Peloton booking
confirmation, Airbnb "up next", adidas/Atoms momentum streaks, Airtable/Craft
template galleries).

## Features

- 🔐 **Passwordless demo auth** — email + 6-digit OTP (demo code shown in-app)
- 👋 **Stepped onboarding** — intro → name capture → pick your first goal
- 🎯 **Type-adaptive goals** — budget (฿), hours, deadline, or session-count
  targets with adaptive dashboards
- 🗓️ **Per-goal calendars** — colored category dots, tap a day for sessions,
  **drag a day onto another to move sessions** (with confirm)
- ⏰ **Up-next card** and 7-day **momentum streak strip**
- ✏️ **Booking sheet** with live budget/hours impact preview + success
  confirmation
- 🛍️ **Explore market** — search & filter community templates, preview, copy
  to your plans, publish your own
- 🤝 **Team view** — instructors, rates, presence, invite link; **assign any
  category to a teammate** ("Taught by" picker in plan settings — e.g. hand
  English to Ms. Lisa and she joins the team, legend and session details)
- ✨ **AI planning assistant** — local heuristic assistant that answers from
  your real plan data (budget left, lagging categories, session suggestions)
- 🎨 4 pastel accent themes · Thai-first bilingual UI · localStorage
  persistence
- 🖥️ **Responsive desktop viewport** (≥1024px) — sidebar navigation,
  multi-column dashboards, calendar with a legend rail, and bottom sheets
  that become centered modals; narrower windows get the mobile phone frame

## Run it

```bash
npm install
npm run dev        # dev server
npm run build      # production build → dist/
npm run preview    # serve the production build
npm run e2e        # Playwright journey suite (mobile + desktop projects)
```

First e2e run needs the browser once: `npx playwright install chromium`.
The suite builds and serves the app itself on port 4519 and covers every
journey: auth (validation/OTP/resend), stepped onboarding, goal creation,
calendar + booking, slot reactions/comments/reschedule, drag-to-move days,
goals + edit target, plan settings incl. category→teammate assignment,
market search/copy/publish, AI assistant, settings, and persistence.

Deploys anywhere static; `netlify.toml` is included for Netlify
(`netlify deploy --prod`).

## Layout

```
design/           original Claude Design export (reference, not shipped)
e2e/              Playwright journey tests (mobile.spec.js, desktop.spec.js)
plans/            implementation plan (markdown)
src/
  App.jsx         state + logic + computed view values (ported from design)
  data.js         themes, people, seed plans, seed market
  ai.js           local planning-assistant replies
  util.js         css-string → React style-object helper
  components/     Chrome (frame/header/nav), Auth, Onboarding, Home, Tabs, Sheets
```

Everything is client-side demo data — no backend. Auth, presence and the
"live" reaction are simulated, matching the original design's behavior.
