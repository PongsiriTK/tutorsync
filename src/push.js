// Client-side push helpers: register the service worker, subscribe via the
// server's VAPID key, and toggle. All gated behind a user gesture + cloud mode.
import { apiBase, getToken } from './api.js'

export const pushSupported = typeof window !== 'undefined' &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function apiPost(path, body) {
  const res = await fetch(apiBase + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + getToken() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error('http_' + res.status)
  return res.json()
}

let _reg = null
async function ready() {
  if (!_reg) _reg = await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export async function isSubscribed() {
  if (!pushSupported || Notification.permission !== 'granted') return false
  try { const reg = await ready(); return !!(await reg.pushManager.getSubscription()) } catch { return false }
}

// Returns 'enabled' | 'denied' | 'unsupported' | 'error'
export async function enableReminders() {
  if (!pushSupported) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  const reg = await ready()
  const { key } = await (await fetch(apiBase + '/push/key', { headers: { authorization: 'Bearer ' + getToken() } })).json()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
  await apiPost('/push/subscribe', { subscription: sub.toJSON() })
  return 'enabled'
}

export async function disableReminders() {
  try {
    const reg = await ready()
    const sub = await reg.pushManager.getSubscription()
    if (sub) { await apiPost('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe() }
  } catch { /* noop */ }
}

export async function sendTestReminder() { return apiPost('/push/test', {}) }
