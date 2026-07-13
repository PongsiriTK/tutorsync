import { test, expect, beforeAll, afterAll } from 'bun:test'
import { rmSync } from 'node:fs'

// fresh throwaway db per run
process.env.TS_DB = './data/test-' + Date.now() + '.sqlite'
process.env.TS_JWT_SECRET = 'test-secret'

const { app } = await import('../src/index.js')

let base
beforeAll(async () => {
  await app.modules
  app.listen(0) // ephemeral port — compiles the router and serves over real HTTP
  for (let i = 0; i < 100 && !app.server; i++) await new Promise((r) => setTimeout(r, 10))
  base = `http://localhost:${app.server.port}`
})
afterAll(() => app.stop())

const call = (path, opts = {}) => fetch(base + path, {
  ...opts,
  headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  body: opts.body ? JSON.stringify(opts.body) : undefined,
})
const json = async (res) => [res.status, await res.json()]

async function signIn(email) {
  const [, req] = await json(await call('/auth/request', { method: 'POST', body: { email } }))
  const [, ver] = await json(await call('/auth/verify', { method: 'POST', body: { email, code: req.demoCode } }))
  return ver.token
}
const authed = (token) => ({ Authorization: 'Bearer ' + token })

test('health', async () => {
  const [status, body] = await json(await call('/health'))
  expect(status).toBe(200)
  expect(body.ok).toBe(true)
})

test('auth: invalid email rejected', async () => {
  const [status, body] = await json(await call('/auth/request', { method: 'POST', body: { email: 'nope' } }))
  expect(status).toBe(400)
  expect(body.error).toBe('invalid_email')
})

test('auth: wrong code rejected, correct code returns token + seeds account', async () => {
  const email = 'a@test.dev'
  const [, req] = await json(await call('/auth/request', { method: 'POST', body: { email } }))
  expect(req.demoCode).toMatch(/^\d{6}$/)

  const [ws] = await json(await call('/auth/verify', { method: 'POST', body: { email, code: '000000' === req.demoCode ? '111111' : '000000' } }))
  expect(ws).toBe(400)

  const [status, ok] = await json(await call('/auth/verify', { method: 'POST', body: { email, code: req.demoCode } }))
  expect(status).toBe(200)
  expect(ok.token).toBeTruthy()

  const [, state] = await json(await call('/state', { headers: authed(ok.token) }))
  expect(state.plans.length).toBe(3) // seeded
  expect(state.market.length).toBeGreaterThanOrEqual(4)
  expect(state.plans.every((p) => p._role === 'owner')).toBe(true)
})

test('unauthenticated state is 401', async () => {
  const [status] = await json(await call('/state'))
  expect(status).toBe(401)
})

test('plan create / save / sync round-trips the doc', async () => {
  const tok = await signIn('b@test.dev')
  const [, created] = await json(await call('/plans', { method: 'POST', headers: authed(tok), body: { plan: { name: 'My Goal', goalType: 'sessions', categories: {}, sessions: [] } } }))
  const id = created.plan.id
  expect(id).toMatch(/^p_/)

  const updated = { ...created.plan, sessions: [{ id: 1, day: 5, subj: 'X', hours: 2, cost: 500, reactions: {}, comments: [] }] }
  const [status, saved] = await json(await call('/plans/' + id, { method: 'PUT', headers: authed(tok), body: { plan: updated } }))
  expect(status).toBe(200)
  expect(saved.rev).toBe(2)

  const [, state] = await json(await call('/state', { headers: authed(tok) }))
  const p = state.plans.find((x) => x.id === id)
  expect(p.sessions.length).toBe(1)
})

test('real invite: second account joins and sees the same shared plan', async () => {
  const owner = await signIn('owner@test.dev')
  const [, st] = await json(await call('/state', { headers: authed(owner) }))
  const planIdToShare = st.plans[0].id

  // owner books a session then invites
  const doc = { ...st.plans[0], sessions: [...st.plans[0].sessions, { id: 999, day: 12, subj: Object.keys(st.plans[0].categories)[0], hours: 2, cost: 540, reactions: {}, comments: [] }] }
  await call('/plans/' + planIdToShare, { method: 'PUT', headers: authed(owner), body: { plan: doc } })
  const [, inv] = await json(await call('/plans/' + planIdToShare + '/invite', { method: 'POST', headers: authed(owner) }))
  expect(inv.token).toBeTruthy()

  // invitee accepts
  const guest = await signIn('guest@test.dev')
  const [status, acc] = await json(await call('/invites/' + inv.token + '/accept', { method: 'POST', headers: authed(guest) }))
  expect(status).toBe(200)
  expect(acc.plan.id).toBe(planIdToShare)
  expect(acc.plan._shared).toBe(true)

  // guest's /state now includes the shared plan WITH the owner's booked session
  const [, gs] = await json(await call('/state', { headers: authed(guest) }))
  const shared = gs.plans.find((p) => p.id === planIdToShare)
  expect(shared).toBeTruthy()
  expect(shared._shared).toBe(true)
  expect(shared.sessions.some((s) => s.id === 999)).toBe(true)

  // guest edits the shared plan → owner sees it (real collaboration)
  const gdoc = { ...shared, sessions: shared.sessions.map((s) => s.id === 999 ? { ...s, reactions: { '🔥': 1 } } : s) }
  await call('/plans/' + planIdToShare, { method: 'PUT', headers: authed(guest), body: { plan: gdoc } })
  const [, os] = await json(await call('/state', { headers: authed(owner) }))
  const ownerView = os.plans.find((p) => p.id === planIdToShare)
  expect(ownerView.sessions.find((s) => s.id === 999).reactions['🔥']).toBe(1)
})

test('non-member cannot save or invite a plan', async () => {
  const a = await signIn('carol@test.dev')
  const [, sa] = await json(await call('/state', { headers: authed(a) }))
  const pid = sa.plans[0].id
  const b = await signIn('dave@test.dev')
  const [s1] = await json(await call('/plans/' + pid, { method: 'PUT', headers: authed(b), body: { plan: sa.plans[0] } }))
  expect(s1).toBe(403)
  const [s2] = await json(await call('/plans/' + pid + '/invite', { method: 'POST', headers: authed(b) }))
  expect(s2).toBe(403)
})

test('market copy adds an owned plan and bumps uses', async () => {
  const tok = await signIn('erin@test.dev')
  const [, m] = await json(await call('/market', { headers: authed(tok) }))
  const item = m.market[m.market.length - 1]
  const [status, res] = await json(await call('/market/' + item.id + '/copy', { method: 'POST', headers: authed(tok) }))
  expect(status).toBe(200)
  expect(res.plan._role).toBe('owner')
  const [, state] = await json(await call('/state', { headers: authed(tok) }))
  expect(state.plans.some((p) => p.name === item.name)).toBe(true)
})

test('day notes travel through publish → copy', async () => {
  const owner = await signIn('notesown@test.dev')
  const [, st] = await json(await call('/state', { headers: authed(owner) }))
  const plan = st.plans[0]
  // owner adds day notes and syncs
  const doc = { ...plan, dayNotes: { 12: { desc: 'Exam focus', checklist: [{ id: 'x', text: 'formulae', done: false }], links: [{ id: 'y', label: 'sheet', url: 'https://ex.com/s' }] } } }
  await call('/plans/' + plan.id, { method: 'PUT', headers: authed(owner), body: { plan: doc } })
  const [, pub] = await json(await call('/market/publish', { method: 'POST', headers: authed(owner), body: { plan: doc } }))
  expect(pub.item.dayNotes['12'].desc).toBe('Exam focus')

  // another account copies the published template → gets the notes
  const other = await signIn('notescopy@test.dev')
  const [, res] = await json(await call('/market/' + pub.item.id + '/copy', { method: 'POST', headers: authed(other) }))
  expect(res.plan.dayNotes['12'].desc).toBe('Exam focus')
  expect(res.plan.dayNotes['12'].links[0].url).toBe('https://ex.com/s')
})

test('push: exposes VAPID key, stores a subscription, unsubscribes', async () => {
  const tok = await signIn('push@test.dev')
  const [ks, keyRes] = await json(await call('/push/key', { headers: authed(tok) }))
  expect(ks).toBe(200)
  expect(typeof keyRes.key).toBe('string')
  expect(keyRes.key.length).toBeGreaterThan(80) // base64url VAPID public key

  const sub = { endpoint: 'https://push.example/ep-' + Date.now(), keys: { p256dh: 'BPabc', auth: 'xyz' } }
  const [ss, subRes] = await json(await call('/push/subscribe', { method: 'POST', headers: authed(tok), body: { subscription: sub } }))
  expect(ss).toBe(200)
  expect(subRes.subscribed).toBe(true)

  // a bad subscription is rejected
  const [bs] = await json(await call('/push/subscribe', { method: 'POST', headers: authed(tok), body: { subscription: { endpoint: 'x' } } }))
  expect(bs).toBe(400)

  // /push/test resolves (0 delivered because the fake endpoint isn't a real push service)
  const [ts, testRes] = await json(await call('/push/test', { method: 'POST', headers: authed(tok) }))
  expect(ts).toBe(200)
  expect(typeof testRes.sent).toBe('number')

  const [us, unsub] = await json(await call('/push/unsubscribe', { method: 'POST', headers: authed(tok), body: { endpoint: sub.endpoint } }))
  expect(us).toBe(200)
  expect(unsub.ok).toBe(true)
})

test('state exposes real plan membership; notify targets the other members', async () => {
  const owner = await signIn('confown@test.dev')
  const [, st] = await json(await call('/state', { headers: authed(owner) }))
  const pid = st.plans[0].id
  // solo: only the owner is a member
  expect(st.plans[0]._members.map((m) => m.email)).toEqual(['confown@test.dev'])

  // invite a tutor, who joins
  const [, inv] = await json(await call('/plans/' + pid + '/invite', { method: 'POST', headers: authed(owner) }))
  const tutor = await signIn('conftutor@test.dev')
  await call('/invites/' + inv.token + '/accept', { method: 'POST', headers: authed(tutor) })

  // now the plan has two members
  const [, st2] = await json(await call('/state', { headers: authed(owner) }))
  const shared = st2.plans.find((p) => p.id === pid)
  expect(shared._members.map((m) => m.email).sort()).toEqual(['confown@test.dev', 'conftutor@test.dev'])

  // owner notifies "booked" → recipients = the tutor (not the owner)
  const [ns2, notif2] = await json(await call('/plans/' + pid + '/notify', { method: 'POST', headers: authed(owner), body: { event: 'booked' } }))
  expect(ns2).toBe(200)
  expect(notif2.recipients).toBe(1)

  // a bad event is rejected; a non-member cannot notify
  const [be] = await json(await call('/plans/' + pid + '/notify', { method: 'POST', headers: authed(owner), body: { event: 'nope' } }))
  expect(be).toBe(400)
  const outsider = await signIn('confout@test.dev')
  const [fe] = await json(await call('/plans/' + pid + '/notify', { method: 'POST', headers: authed(outsider), body: { event: 'booked' } }))
  expect(fe).toBe(403)
})

test('calendar feed: /state exposes a feed token; public .ics feed serves the plan', async () => {
  const tok = await signIn('feed@test.dev')
  const [, st] = await json(await call('/state', { headers: authed(tok) }))
  const plan = st.plans[0]
  expect(plan._feedToken).toMatch(/^f_/)

  // public, no auth needed — the token is the secret
  const res = await call('/calendar/' + plan._feedToken + '.ics')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('text/calendar')
  const body = await res.text()
  expect(body.startsWith('BEGIN:VCALENDAR')).toBe(true)
  expect(body).toContain('BEGIN:VEVENT')

  // a bad token 404s
  const bad = await call('/calendar/f_nope.ics')
  expect(bad.status).toBe(404)
})

test('activity feed: records events, counts unread from others, seen clears it', async () => {
  const owner = await signIn('actown@test.dev')
  const [, st] = await json(await call('/state', { headers: authed(owner) }))
  const pid = st.plans[0].id
  const [, inv] = await json(await call('/plans/' + pid + '/invite', { method: 'POST', headers: authed(owner) }))
  const tutor = await signIn('acttutor@test.dev')
  await call('/invites/' + inv.token + '/accept', { method: 'POST', headers: authed(tutor) })

  // owner's feed: the tutor joining is an event by someone else → unread 1
  let [, of] = await json(await call('/activity', { headers: authed(owner) }))
  expect(of.activity.some((a) => a.type === 'joined')).toBe(true)
  expect(of.unread).toBeGreaterThanOrEqual(1)

  // tutor confirms a (fake) session → owner gets a 'confirmed' activity
  await call('/plans/' + pid + '/notify', { method: 'POST', headers: authed(tutor), body: { event: 'confirmed', sessionId: 5 } })
  ;[, of] = await json(await call('/activity', { headers: authed(owner) }))
  const conf = of.activity.find((a) => a.type === 'confirmed')
  expect(conf).toBeTruthy()
  expect(conf.mine).toBe(false)
  expect(conf.actorName).toBe('acttutor') // resolved from email
  expect(of.unread).toBeGreaterThanOrEqual(2)

  // marking seen clears unread
  await call('/activity/seen', { method: 'POST', headers: authed(owner) })
  ;[, of] = await json(await call('/activity', { headers: authed(owner) }))
  expect(of.unread).toBe(0)

  // a silent event records but does not push
  const [rs, rec] = await json(await call('/plans/' + pid + '/notify', { method: 'POST', headers: authed(owner), body: { event: 'reacted', sessionId: 5, silent: true } }))
  expect(rs).toBe(200); expect(rec.recorded).toBe(true); expect(rec.sent).toBe(0)
  const [, tf] = await json(await call('/activity', { headers: authed(tutor) }))
  expect(tf.activity.some((a) => a.type === 'reacted')).toBe(true)
})

test('push endpoints require auth', async () => {
  const [s1] = await json(await call('/push/subscribe', { method: 'POST', body: { subscription: {} } }))
  expect(s1).toBe(401)
})

// ----- AI planning agent -----
import { parseToolArgs } from '../src/ai/agent.js'

test('parseToolArgs recovers the GLM malformed-args bug', () => {
  expect(parseToolArgs('{"planName":"Physics"}')).toEqual({ planName: 'Physics' })
  expect(parseToolArgs('{}{"planName":"Physics"}')).toEqual({ planName: 'Physics' }) // stray {} prefix
  expect(parseToolArgs('{}{"count":2,"subject":"Math"}')).toEqual({ count: 2, subject: 'Math' })
  expect(parseToolArgs('{}')).toEqual({})
  expect(parseToolArgs('')).toEqual({})
  expect(parseToolArgs('{"note":"has } brace in string"}')).toEqual({ note: 'has } brace in string' })
})

test('ai chat: 503 without a key; grounded reply + action with mocked upstream', async () => {
  const tok = await signIn('ai@test.dev')
  const ctx = {
    activePlanName: 'Uni', today: { date: 5, daysInMonth: 31 },
    plans: [{
      id: 'p_ai1', name: 'Uni', en: 'Uni', goalType: 'budget', pct: 40, spent: 6000, budgetTotal: 15000, count: 8,
      categories: [{ key: 'MATH', en: 'Math', th: 'คณิต', count: 2, target: 6, rate: 300 }],
      upcoming: [{ day: 3, subj: 'MATH' }],
    }],
  }
  const askBody = { messages: [{ isAi: false, text: 'เหลืองบเท่าไหร่ แล้วเปิดแพลนให้หน่อย' }], context: ctx }

  // no key configured → 503 so the client falls back to the local heuristic
  delete process.env.MAXPLUS_API_KEY
  const [noKey] = await json(await call('/ai/chat', { method: 'POST', headers: authed(tok), body: askBody }))
  expect(noKey).toBe(503)

  // configure a key + mock the upstream; leave localhost calls untouched
  process.env.MAXPLUS_API_KEY = 'test-key'
  const realFetch = globalThis.fetch
  let turn = 0
  globalThis.fetch = async (url, opts) => {
    if (!String(url).includes('maxplus')) return realFetch(url, opts)
    turn++
    const mk = (message) => new Response(JSON.stringify({ choices: [{ message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (turn === 1) {
      return mk({ role: 'assistant', content: 'ขอเช็คงบก่อนนะคะ', tool_calls: [
        { id: 'tc1', type: 'function', function: { name: 'get_plan', arguments: '{}{"planName":"Uni"}' } },
        { id: 'tc2', type: 'function', function: { name: 'open_plan', arguments: '{}{"planName":"Uni"}' } },
      ] })
    }
    return mk({ role: 'assistant', content: 'เหลืองบ ฿9,000 ค่ะ เปิดแพลน Uni ให้แล้วนะคะ 💛' })
  }
  try {
    const [status, res] = await json(await call('/ai/chat', { method: 'POST', headers: authed(tok), body: askBody }))
    expect(status).toBe(200)
    expect(res.reply).toContain('9,000')
    expect(res.actions.some((a) => a.type === 'open_plan' && a.planId === 'p_ai1')).toBe(true)
    expect(res.model).toBe('glm-5.2')
  } finally {
    globalThis.fetch = realFetch
    delete process.env.MAXPLUS_API_KEY
  }
})

process.on('exit', () => { try { rmSync(process.env.TS_DB) } catch {} })
