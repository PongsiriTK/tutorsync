// Cloud API client. When VITE_API_URL is set AND the backend answers /health,
// the app runs in "cloud mode" (real accounts, cross-device sync, real shared
// invites). Otherwise it falls back to fully-local "guest mode" so the public
// demo never hard-breaks on a home-server outage.

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'ts_token'

export const hasApi = !!API_BASE
export const apiBase = API_BASE

export function getToken() { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
export function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ } }

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (auth) { const t = getToken(); if (t) headers.authorization = 'Bearer ' + t }
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { /* non-json */ }
  if (!res.ok) { const e = new Error((data && data.error) || 'http_' + res.status); e.status = res.status; e.data = data; throw e }
  return data
}

// probe with a short timeout so a dead backend degrades to guest mode fast
export async function probe() {
  if (!API_BASE) return false
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 4000) // tolerate cold-tunnel latency before guest fallback
    const res = await fetch(API_BASE + '/health', { signal: ctrl.signal })
    clearTimeout(to)
    return res.ok
  } catch { return false }
}

export const api = {
  requestCode: (email) => req('/auth/request', { method: 'POST', auth: false, body: { email } }),
  verify: (email, code) => req('/auth/verify', { method: 'POST', auth: false, body: { email, code } }),
  state: () => req('/state'),
  saveProfile: (patch) => req('/me', { method: 'PUT', body: patch }),
  createPlan: (plan) => req('/plans', { method: 'POST', body: { plan } }),
  savePlan: (id, plan) => req('/plans/' + id, { method: 'PUT', body: { plan } }),
  deletePlan: (id) => req('/plans/' + id, { method: 'DELETE' }),
  invite: (id) => req('/plans/' + id + '/invite', { method: 'POST' }),
  acceptInvite: (token) => req('/invites/' + token + '/accept', { method: 'POST' }),
  notify: (id, event, sessionId) => req('/plans/' + id + '/notify', { method: 'POST', body: { event, sessionId } }),
  likeMarket: (id) => req('/market/' + id + '/like', { method: 'POST' }),
  copyMarket: (id) => req('/market/' + id + '/copy', { method: 'POST' }),
  publish: (plan) => req('/market/publish', { method: 'POST', body: { plan } }),
}
