import { test, expect } from '@playwright/test'
import { tap } from './helpers.js'

// Cloud-mode journeys against a REAL running backend. This project only runs
// when TS_E2E_API is set (see playwright.config.js), so the default suite stays
// pure guest-mode. Two browser contexts model two real accounts collaborating.

const API = process.env.TS_E2E_API

async function signInFresh(page, email) {
  // Playwright gives each test/context fresh storage — no manual clear needed
  // (and clearing via addInitScript would wipe the token on later navigations).
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Sign in to TutorSync')).toBeVisible({ timeout: 15000 })
  await page.fill('input[type="email"]', email)
  await tap(page.getByText('Send code'))
  // cloud sendCode is async (network) — wait for the OTP step + demo code
  await expect(page.getByText(/demo code:/)).toBeVisible({ timeout: 15000 })
  const body = await page.locator('body').innerText()
  const code = body.match(/demo code:\s*(\d{6})/)[1]
  await page.fill('input[inputmode="numeric"]', code)
  // new cloud accounts land on onboarding (z-60 overlay). Dismiss it and wait
  // for it to detach so later force-clicks don't land on the overlay.
  const skip = page.getByText('ข้ามไปก่อน · Skip')
  await skip.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ force: true })
    await skip.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  }
  await expect(page.getByText('University Entrance Prep')).toBeVisible({ timeout: 15000 })
}

test('real account: OTP sign-in loads server-seeded plans; a booking survives reload', async ({ page }) => {
  test.skip(!API, 'cloud API not configured')
  const email = `solo_${Date.now()}@e2e.dev`
  await signInFresh(page, email)

  // server-seeded plans present after real sign-in
  await tap(page.getByText('University Entrance Prep'))
  await tap(page.locator('button[aria-label="Add session"]'))
  await tap(page.getByText('บันทึกคาบ · Book session 🎉'))
  await expect(page.getByText('Added to your calendar')).toBeVisible()
  await tap(page.getByText('เสร็จสิ้น'))
  await page.waitForTimeout(1200) // let the debounced sync flush to the server

  // reload → same account, booking persisted server-side (no localStorage seed)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('University Entrance Prep')).toBeVisible({ timeout: 15000 })
})

test('real invite: owner shares a plan; invitee joins and sees the same sessions', async ({ browser }) => {
  test.skip(!API, 'cloud API not configured')
  const ownerCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  const guest = await guestCtx.newPage()

  const ownerEmail = `owner_${Date.now()}@e2e.dev`
  const guestEmail = `guest_${Date.now()}@e2e.dev`

  // owner signs in, books a distinctive session, generates a real invite link
  await signInFresh(owner, ownerEmail)
  await tap(owner.getByText('University Entrance Prep'))
  await tap(owner.locator('button[aria-label="Add session"]'))
  await tap(owner.getByText('บันทึกคาบ · Book session 🎉'))
  await tap(owner.getByText('เสร็จสิ้น'))
  await owner.waitForTimeout(1000)
  await tap(owner.getByText('ทีม', { exact: true }))
  await tap(owner.getByText('🔗 คัดลอกลิงก์เชิญ · Copy invite link'))
  await expect(owner.getByText(/\/\?invite=/)).toBeVisible({ timeout: 10000 })
  const inviteUrl = (await owner.getByText(/\/\?invite=/).innerText()).trim()
  expect(inviteUrl).toContain('invite=')

  // guest signs in, then opens the invite link → joins the SAME plan
  await signInFresh(guest, guestEmail)
  const path = inviteUrl.slice(inviteUrl.indexOf('/?invite='))
  await guest.goto(path)
  await guest.waitForLoadState('networkidle')
  await expect(guest.getByText('เข้าร่วมแพลนที่แชร์แล้ว · Joined shared plan!')).toBeVisible({ timeout: 15000 })

  // guest is now viewing the shared plan calendar
  await expect(guest.locator('[data-day]').first()).toBeVisible()

  await ownerCtx.close(); await guestCtx.close()
})

test('tutor-side confirmation loop: pending → tutor confirms → owner sees confirmed', async ({ browser }) => {
  test.skip(!API, 'cloud API not configured')
  const ownerCtx = await browser.newContext()
  const tutorCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  const tutor = await tutorCtx.newPage()
  const ownerEmail = `cown_${Date.now()}@e2e.dev`
  const tutorEmail = `ctut_${Date.now()}@e2e.dev`

  // owner signs in, opens a plan, invites a tutor
  await signInFresh(owner, ownerEmail)
  await tap(owner.getByText('University Entrance Prep'))
  await tap(owner.getByText('ทีม', { exact: true }))
  await tap(owner.getByText('🔗 คัดลอกลิงก์เชิญ · Copy invite link'))
  await expect(owner.getByText(/\/\?invite=/)).toBeVisible({ timeout: 10000 })
  const inviteUrl = (await owner.getByText(/\/\?invite=/).innerText()).trim()

  // tutor joins via the invite link
  await signInFresh(tutor, tutorEmail)
  await tutor.goto(inviteUrl.slice(inviteUrl.indexOf('/?invite=')))
  await tutor.waitForLoadState('networkidle')
  await expect(tutor.getByText('เข้าร่วมแพลนที่แชร์แล้ว · Joined shared plan!')).toBeVisible({ timeout: 15000 })

  // owner reloads so the client sees the new member, then books → PENDING (tutor exists)
  await owner.reload(); await owner.waitForLoadState('networkidle')
  await tap(owner.getByText('University Entrance Prep'))
  await tap(owner.locator('button[aria-label="Add session"]'))
  await tap(owner.getByText('บันทึกคาบ · Book session 🎉'))
  await expect(owner.getByText('ส่งคำขอจองแล้ว!')).toBeVisible({ timeout: 10000 }) // "request sent", not "booked"
  await tap(owner.getByText('ดูวันนั้น · View day 🗓️'))
  await expect(owner.getByText(/⏳ รอยืนยัน/).first()).toBeVisible({ timeout: 10000 }) // pending pill
  await owner.waitForTimeout(2000) // let the debounced sync push the pending session to the server

  // tutor → opens the SHARED plan (badged 🔗 แชร์, distinct from their own seeded
  // copy) and confirms the request from the inbox (reload-retry for sync lag)
  const openTutorInbox = async () => {
    await tutor.reload(); await tutor.waitForLoadState('networkidle')
    await tap(tutor.locator('button', { hasText: 'University Entrance Prep' }).filter({ hasText: 'แชร์' }))
    await tap(tutor.getByText('ทีม', { exact: true }))
  }
  await openTutorInbox()
  const inbox = tutor.getByText(/คาบรอคุณยืนยัน · Awaiting your confirmation/)
  if (!(await inbox.isVisible().catch(() => false))) { await tutor.waitForTimeout(2000); await openTutorInbox() }
  await expect(inbox).toBeVisible({ timeout: 10000 })
  await tap(tutor.getByText('ยืนยัน', { exact: true }).first())
  await expect(tutor.getByText('ยืนยันคาบแล้ว · Session confirmed')).toBeVisible({ timeout: 10000 })
  await tutor.waitForTimeout(2000) // sync the confirmed status back

  // owner reloads → the session is now confirmed (no pending pill on that day)
  await owner.reload(); await owner.waitForLoadState('networkidle')
  await tap(owner.getByText('University Entrance Prep'))
  const today = await owner.evaluate(() => new Date().getDate()) // booking defaults to today
  await owner.locator(`[data-day="${today}"]`).click({ force: true })
  await expect(owner.getByText(/เพิ่มคาบ · Add session/)).toBeVisible({ timeout: 10000 }) // day sheet open
  await expect(owner.getByText(/⏳ รอยืนยัน/)).toHaveCount(0)

  await ownerCtx.close(); await tutorCtx.close()
})
