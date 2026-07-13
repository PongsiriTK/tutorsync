import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { db, now } from './db.js'
import { token, otpCode, planId, marketId } from './id.js'
import { seedPlansFor, seedMarket } from './seed.js'
import { vapidPublicKey, saveSubscription, removeSubscription, sendToUser, startScheduler } from './push.js'
import { reminderPayload, nextOccurrence } from './reminders.js'
import { mailConfigured, sendOtpEmail } from './mail.js'
import { planToICS } from './ics.js'
import { runAgent, aiConfigured } from './ai/agent.js'

const PORT = Number(process.env.PORT || 8791)
const JWT_SECRET = process.env.TS_JWT_SECRET || 'tutorsync-dev-secret-change-me'
// When no email provider is configured, the OTP is returned in the response so
// the passwordless flow is fully usable without SMTP. Set TS_HIDE_OTP=1 (and
// wire a mailer) to make it production-real.
const EXPOSE_OTP = process.env.TS_HIDE_OTP !== '1'
const OTP_TTL = 10 * 60 * 1000
const INVITE_TTL = 14 * 24 * 60 * 60 * 1000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------- data helpers ----------
const parsePlan = (row) => ({ ...JSON.parse(row.doc), id: row.id, _owner: row.owner, _rev: row.rev, _updatedAt: row.updated_at })

function ensureUser(email, name = '') {
  const u = db.query('SELECT * FROM users WHERE email = ?').get(email)
  if (u) return u
  db.query('INSERT INTO users (email, name, theme, created_at) VALUES (?, ?, ?, ?)').run(email, name, 'coral', now())
  // seed starter plans + market for a brand-new account
  const insPlan = db.query('INSERT INTO plans (id, owner, doc, updated_at, rev) VALUES (?, ?, ?, ?, 1)')
  const insMember = db.query('INSERT INTO plan_members (plan_id, email, role, joined_at) VALUES (?, ?, ?, ?)')
  for (const p of seedPlansFor(name)) {
    insPlan.run(p.id, email, JSON.stringify(p), now())
    insMember.run(p.id, email, 'owner', now())
  }
  if (!db.query('SELECT COUNT(*) c FROM market').get().c) {
    const insMk = db.query('INSERT INTO market (id, doc, author, likes, uses, published_by, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)')
    for (const m of seedMarket()) insMk.run(m.id, JSON.stringify(m), m.author, m.likes, m.uses, now())
  }
  return db.query('SELECT * FROM users WHERE email = ?').get(email)
}

function membersOf(planId) {
  return db.query('SELECT email, role FROM plan_members WHERE plan_id = ? ORDER BY joined_at').all(planId)
}

// unguessable per-plan token for the public .ics subscription feed
function ensureFeedToken(planId) {
  const row = db.query('SELECT feed_token FROM plans WHERE id = ?').get(planId)
  if (row && row.feed_token) return row.feed_token
  const tk = 'f_' + token(12)
  db.query('UPDATE plans SET feed_token = ? WHERE id = ?').run(tk, planId)
  return tk
}

function plansForUser(email) {
  const rows = db.query(`
    SELECT p.*, m.role AS my_role, m.joined_at AS joined_at FROM plans p
    JOIN plan_members m ON m.plan_id = p.id
    WHERE m.email = ? ORDER BY m.joined_at, p.updated_at
  `).all(email)
  return rows.map((r) => ({ ...parsePlan(r), _role: r.my_role, _shared: r.owner !== email, _members: membersOf(r.id), _feedToken: ensureFeedToken(r.id) }))
}

function marketList() {
  return db.query('SELECT * FROM market ORDER BY created_at DESC').all()
    .map((r) => ({ ...JSON.parse(r.doc), id: r.id, likes: r.likes, uses: r.uses, author: r.author }))
}

const isMember = (planId, email) => !!db.query('SELECT 1 FROM plan_members WHERE plan_id = ? AND email = ?').get(planId, email)
const isOwner = (planId, email) => !!db.query('SELECT 1 FROM plans WHERE id = ? AND owner = ?').get(planId, email)

// ---------- app ----------
export const app = new Elysia()
  .use(cors({ origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))
  .use(jwt({ name: 'jwt', secret: JWT_SECRET, exp: '30d' }))
  .get('/health', () => ({ ok: true, service: 'tutorsync', time: now() }))

  // Public .ics subscription feed (the token is the secret — calendar apps
  // can't send auth headers). Apple/Google "add calendar by URL" hit this.
  .get('/calendar/:token', ({ params, set }) => {
    const tk = String(params.token).replace(/\.ics$/i, '')
    const row = db.query('SELECT * FROM plans WHERE feed_token = ?').get(tk)
    if (!row) { set.status = 404; return 'not found' }
    let doc; try { doc = JSON.parse(row.doc) } catch { doc = { sessions: [] } }
    const d = new Date(now())
    const ics = planToICS({ ...doc, id: row.id }, d.getFullYear(), d.getMonth(), now())
    set.headers['content-type'] = 'text/calendar; charset=utf-8'
    set.headers['content-disposition'] = `inline; filename="tutorsync-${row.id}.ics"`
    set.headers['cache-control'] = 'no-cache'
    return ics
  })

  // ----- auth: passwordless OTP -----
  .post('/auth/request', async ({ body, set }) => {
    const email = String(body.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) { set.status = 400; return { error: 'invalid_email' } }
    const code = otpCode()
    db.query('DELETE FROM otps WHERE email = ?').run(email)
    db.query('INSERT INTO otps (email, code, expires_at, attempts) VALUES (?, ?, ?, 0)').run(email, code, now() + OTP_TTL)
    // Email the code when a provider is configured; otherwise (or if sending
    // fails) fall back to returning it so the demo/dev flow never locks out.
    const emailed = mailConfigured() ? await sendOtpEmail(email, code) : false
    const expose = EXPOSE_OTP && (!emailed || process.env.TS_EXPOSE_OTP === '1')
    return { sent: true, emailed, ...(expose ? { demoCode: code } : {}) }
  }, { body: t.Object({ email: t.String() }) })

  .post('/auth/verify', async ({ body, jwt, set }) => {
    const email = String(body.email || '').trim().toLowerCase()
    const code = String(body.code || '').trim()
    const row = db.query('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC').get(email)
    if (!row) { set.status = 400; return { error: 'no_code' } }
    if (row.attempts >= 5) { set.status = 429; db.query('DELETE FROM otps WHERE email = ?').run(email); return { error: 'too_many_attempts' } }
    if (now() > row.expires_at) { set.status = 400; db.query('DELETE FROM otps WHERE email = ?').run(email); return { error: 'expired' } }
    if (code !== row.code) { db.query('UPDATE otps SET attempts = attempts + 1 WHERE email = ?').run(email); set.status = 400; return { error: 'incorrect' } }
    db.query('DELETE FROM otps WHERE email = ?').run(email)
    const user = ensureUser(email)
    const jwtToken = await jwt.sign({ email })
    return { token: jwtToken, user: { email: user.email, name: user.name, theme: user.theme, onboarded: user.onboarded } }
  }, { body: t.Object({ email: t.String(), code: t.String() }) })

  // ----- authenticated group -----
  .guard({}, (app) => app
    .resolve(async ({ jwt, headers, set }) => {
      const auth = headers.authorization || ''
      const raw = auth.startsWith('Bearer ') ? auth.slice(7) : auth
      const payload = raw ? await jwt.verify(raw) : false
      if (!payload || !payload.email) { set.status = 401; return { email: null } }
      return { email: String(payload.email) }
    })
    .onBeforeHandle(({ email, set }) => { if (!email) { set.status = 401; return { error: 'unauthorized' } } })

    .get('/me', ({ email }) => {
      const u = db.query('SELECT email, name, theme, onboarded FROM users WHERE email = ?').get(email)
      return { user: u }
    })

    .put('/me', ({ email, body }) => {
      if (body.name != null) db.query('UPDATE users SET name = ? WHERE email = ?').run(String(body.name), email)
      if (body.theme != null) db.query('UPDATE users SET theme = ? WHERE email = ?').run(String(body.theme), email)
      if (body.onboarded != null) db.query('UPDATE users SET onboarded = ? WHERE email = ?').run(body.onboarded ? 1 : 0, email)
      const u = db.query('SELECT email, name, theme, onboarded FROM users WHERE email = ?').get(email)
      return { user: u }
    }, { body: t.Object({ name: t.Optional(t.String()), theme: t.Optional(t.String()), onboarded: t.Optional(t.Boolean()) }) })

    // full state: all plans this user can see (owned + shared) + market
    .get('/state', ({ email }) => {
      const u = db.query('SELECT email, name, theme, onboarded FROM users WHERE email = ?').get(email)
      return { user: u, plans: plansForUser(email), market: marketList() }
    })

    .post('/plans', ({ email, body }) => {
      const doc = body.plan || {}
      const id = doc.id && String(doc.id).startsWith('p_') ? doc.id : planId()
      const stored = { ...doc, id }
      db.query('INSERT INTO plans (id, owner, doc, updated_at, rev) VALUES (?, ?, ?, ?, 1)').run(id, email, JSON.stringify(stored), now())
      db.query('INSERT INTO plan_members (plan_id, email, role, joined_at) VALUES (?, ?, ?, ?)').run(id, email, 'owner', now())
      return { plan: { ...stored, _role: 'owner', _shared: false, _rev: 1, _members: membersOf(id), _feedToken: ensureFeedToken(id) } }
    }, { body: t.Object({ plan: t.Any() }) })

    // save a plan doc (owner or member). last-write-wins; bumps rev.
    .put('/plans/:id', ({ email, params, body, set }) => {
      const id = params.id
      if (!isMember(id, email)) { set.status = 403; return { error: 'not_a_member' } }
      const stored = { ...body.plan, id }
      const row = db.query('UPDATE plans SET doc = ?, updated_at = ?, rev = rev + 1 WHERE id = ? RETURNING rev, updated_at')
        .get(JSON.stringify(stored), now(), id)
      return { ok: true, id, rev: row.rev, updatedAt: row.updated_at }
    }, { body: t.Object({ plan: t.Any() }) })

    .delete('/plans/:id', ({ email, params, set }) => {
      const id = params.id
      if (isOwner(id, email)) { db.query('DELETE FROM plans WHERE id = ?').run(id); return { ok: true, deleted: true } }
      if (isMember(id, email)) { db.query('DELETE FROM plan_members WHERE plan_id = ? AND email = ?').run(id, email); return { ok: true, left: true } }
      set.status = 403; return { error: 'not_a_member' }
    })

    // ----- real invites -----
    .post('/plans/:id/invite', ({ email, params, set }) => {
      const id = params.id
      if (!isMember(id, email)) { set.status = 403; return { error: 'not_a_member' } }
      const tk = token()
      db.query('INSERT INTO invites (token, plan_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
        .run(tk, id, email, now(), now() + INVITE_TTL)
      return { token: tk }
    })

    .post('/invites/:token/accept', ({ email, params, set }) => {
      const inv = db.query('SELECT * FROM invites WHERE token = ?').get(params.token)
      if (!inv) { set.status = 404; return { error: 'invalid_invite' } }
      if (now() > inv.expires_at) { set.status = 410; return { error: 'expired_invite' } }
      const plan = db.query('SELECT * FROM plans WHERE id = ?').get(inv.plan_id)
      if (!plan) { set.status = 404; return { error: 'plan_gone' } }
      if (!isMember(inv.plan_id, email)) {
        db.query('INSERT INTO plan_members (plan_id, email, role, joined_at) VALUES (?, ?, ?, ?)')
          .run(inv.plan_id, email, 'member', now())
        const u = db.query('SELECT name FROM users WHERE email = ?').get(email)
        db.query('INSERT INTO activity (plan_id, actor, type, session_id, label, created_at) VALUES (?, ?, ?, NULL, ?, ?)')
          .run(inv.plan_id, email, 'joined', (u && u.name) || email.split('@')[0], now())
      }
      return { plan: { ...parsePlan(plan), _role: plan.owner === email ? 'owner' : 'member', _shared: plan.owner !== email, _members: membersOf(plan.id), _feedToken: ensureFeedToken(plan.id) } }
    })

    // ----- market -----
    .get('/market', () => ({ market: marketList() }))

    .post('/market/:id/like', ({ params }) => {
      const r = db.query('UPDATE market SET likes = likes + 1 WHERE id = ? RETURNING likes').get(params.id)
      return { likes: r ? r.likes : 0 }
    })

    .post('/market/:id/copy', ({ email, params, set }) => {
      const m = db.query('SELECT * FROM market WHERE id = ?').get(params.id)
      if (!m) { set.status = 404; return { error: 'not_found' } }
      const item = JSON.parse(m.doc)
      const id = planId()
      const plan = { id, name: item.name, en: item.en, emoji: item.emoji, theme: item.theme, kind: item.kind, goalType: item.goalType,
        budgetTotal: item.budgetTotal, hoursGoal: item.hoursGoal, deadlineDays: item.deadlineDays, elapsedDays: 0,
        deadlineLabel: 'อีก ' + item.deadlineDays + ' วัน', categories: item.categories, sessions: [], dayNotes: item.dayNotes || {} }
      db.query('INSERT INTO plans (id, owner, doc, updated_at, rev) VALUES (?, ?, ?, ?, 1)').run(id, email, JSON.stringify(plan), now())
      db.query('INSERT INTO plan_members (plan_id, email, role, joined_at) VALUES (?, ?, ?, ?)').run(id, email, 'owner', now())
      db.query('UPDATE market SET uses = uses + 1 WHERE id = ?').run(params.id)
      return { plan: { ...plan, _role: 'owner', _shared: false, _rev: 1, _members: membersOf(id), _feedToken: ensureFeedToken(id) } }
    })

    // notify the OTHER members of a plan about a confirmation-loop event.
    // Messages are server-templated by event (not free text) for safety.
    .post('/plans/:id/notify', async ({ email, params, body, set }) => {
      const id = params.id
      if (!isMember(id, email)) { set.status = 403; return { error: 'not_a_member' } }
      const row = db.query('SELECT doc FROM plans WHERE id = ?').get(id)
      if (!row) { set.status = 404; return { error: 'not_found' } }
      let doc; try { doc = JSON.parse(row.doc) } catch { doc = {} }
      const s = (doc.sessions || []).find((x) => String(x.id) === String(body.sessionId))
      const cat = s && doc.categories ? doc.categories[s.subj] : null
      const what = cat ? `${cat.th} · ${cat.en}` : (doc.name || 'คาบเรียน')
      const when = s ? ` (วันที่ ${s.day} · ${s.time})` : ''
      const ALLOWED = new Set(['booked', 'confirmed', 'declined', 'proposed', 'accepted', 'reacted', 'commented', 'rescheduled'])
      if (!ALLOWED.has(body.event)) { set.status = 400; return { error: 'bad_event' } }
      // record every event in the activity feed
      db.query('INSERT INTO activity (plan_id, actor, type, session_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, email, body.event, body.sessionId != null ? String(body.sessionId) : null, what, now())
      // push only the loud confirmation-loop events (and never when silent)
      const T = {
        booked:    { title: 'คำขอจองคาบใหม่ 📩', body: `${what}${when} — โปรดยืนยัน · New session request in ${doc.name}` },
        confirmed: { title: 'ยืนยันคาบแล้ว ✅', body: `${what}${when} · A session was confirmed in ${doc.name}` },
        declined:  { title: 'คาบถูกปฏิเสธ 🙏', body: `${what}${when} · A session was declined in ${doc.name}` },
        proposed:  { title: 'เสนอเลื่อนวัน 🗓️', body: `${what} — ${doc.name} · A reschedule was proposed` },
        accepted:  { title: 'ยอมรับการเลื่อนแล้ว 👍', body: `${what}${when} · Your proposal was accepted in ${doc.name}` },
      }[body.event]
      const recipients = membersOf(id).map((m) => m.email).filter((e) => e !== email)
      let sent = 0
      if (T && !body.silent) for (const r of recipients) sent += await sendToUser(r, { ...T, tag: `notify-${id}-${body.event}`, url: '/' })
      return { recipients: recipients.length, sent, recorded: true }
    }, { body: t.Object({ event: t.String(), sessionId: t.Optional(t.Any()), silent: t.Optional(t.Boolean()) }) })

    // notifications inbox feed (across all my plans) + unread count
    .get('/activity', ({ email }) => {
      const rows = db.query(`
        SELECT a.* FROM activity a
        JOIN plan_members m ON m.plan_id = a.plan_id AND m.email = ?
        ORDER BY a.created_at DESC LIMIT 60
      `).all(email)
      const planName = {}, actorName = {}
      const nameOf = (e) => { if (actorName[e] === undefined) { const u = db.query('SELECT name FROM users WHERE email = ?').get(e); actorName[e] = (u && u.name) || e.split('@')[0] } return actorName[e] }
      const pNameOf = (pid) => { if (planName[pid] === undefined) { const p = db.query('SELECT doc FROM plans WHERE id = ?').get(pid); try { planName[pid] = p ? JSON.parse(p.doc).name : '' } catch { planName[pid] = '' } } return planName[pid] }
      const seen = (db.query('SELECT activity_seen_at FROM users WHERE email = ?').get(email) || {}).activity_seen_at || 0
      const activity = rows.map((r) => ({ id: r.id, planId: r.plan_id, planName: pNameOf(r.plan_id), type: r.type, actor: r.actor, actorName: nameOf(r.actor), label: r.label, sessionId: r.session_id, createdAt: r.created_at, mine: r.actor === email }))
      const unread = activity.filter((a) => !a.mine && a.createdAt > seen).length
      return { activity, unread }
    })

    .post('/activity/seen', ({ email }) => {
      db.query('UPDATE users SET activity_seen_at = ? WHERE email = ?').run(now(), email)
      return { ok: true }
    })

    // ----- push reminders -----
    .get('/push/key', () => ({ key: vapidPublicKey }))

    .post('/push/subscribe', ({ email, body, set }) => {
      const ok = saveSubscription(email, body.subscription)
      if (!ok) { set.status = 400; return { error: 'bad_subscription' } }
      return { subscribed: true }
    }, { body: t.Object({ subscription: t.Any() }) })

    .post('/push/unsubscribe', ({ body }) => {
      if (body.endpoint) removeSubscription(String(body.endpoint))
      return { ok: true }
    }, { body: t.Object({ endpoint: t.Optional(t.String()) }) })

    // send an immediate notification about the user's next upcoming session
    // (or a generic one) so reminders are demonstrable without waiting.
    .post('/push/test', async ({ email }) => {
      const rows = db.query(`SELECT p.id, p.doc FROM plans p JOIN plan_members m ON m.plan_id = p.id WHERE m.email = ?`).all(email)
      let best = null
      for (const r of rows) {
        let doc; try { doc = JSON.parse(r.doc) } catch { continue }
        for (const s of doc.sessions || []) {
          const start = nextOccurrence(now(), s.day, s.time)
          if (start != null && (!best || start < best.start)) best = { start, session: s, planName: doc.name, categories: doc.categories }
        }
      }
      const payload = best
        ? reminderPayload({ key: 'test|' + now(), session: best.session, planName: best.planName, window: { kind: 'soon', label: 'อีกไม่นาน' } }, best.categories)
        : { title: 'TutorSync 🔔', body: 'การแจ้งเตือนพร้อมใช้งานแล้ว · Reminders are on!', tag: 'test', url: '/' }
      const sent = await sendToUser(email, payload)
      return { sent }
    })

    .post('/market/publish', ({ email, body }) => {
      const p = body.plan || {}
      const u = db.query('SELECT name FROM users WHERE email = ?').get(email)
      const id = marketId()
      const cats = {}; Object.keys(p.categories || {}).forEach((k) => { cats[k] = { ...p.categories[k] } })
      const item = { id, emoji: p.emoji, name: p.name, en: p.en || 'My goal', theme: p.theme, kind: p.kind, goalType: p.goalType,
        author: (u?.name || 'Someone') + ' (shared)', authorInitials: (u?.name || 'S').charAt(0), authorColor: '#FF8AA0',
        likes: 0, uses: 0, desc: p.desc || 'แพลนที่แชร์ให้ทุกคนคัดลอกไปใช้ได้ 💛 · A goal shared with the community.',
        budgetTotal: p.budgetTotal, hoursGoal: p.hoursGoal, deadlineDays: p.deadlineDays, categories: cats, dayNotes: p.dayNotes || {} }
      db.query('INSERT INTO market (id, doc, author, likes, uses, published_by, created_at) VALUES (?, ?, ?, 0, 0, ?, ?)')
        .run(id, JSON.stringify(item), item.author, email, now())
      return { item }
    }, { body: t.Object({ plan: t.Any() }) })

    // ----- AI planning agent (GLM 5.2 via MaxPlus) -----
    // Proxy so the API key stays server-side. Client sends its chat history +
    // a compact plan-context snapshot; we run a grounded tool-using agent and
    // return the reply + any UI actions. 503 when no key is configured, so the
    // client falls back to its offline heuristic.
    .post('/ai/chat', async ({ body, set }) => {
      if (!aiConfigured()) { set.status = 503; return { error: 'ai_unconfigured' } }
      try {
        const out = await runAgent(body.messages || [], body.context || {})
        return out
      } catch (e) {
        set.status = 502
        return { error: 'ai_upstream', detail: String(e && e.message || e).slice(0, 200) }
      }
    }, { body: t.Object({ messages: t.Array(t.Any()), context: t.Optional(t.Any()) }) })
  )

if (import.meta.main) {
  app.listen({ port: PORT, hostname: '0.0.0.0' })
  startScheduler(60 * 1000) // check for due reminders every minute
  console.log(`TutorSync API on http://0.0.0.0:${PORT}  (OTP exposed: ${EXPOSE_OTP})`)
}
