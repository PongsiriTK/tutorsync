import { test, expect, beforeAll, afterAll } from 'bun:test'
import { rmSync } from 'node:fs'

process.env.TS_DB = './data/mail-' + Date.now() + '.sqlite'
process.env.TS_JWT_SECRET = 'mail-secret'

const { app } = await import('../src/index.js')
const { sendOtpEmail } = await import('../src/mail.js')

let base
beforeAll(async () => {
  await app.modules
  app.listen(0)
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

test('sendOtpEmail: false without a key; POSTs to Resend with a key', async () => {
  delete process.env.TS_MAIL_FAKE
  delete process.env.RESEND_API_KEY
  expect(await sendOtpEmail('a@b.com', '123456')).toBe(false)

  const orig = globalThis.fetch
  let captured = null
  globalThis.fetch = async (url, opts) => { captured = { url: String(url), opts }; return new Response('{"id":"x"}', { status: 200 }) }
  process.env.RESEND_API_KEY = 're_fake_test_key'
  try {
    expect(await sendOtpEmail('user@example.com', '654321')).toBe(true)
    expect(captured.url).toContain('api.resend.com')
    expect(String(captured.opts.headers.authorization)).toContain('re_fake_test_key')
    expect(captured.opts.body).toContain('654321')       // code in payload
    expect(captured.opts.body).toContain('user@example.com')
  } finally { globalThis.fetch = orig; delete process.env.RESEND_API_KEY }
})

test('sendOtpEmail returns false when Resend responds non-2xx', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response('nope', { status: 422 })
  process.env.RESEND_API_KEY = 're_fake'
  try { expect(await sendOtpEmail('a@b.com', '111111')).toBe(false) }
  finally { globalThis.fetch = orig; delete process.env.RESEND_API_KEY }
})

test('/auth/request emails the code (no demoCode) when mail is configured', async () => {
  process.env.TS_MAIL_FAKE = '1'
  try {
    const [status, body] = await json(await call('/auth/request', { method: 'POST', body: { email: 'mailer@test.dev' } }))
    expect(status).toBe(200)
    expect(body.emailed).toBe(true)
    expect(body.demoCode).toBeUndefined()   // not leaked when emailed
  } finally { delete process.env.TS_MAIL_FAKE }
})

test('/auth/request falls back to demoCode when no mailer configured', async () => {
  delete process.env.TS_MAIL_FAKE
  delete process.env.RESEND_API_KEY
  const [status, body] = await json(await call('/auth/request', { method: 'POST', body: { email: 'demo@test.dev' } }))
  expect(status).toBe(200)
  expect(body.emailed).toBe(false)
  expect(body.demoCode).toMatch(/^\d{6}$/)
})

process.on('exit', () => { try { rmSync(process.env.TS_DB) } catch {} })
