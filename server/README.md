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

Env vars: `PORT` (8791), `TS_DB` (sqlite path), `TS_JWT_SECRET`, `TS_HIDE_OTP=1`
(stop returning the OTP in responses once a mailer is wired).

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

All non-auth routes require `Authorization: Bearer <jwt>`.

## Deploy (jarvis-agent)

Runs under launchd on the Mac mini and is exposed publicly via a cloudflared
quick-tunnel. See `../DEPLOY.md` for the exact commands (install Bun, rsync,
LaunchAgents for API + tunnel, capture the public URL).
