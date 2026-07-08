import { test, expect } from 'bun:test'
import { createECDH, randomBytes } from 'node:crypto'

// Proves the REAL server→push-service delivery pipeline end to end: web-push
// encrypts a payload to a browser-style subscription keypair and POSTs it over
// HTTPS to the push service, and our sendToUser handles the response (pruning a
// gone subscription). We use a real FCM endpoint with a bogus token, which the
// service answers 404/410 — exercising encryption + HTTPS + response handling
// without needing a live browser (headless browsers deny the push permission).

process.env.TS_DB = './data/delivery-' + Date.now() + '.sqlite'
process.env.TS_JWT_SECRET = 'delivery-secret'
process.env.TS_VAPID_FILE = './data/delivery-vapid-' + Date.now() + '.json'

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const { saveSubscription, sendToUser } = await import('../src/push.js')
const { db } = await import('../src/db.js')
db.query('INSERT OR IGNORE INTO users (email, name, theme, created_at) VALUES (?, ?, ?, ?)').run('deliver@test.dev', '', 'coral', Date.now())

async function fcmReachable() {
  try { await fetch('https://fcm.googleapis.com/', { method: 'HEAD' }); return true } catch { return false }
}

test('web-push encrypts + POSTs over HTTPS and prunes a dead subscription', async () => {
  if (!(await fcmReachable())) { console.warn('FCM unreachable — skipping live delivery test'); return }

  const ecdh = createECDH('prime256v1'); ecdh.generateKeys()
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/tutorsync-bogus-' + Date.now(),
    keys: { p256dh: b64url(ecdh.getPublicKey()), auth: b64url(randomBytes(16)) },
  }
  expect(saveSubscription('deliver@test.dev', sub)).toBe(true)
  expect(db.query('SELECT COUNT(*) c FROM push_subs WHERE endpoint = ?').get(sub.endpoint).c).toBe(1)

  // encryption + HTTPS POST happen inside here; FCM rejects the bogus token (404/410)
  const delivered = await sendToUser('deliver@test.dev', { title: 'T', body: 'reminder', tag: 'x', url: '/' })
  expect(delivered).toBe(0)

  // the gone subscription is pruned so we stop trying dead endpoints
  expect(db.query('SELECT COUNT(*) c FROM push_subs WHERE endpoint = ?').get(sub.endpoint).c).toBe(0)
})
