# TutorSync 🗓️

**หลายเป้าหมาย หลายปฏิทิน ในที่เดียว · Every goal gets its own calendar.**

TutorSync is a Thai/English mobile-first planning app for tutoring, training and
deadline goals. Each goal gets its own shared calendar with a budget, hours,
deadline or session target — plus a community template market and a built-in
planning assistant.

Built from a [Claude Design](https://claude.ai/design) project
(`TutorSync.dc.html`, kept in `design/`) and implemented as a static React SPA
with an optional **ElysiaJS + SQLite backend** (`server/`) for real accounts,
cross-device sync, and genuinely shared plans.
User journeys were refined against real-app patterns researched on
[Mobbin](https://mobbin.com) (Liven/ABY onboarding, Peloton booking
confirmation, Airbnb "up next", adidas/Atoms momentum streaks, Airtable/Craft
template galleries).

## Features

- 🔐 **Passwordless auth** — email + 6-digit OTP. In cloud mode with a Resend
  key configured, the code is **emailed**; otherwise it's shown in-app (demo)
- 👋 **Stepped onboarding** — intro → name capture → pick your first goal
- 🎯 **Type-adaptive goals** — budget (฿), hours, deadline, or session-count
  targets with adaptive dashboards
- 🗓️ **Per-goal calendars** — colored category dots, tap a day for sessions,
  **drag a day onto another to move sessions** (with confirm)
- ⏰ **Up-next card** and 7-day **momentum streak strip**
- ✏️ **Booking sheet** with live budget/hours impact preview + success
  confirmation
- 📝 **Day context** — every calendar day can hold a **description, a
  checklist, and links**; days with context are marked on the grid. It syncs,
  travels with copied/published templates, and shows up in exported/subscribed
  calendars (per-day event notes)
- 🖨️ **Thai ตารางเรียน PDF** — export a printable, Thai-styled class timetable:
  a weekly day×time grid per page (multi-page), color-coded subjects, a legend,
  Buddhist-year month, and per-day notes. Opens ready to Print / Save as PDF
- 📅 **Export & sync to your calendar** — download an `.ics` (Apple / Google /
  Outlook), **subscribe to a live feed** that auto-updates (cloud), and per
  session "Add to Google Calendar" links
- ✨ **Auto-scheduling** — copying a template drafts a starter schedule onto the
  calendar (no more empty skeleton); an "Auto-fill" action does the same for any
  plan, spreading sessions across the month within your budget/hours
- 🛍️ **Explore market** — search & filter community templates, preview, copy
  (auto-scheduled) to your plans, publish your own
- 🗑️ **Safe delete** — deleting a plan asks to confirm; on a shared plan a
  non-owner "leaves" instead of deleting it for everyone
- 🎉 **Goal-completion celebration** — booking the session that reaches a
  category's target (or completes the whole plan) fires a confetti moment with
  the achievement, stat cards, and **share**: a native share sheet (LINE / IG /
  etc.) with a clipboard fallback, plus a screenshot-ready **achievement card**
- 🔔 **Activity / Notifications inbox** — a header bell (with unread badge)
  opening a unified feed: **Requests** (pending confirmations, with inline
  Confirm) and **Updates** (bookings, confirmations, reactions, comments,
  reschedules, joins). Server-backed across shared plans in cloud; a local
  feed in guest. Consolidates events that were only fleeting toasts before
- 🤝 **Team view** — instructors, rates, presence, invite link; **assign any
  category to a teammate** ("Taught by" picker in plan settings — e.g. hand
  English to Ms. Lisa and she joins the team, legend and session details)
- ✨ **AI planning assistant ("น้องซิงก์")** — in cloud mode, a real LLM agent
  (**GLM 5.2 via MaxPlus AI**) with a professional system prompt, **skills**, and
  **tool-calling**: it reads your real plan data (budget, lagging categories,
  free days) through tools so answers stay grounded, and can **propose** actions
  you confirm — open a plan, or pre-fill the booking sheet (it never books
  silently). The API key stays server-side behind an authenticated proxy
  (`POST /ai/chat`). Guest/offline (or if the key is unset) falls back to a local
  heuristic, so the assistant always answers.
- ☁️ **Cloud mode** (optional backend) — real passwordless accounts (OTP+JWT),
  cross-device sync, and **real invite links**: share a plan and another
  account joins the *same* plan, seeing your sessions and edits. Falls back to
  local **guest mode** automatically when no backend is reachable, so the demo
  always works.
- 🔔 **Session reminders (web push)** — opt in from Settings and the server
  notifies you before an upcoming session **even when the app is closed**
  (a day ahead + shortly before). Includes a "send a test reminder" button.
  Cloud mode + a browser where you grant notification permission.
- ✅ **Tutor-side confirmation** (two-sided) — once you invite a tutor to a
  plan, booking a session sends them a **request**; they Confirm, Decline, or
  **Propose a new time**, and you're notified of their response (accept a
  proposal to move the session). Sessions carry a pending/confirmed status;
  solo plans auto-confirm. Shared plans are badged 🔗.
- 🎨 4 pastel accent themes · Thai-first bilingual UI · localStorage
  persistence (guest) / server persistence (cloud)
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
guest-mode journey: auth (validation/OTP/resend), stepped onboarding, goal
creation, calendar + booking, slot reactions/comments/reschedule,
drag-to-move days, goals + edit target, plan settings incl.
category→teammate assignment, market search/copy/publish, AI assistant,
settings, and persistence.

**Cloud-mode e2e** (real backend, two accounts collaborating):

```bash
bash e2e/run-cloud.sh   # boots a local API, builds cloud frontend, runs cloud specs
```

## Cloud backend

The `server/` directory is an ElysiaJS + Bun + SQLite API (see
`server/README.md`). To run the app in cloud mode locally:

```bash
cd server && bun install && bun start          # API on :8791
# in another shell, from repo root:
VITE_API_URL=http://localhost:8791 npm run dev
```

Deployment (Netlify + jarvis-agent) is documented in `DEPLOY.md`.

Deploys anywhere static; `netlify.toml` is included for Netlify
(`netlify deploy --prod`).

## Layout

```
design/           original Claude Design export (reference, not shipped)
server/           ElysiaJS + SQLite backend (cloud mode)
e2e/              Playwright journey tests (mobile, desktop, cloud specs)
plans/            implementation plan (markdown)
DEPLOY.md         Netlify + jarvis-agent deployment guide
src/
  App.jsx         state + logic + computed view values (ported from design)
  api.js          cloud API client + guest/cloud mode switch
  data.js         themes, people, seed plans, seed market
  ai.js           local planning-assistant replies
  util.js         css-string → React style-object helper
  components/     Chrome (frame/header/nav), Auth, Onboarding, Home, Tabs, Sheets
```

**Guest mode** is fully client-side (localStorage); presence and the "live"
reaction are simulated, matching the original design. **Cloud mode** (when a
reachable `VITE_API_URL` is set) swaps in real accounts, server persistence,
and real shared-plan invites. The AI assistant is a local heuristic in both
modes (no external LLM).
