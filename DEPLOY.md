# Deploying TutorSync

Frontend → **Netlify** (static). Backend → **jarvis-agent** (Mac mini M4,
`~/.ssh/config` alias `jarvis-agent`, reachable over Tailscale), run under
launchd and exposed publicly with a cloudflared quick-tunnel.

## Architecture

```
Netlify (public static site)  ──HTTPS──►  cloudflared quick-tunnel
                                              │  https://<random>.trycloudflare.com
                                              ▼
                                   jarvis-agent :8791  (Bun + Elysia + SQLite)
```

The frontend health-probes `VITE_API_URL` at startup. Reachable → **cloud mode**
(real accounts/sync/invites). Unreachable → **guest mode** (fully local
demo). So the public site never hard-breaks if the home server is down.

## Backend on jarvis-agent

Bun is installed at `/Users/jarvis/.bun/bin/bun`; cloudflared at
`/Users/jarvis/bin/cloudflared`. Two LaunchAgents keep things up across reboots:
`~/Library/LaunchAgents/ai.tutorsync.api.plist` (API, `KeepAlive`) and
`ai.tutorsync.tunnel.plist` (tunnel).

Deploy an update (note `--exclude .env` — never let the deploy wipe the key):

```bash
# from repo root
rsync -az --delete --exclude node_modules --exclude data --exclude .env \
  --exclude '*.log' --exclude 'bun.lock*' server/ jarvis-agent:~/tutorsync-server/
ssh jarvis-agent 'cd ~/tutorsync-server && ~/.bun/bin/bun install && \
  launchctl kickstart -k gui/$(id -u)/ai.tutorsync.api'
ssh jarvis-agent 'curl -s localhost:8791/health'
```

## Email OTP (Resend)

Codes are emailed when `RESEND_API_KEY` is set; otherwise the server returns the
code in the response (demo mode) so nothing locks out. Bun auto-loads
`~/tutorsync-server/.env`. To turn on real email:

```bash
# on jarvis — paste your key into a gitignored, deploy-safe .env (never in chat)
ssh jarvis-agent 'cat >> ~/tutorsync-server/.env <<EOF
RESEND_API_KEY=re_your_key_here
# to email anyone, verify a domain in Resend and set the sender:
# TS_MAIL_FROM=TutorSync 🗓️ <noreply@yourdomain.com>
EOF
launchctl kickstart -k gui/$(id -u)/ai.tutorsync.api'
```

Sender caveat: the default `onboarding@resend.dev` only delivers to the Resend
account owner's own address. To email arbitrary users, verify a domain in
Resend and set `TS_MAIL_FROM`. After adding the key, redeploy the Netlify
frontend once (it drops the on-screen "demo code" box automatically since the
server stops returning the code).

Get the current public tunnel URL:

```bash
ssh jarvis-agent "grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
  ~/tutorsync-server/tunnel.log | head -1"
```

## Frontend on Netlify

The API URL lives in `netlify.toml` (`[build.environment] VITE_API_URL`). Build
and deploy:

```bash
VITE_API_URL="<tunnel-url>" npm run build
netlify deploy --prod --dir dist --site <site-id>
```

## ⚠️ The tunnel URL is ephemeral

A cloudflared *quick* tunnel gets a new random hostname each time it restarts
(e.g. jarvis reboots). When that happens the public site degrades to guest mode
until you update `VITE_API_URL` in `netlify.toml` and redeploy. For a permanent
URL, switch to one of:

- **Named Cloudflare tunnel** with a hostname on a domain you own (not
  `fragmentx.ai`, which is reserved for personal infra) — stable, needs
  Cloudflare account + DNS.
- **Tailscale Funnel** — `tailscale funnel 8791` gives a stable `*.ts.net`
  HTTPS hostname; requires enabling Funnel in the tailnet policy.

## Reminders / VAPID

Web-push reminders are on. The server keeps VAPID keys in
`~/tutorsync-server/data/vapid.json` (auto-generated on first run, persisted so
subscriptions stay valid across restarts) — **don't delete it** or existing
subscriptions break. To rotate, remove the file and have users re-enable. A
60-second scheduler sends reminders; delivery goes straight from jarvis to the
push services (FCM/Apple/Mozilla) over HTTPS — no extra egress config needed.

## Not yet real (honest status)

Cloud mode + reminders + the tutor-side confirmation loop + email OTP close most
of the MVP gaps (accounts, cross-device persistence, genuinely shared
invite-based plans, notifications even when closed, a two-sided book→confirm
flow, and emailed sign-in codes when a Resend key is set). Still outstanding
from the critique: **live sockets** instead of 20s polling for collaboration,
and a **stable public hostname** (the tunnel URL is ephemeral). Reminder
delivery to a live browser can't be verified in headless CI (headless denies
the notification permission); the server delivery pipeline is tested against
real FCM.
