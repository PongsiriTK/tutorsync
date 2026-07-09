# TutorSync API (ElysiaJS + Bun + SQLite)

Real backend that turns TutorSync from a local demo into a usable product:
**real accounts, cross-device sync, and genuinely shared plans via invite
links.** Runs on [Bun](https://bun.sh) with [Elysia](https://elysiajs.com) and
`bun:sqlite` (zero external services).

## Run

```bash
bun install
bun run dev      # watch mode on :8791
bun start        # production
bun test         # 8 API tests incl. a real two-account invite→shared-plan flow
```

Env vars (Bun auto-loads `.env`): `PORT` (8791), `TS_DB` (sqlite path),
`TS_JWT_SECRET`. Email OTP via Resend: `RESEND_API_KEY` (when set, codes are
emailed and no longer returned in the response), `TS_MAIL_FROM` (verified
sender). See `.env.example`. Without a key the server returns the code (demo
mode) so nothing locks out. `src/mail.js` handles delivery; tested in
`test/mail.test.js` (mailer + the emailed vs demo-fallback `/auth/request`
paths).

## Data model

Plans are server resources whose content is stored as a JSON `doc` (same shape
the client already uses), with **membership** separate so a plan can be shared
across accounts. `plan_members` + `invites` make invites real: accepting one
adds you as a member of the *same* plan, and either side's edits are visible to
the other (last-write-wins; the client also polls every 20s).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| POST | `/auth/request` | issue OTP (returns `demoCode` unless `TS_HIDE_OTP=1`) |
| POST | `/auth/verify` | verify OTP → JWT + seeds a new account |
| GET | `/me`, PUT `/me` | profile (name, theme, onboarded) |
| GET | `/state` | all plans you can see (owned + shared) + market |
| POST | `/plans` · PUT `/plans/:id` · DELETE `/plans/:id` | create / sync / delete-or-leave |
| POST | `/plans/:id/invite` | mint a real invite token |
| POST | `/invites/:token/accept` | join the shared plan |
| GET | `/market` · POST `/market/:id/like` · `/market/:id/copy` · `/market/publish` | community templates |
| GET | `/push/key` | VAPID public key |
| POST | `/push/subscribe` · `/push/unsubscribe` | manage a browser push subscription |
| POST | `/push/test` | send an immediate reminder about your next session |
| GET | `/calendar/:token.ics` | **public** iCalendar feed for a plan (token = auth) |

All non-auth routes require `Authorization: Bearer <jwt>`.

## Reminders (web push)

`src/reminders.js` is pure scheduling logic (resolve each session to its next
occurrence; fire a reminder ~a day ahead and shortly before). `src/push.js`
holds VAPID keys (env or persisted `data/vapid.json`), stores subscriptions,
sends via `web-push` (pruning gone endpoints on 404/410), and runs a 60s
`startScheduler` tick. Tested in `test/reminders.test.js` (windows + dedupe)
and `test/delivery.test.js` (real encrypt→HTTPS-POST→prune against FCM).

## Deploy (jarvis-agent)

Runs under launchd on the Mac mini and is exposed publicly via a cloudflared
quick-tunnel. See `../DEPLOY.md` for the exact commands (install Bun, rsync,
LaunchAgents for API + tunnel, capture the public URL).
