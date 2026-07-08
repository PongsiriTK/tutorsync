import { test, expect } from '@playwright/test'
import { tap, seedSession, gotoApp, waitForPlans, todayDate } from './helpers.js'

// Desktop (≥1024px) journeys: sidebar shell, grid layouts, modal sheets.

async function openPlan(page, name = 'University Entrance Prep') {
  await waitForPlans(page)
  await tap(page.getByText(name))
  await expect(page.getByText('· Calendar')).toBeVisible()
}

test('sidebar shell: brand, tabs, plan chip, legend rail, grids', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)

  // sidebar with brand + home nav; mobile segmented control is gone
  await expect(page.getByText('ทุกเป้าหมายมีปฏิทินของตัวเอง')).toBeVisible()
  await expect(page.getByText('· My plans')).toBeVisible()
  await expect(page.getByText('🎯 ของฉัน · Mine')).toHaveCount(0)

  await openPlan(page)
  // plan identity chip + tab nav in sidebar; legend rail beside calendar
  await expect(page.getByText('← แพลนของฉัน · All plans')).toBeVisible()
  await expect(page.getByText('หมวดหมู่ · Categories')).toBeVisible()
  await expect(page.locator('[data-day]').first()).toBeVisible()

  // sidebar tab navigation
  await tap(page.getByText('· Goals'))
  await expect(page.getByText('TOTAL FUNDING')).toBeVisible()
  await expect(page.getByText('Last 7 days')).toBeVisible()
  await tap(page.getByText('· Team'))
  await expect(page.getByText('Copy invite link')).toBeVisible()
  await tap(page.getByText('· Assistant'))
  await expect(page.locator('input[placeholder*="ask me anything"]')).toBeVisible()
})

test('booking via sidebar CTA renders as centered modal', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)

  await tap(page.getByText('จองคาบ · Book session'))
  await expect(page.getByText('เพิ่มคาบ ✏️')).toBeVisible()
  // modal, not full-width sheet: the save CTA is horizontally inset
  const bb = await page.getByText('บันทึกคาบ · Book session 🎉').boundingBox()
  expect(bb.x).toBeGreaterThan(300)
  expect(bb.x + bb.width).toBeLessThan(1200)

  await tap(page.getByText('บันทึกคาบ · Book session 🎉'))
  await expect(page.getByText('Added to your calendar')).toBeVisible()
  await tap(page.getByText('เสร็จสิ้น'))
})

test('assign category to a teammate via desktop modal', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)

  await tap(page.getByText('· Goals'))
  await tap(page.getByText('แก้ไข', { exact: true }))
  await expect(page.getByText('ตั้งค่าแพลน ⚙️')).toBeVisible()

  // assign Chemistry (3rd category) to Coach Bank
  await tap(page.locator('button', { hasText: 'Coach Bank' }).nth(2))
  await tap(page.getByText('บันทึกการตั้งค่า · Save changes ✨'))
  await expect(page.getByText('Plan updated!')).toBeVisible()

  await tap(page.getByText('· Team'))
  await expect(page.getByText('โค้ชแบงค์')).toBeVisible()
  await expect(page.getByText('เทรนเนอร์ · Trainer')).toBeVisible()

  await tap(page.getByText('· Calendar'))
  await expect(page.getByText('Chemistry · Coach Bank · ฿280/hr')).toBeVisible()
})

test('drag a day to move sessions with a mouse', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await openPlan(page)
  await page.waitForTimeout(400)

  const today = await todayDate(page)
  const days = await page.locator('[data-day]').evaluateAll((els) =>
    els.map((el) => ({ day: el.getAttribute('data-day'), has: el.getAttribute('data-has') })))
  const src = days.find((d) => d.has === 'true' && Number(d.day) !== today)
  const dst = days.find((d) => d.has === 'false' && d.day && Number(d.day) !== today)
  const srcBox = await page.locator(`[data-day="${src.day}"]`).boundingBox()
  const dstBox = await page.locator(`[data-day="${dst.day}"]`).boundingBox()

  await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(srcBox.x + srcBox.width / 2 + 12, srcBox.y + srcBox.height / 2 + 12)
  await page.mouse.move(dstBox.x + dstBox.width / 2, dstBox.y + dstBox.height / 2, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText('ย้ายคาบเรียน?')).toBeVisible()
  await tap(page.getByText('ย้ายเลย ✨'))
  await expect(page.locator(`[data-day="${dst.day}"]`)).toHaveAttribute('data-has', 'true')
})

test('explore grid: search + copy; settings modal', async ({ page }) => {
  await seedSession(page)
  await gotoApp(page)
  await waitForPlans(page)

  await tap(page.getByText('· Explore'))
  await page.fill('input[placeholder*="search templates"]', 'Piano')
  await expect(page.getByText('Piano for Beginners')).toBeVisible()
  await expect(page.getByText('Half-Marathon in 12 Weeks')).toHaveCount(0)
  await tap(page.getByText('Piano for Beginners'))
  await tap(page.getByText('คัดลอกไปยังของฉัน'))
  await expect(page.locator('[data-day]').first()).toBeVisible()

  await tap(page.locator('button[aria-label="Settings"]').first())
  await expect(page.getByText('ธีมสี · App accent')).toBeVisible()
})
