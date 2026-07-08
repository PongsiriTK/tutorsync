import webpush from 'web-push'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { db, now } from './db.js'
import { computeDue, reminderPayload } from './reminders.js'

const VAPID_PATH = process.env.TS_VAPID_FILE || './data/vapid.json'
const SUBJECT = process.env.TS_VAPID_SUBJECT || 'mailto:reminders@tutorsync.app'

// Load VAPID keys from env or a persisted file; generate + persist on first run
// so subscriptions stay valid across restarts.
function loadVapid() {
  if (process.env.TS_VAPID_PUBLIC && process.env.TS_VAPID_PRIVATE) {
    return { publicKey: process.env.TS_VAPID_PUBLIC, privateKey: process.env.TS_VAPID_PRIVATE }
  }
  if (existsSync(VAPID_PATH)) {
    try { return JSON.parse(readFileSync(VAPID_PATH, 'utf8')) } catch { /* regenerate */ }
  }
  const keys = webpush.generateVAPIDKeys()
  try { mkdirSync(dirname(VAPID_PATH), { recursive: true }); writeFileSync(VAPID_PATH, JSON.stringify(keys)) } catch { /* ephemeral */ }
  return keys
}

export const vapid = loadVapid()
webpush.setVapidDetails(SUBJECT, vapid.publicKey, vapid.privateKey)
export const vapidPublicKey = vapid.publicKey

export function saveSubscription(email, sub) {
  if (!sub || !sub.endpoint || !sub.keys) return false
  db.query(`INSERT INTO push_subs (endpoint, email, p256dh, auth, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth`)
    .run(sub.endpoint, email, sub.keys.p256dh, sub.keys.auth, now())
  return true
}

export function removeSubscription(endpoint) {
  db.query('DELETE FROM push_subs WHERE endpoint = ?').run(endpoint)
}

const toWebPushSub = (row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } })

// Send a payload to every subscription of a user. Prunes subs the push service
// reports as gone (404/410). Returns count delivered.
export async function sendToUser(email, payload) {
  const subs = db.query('SELECT * FROM push_subs WHERE email = ?').all(email)
  let ok = 0
  await Promise.all(subs.map(async (row) => {
    try { await webpush.sendNotification(toWebPushSub(row), JSON.stringify(payload)); ok++ }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) removeSubscription(row.endpoint) }
  }))
  return ok
}

// ---- scheduler ----
const sentHas = (key) => !!db.query('SELECT 1 FROM reminders_sent WHERE key = ?').get(key)
const markSent = (key) => db.query('INSERT OR IGNORE INTO reminders_sent (key, sent_at) VALUES (?, ?)').run(key, now())

// Build reminder candidates for every user who has at least one push sub.
function candidateEntries() {
  const emails = db.query('SELECT DISTINCT email FROM push_subs').all().map((r) => r.email)
  const entries = []
  const catsByPlan = {}
  for (const email of emails) {
    const rows = db.query(`SELECT p.id, p.doc FROM plans p JOIN plan_members m ON m.plan_id = p.id WHERE m.email = ?`).all(email)
    for (const r of rows) {
      let doc; try { doc = JSON.parse(r.doc) } catch { continue }
      catsByPlan[r.id] = doc.categories || {}
      for (const s of doc.sessions || []) entries.push({ email, planId: r.id, planName: doc.name || 'แพลน', session: s })
    }
  }
  return { entries, catsByPlan }
}

export async function runReminderTick(nowMs = now()) {
  const { entries, catsByPlan } = candidateEntries()
  const due = computeDue(nowMs, entries, sentHas)
  let sent = 0
  for (const d of due) {
    const n = await sendToUser(d.email, reminderPayload(d, catsByPlan[d.planId]))
    markSent(d.key) // mark regardless so we don't spam if all subs are dead
    sent += n
  }
  return { due: due.length, sent }
}

let _timer = null
export function startScheduler(intervalMs = 60 * 1000) {
  if (_timer) return
  _timer = setInterval(() => { runReminderTick().catch(() => {}) }, intervalMs)
}
