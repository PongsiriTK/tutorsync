import { test, expect } from '@playwright/test'
import { tap, seedSession, gotoApp, waitForPlans } from './helpers.js'

// Guest-mode calendar journeys: .ics download, auto-fill, delete confirmation,
// and copy-from-market auto-scheduling. All work offline (no backend).

async function openPlan(page, name = 'University Entrance Prep') {
  await waitForPlans(page)
  await tap(page.getByText(name))
  await expect(page.locator('[data-day]').first()).toBeVisible()
}

// The calendar action buttons sit low; scroll the main pane fully down so they
// clear the fixed bottom nav (which is z-above the scroll content) before tapping.
async function tapCalendarAction(page, text) {
  await page.locator('[data-scroll-main]').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(150)
  await page.getByText(text).click()
}

test('download .ics from the calendar produces a valid calendar file', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)

  await tapCalendarAction(page, '📅 ส่งออก / ซิงก์ · Export / Sync')
  await expect(page.getByText('ส่งออก / ซิงก์ปฏิทิน 📅')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    tap(page.getByText('📥 ดาวน์โหลดไฟล์ .ics · Download')),
  ])
  expect(download.suggestedFilename()).toMatch(/\.ics$/)
  const stream = await download.createReadStream()
  const chunks = []
  for await (const c of stream) chunks.push(c)
  const text = Buffer.concat(chunks).toString('utf8')
  expect(text).toContain('BEGIN:VCALENDAR')
  expect(text).toContain('BEGIN:VEVENT')
  expect(text).toContain('SUMMARY:')

  // guest has no cloud → subscribe section shows the sign-in note
  await expect(page.getByText(/Live subscribe needs cloud sign-in/)).toBeVisible()
})

test('per-session add-to-calendar: .ics download + Google link', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)
  await tap(page.locator('[data-day][data-has="true"]').first())
  await tap(page.locator('button', { hasText: '17:00–19:00' }).last())
  await expect(page.getByText('รีแอคชัน · React')).toBeVisible()

  const gcal = page.getByText('📆 เพิ่มลง Google Calendar')
  await expect(gcal).toBeVisible()
  expect(await gcal.getAttribute('href')).toContain('calendar.google.com/calendar/render')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    tap(page.getByText('📥 .ics', { exact: true })),
  ])
  expect(download.suggestedFilename()).toBe('tutorsync-session.ics')
})

test('auto-fill drafts sessions onto an empty plan', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await waitForPlans(page)

  // fresh empty plan
  await tap(page.locator('button[aria-label="New goal"]'))
  await page.fill('input[placeholder*="ติวสอบเข้ามหาลัย"]', 'แพลนว่าง')
  await tap(page.getByText('สร้างเป้าหมาย · Create goal ✨'))
  await expect(page.locator('[data-day][data-has="true"]')).toHaveCount(0)

  await tapCalendarAction(page, '✨ เติมตารางอัตโนมัติ · Auto-fill')
  await expect(page.getByText(/Drafted \d+ sessions/)).toBeVisible({ timeout: 8000 })
  await expect(page.locator('[data-day][data-has="true"]').first()).toBeVisible()
})

test('copying a market template auto-schedules its calendar', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await waitForPlans(page)
  await tap(page.getByText('🛍️ มาร์เก็ต · Explore'))
  await tap(page.getByText('Piano for Beginners'))
  await tap(page.getByText('คัดลอกไปยังของฉัน'))
  await expect(page.getByText(/Copied & auto-scheduled/)).toBeVisible({ timeout: 8000 })
  // lands on the plan calendar WITH sessions (not empty)
  await expect(page.locator('[data-day][data-has="true"]').first()).toBeVisible()
})

test('day notes: description, checklist and link persist and mark the day', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)

  // open a day (today has a seeded session)
  const today = await page.evaluate(() => new Date().getDate())
  await page.locator(`[data-day="${today}"]`).click({ force: true })
  await expect(page.getByText('📝 บันทึกของวัน · Day context')).toBeVisible()

  await page.fill('textarea', 'เตรียมโจทย์บทที่ 5')
  await page.fill('input[placeholder*="Add item"]', 'ทบทวนสูตร')
  await tap(page.getByText('＋', { exact: true }).first())
  await expect(page.getByText('ทบทวนสูตร')).toBeVisible()
  // toggle the checklist item done → counter shows 1/1
  await tap(page.locator('button[aria-label="Toggle"]').first())
  await expect(page.getByText('1/1')).toBeVisible()

  await page.fill('input[placeholder*="Paste a URL"]', 'drive.google.com/mydoc')
  await tap(page.getByText('＋', { exact: true }).last())
  const link = page.locator('a', { hasText: 'drive.google.com' })
  await expect(link).toBeVisible()
  expect(await link.getAttribute('href')).toBe('https://drive.google.com/mydoc')

  // close the day sheet → the calendar marks the day with a note
  await page.mouse.click(195, 90)
  await expect(page.locator(`[data-day="${today}"][data-note="true"]`)).toBeVisible()

  // survives a reload (guest persistence)
  await page.reload(); await page.waitForLoadState('networkidle')
  await openPlan(page)
  await page.locator(`[data-day="${today}"]`).click({ force: true })
  await expect(page.getByText('เตรียมโจทย์บทที่ 5')).toBeVisible()
  await expect(page.getByText('ทบทวนสูตร')).toBeVisible()
  await expect(page.getByText('1/1')).toBeVisible()
})

test('copied template carries its day notes', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)

  // add a note to today, then publish the plan
  const today = await page.evaluate(() => new Date().getDate())
  await page.locator(`[data-day="${today}"]`).click({ force: true })
  await page.fill('textarea', 'บริบทที่แชร์ไป')
  await page.mouse.click(195, 90)
  await tap(page.getByText('เป้าหมาย', { exact: true }).last())
  await tap(page.getByText('📤 เผยแพร่สู่มาร์เก็ต · Publish to Explore'))
  await tap(page.getByText('เผยแพร่เลย 🚀'))
  await expect(page.getByText('Published to Explore')).toBeVisible()

  // back to home → Explore → copy the just-published plan
  await page.locator('button[aria-label="Back to plans"]').click({ force: true })
  await tap(page.getByText('🛍️ มาร์เก็ต · Explore'))
  await tap(page.getByText('โดย พิมพ์ชนก (You)').first())
  await tap(page.getByText('คัดลอกไปยังของฉัน'))
  await expect(page.locator('[data-day]').first()).toBeVisible()
  await page.locator(`[data-day="${today}"]`).click({ force: true })
  await expect(page.getByText('บริบทที่แชร์ไป')).toBeVisible()
})

test('delete plan asks for confirmation before deleting', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await waitForPlans(page)

  // scratch plan to delete
  await tap(page.locator('button[aria-label="New goal"]'))
  await page.fill('input[placeholder*="ติวสอบเข้ามหาลัย"]', 'ลบฉันที')
  await tap(page.getByText('สร้างเป้าหมาย · Create goal ✨'))
  await tap(page.getByText('เป้าหมาย', { exact: true }).last())
  await tap(page.getByText('แก้ไข', { exact: true }))
  await tap(page.getByText('🗑️ ลบแพลนนี้ · Delete plan'))

  // confirmation dialog — cancel keeps the plan
  await expect(page.getByText('ลบแพลนนี้?')).toBeVisible()
  await expect(page.getByText(/This can't be undone/)).toBeVisible()
  await tap(page.getByText('ยกเลิก', { exact: true }))
  await expect(page.getByText('ลบแพลนนี้?')).toHaveCount(0)

  // reopen and confirm → deleted
  await tap(page.getByText('🗑️ ลบแพลนนี้ · Delete plan'))
  await tap(page.getByText('ลบเลย · Delete'))
  await expect(page.getByText('Plan deleted')).toBeVisible()
  await expect(page.getByText('ลบฉันที')).toHaveCount(0)
  await expect(page.getByText('University Entrance Prep')).toBeVisible()
})
