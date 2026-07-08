import { test, expect } from '@playwright/test'
import { tap, seedSession, gotoApp, signIn, waitForPlans, todayDate } from './helpers.js'

const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

const navCal = (page) => tap(page.getByText('ปฏิทิน', { exact: true }))
const navGoals = (page) => tap(page.getByText('เป้าหมาย', { exact: true }).last())
const navTeam = (page) => tap(page.getByText('ทีม', { exact: true }))
const navAI = (page) => tap(page.getByText('ผู้ช่วย', { exact: true }))

test.describe('auth', () => {
  test('validation, wrong OTP, resend, change email, verify', async ({ page }) => {
    await gotoApp(page)
    await expect(page.getByText('Sign in to TutorSync')).toBeVisible()

    // invalid email rejected
    await page.fill('input[type="email"]', 'not-an-email')
    await tap(page.getByText('Send code'))
    await expect(page.getByText('Enter a valid email')).toBeVisible()

    // valid email → OTP step with demo code
    await page.fill('input[type="email"]', 'nadia@tutorsync.app')
    await tap(page.getByText('Send code'))
    await expect(page.getByText('ใส่โค้ดยืนยัน')).toBeVisible()
    const body = await page.locator('body').innerText()
    const code = body.match(/demo code:\s*(\d{6})/)[1]

    // wrong OTP rejected
    const wrong = code === '000000' ? '111111' : '000000'
    await page.fill('input[inputmode="numeric"]', wrong)
    await expect(page.getByText('Incorrect code')).toBeVisible()

    // resend keeps you on OTP step, error cleared
    await tap(page.getByText('ส่งโค้ดอีกครั้ง'))
    await expect(page.getByText('ใส่โค้ดยืนยัน')).toBeVisible()

    // change email returns to email step (address kept)
    await tap(page.getByText('← เปลี่ยนอีเมล'))
    await expect(page.getByText('Sign in to TutorSync')).toBeVisible()

    // full sign-in
    await signIn(page, 'nadia@tutorsync.app')
    await expect(page.getByText('หลายเป้าหมาย หลายปฏิทิน ในที่เดียว')).toBeVisible() // onboarding follows
  })
})

test.describe('onboarding', () => {
  test('3 steps capture name + first goal and pre-open create sheet', async ({ page }) => {
    await gotoApp(page)
    await signIn(page)

    await expect(page.getByText('1 เป้าหมาย = 1 ปฏิทิน')).toBeVisible()
    await tap(page.getByText('ต่อไป · Next'))

    await expect(page.getByText('What should we call you?')).toBeVisible()
    await page.fill('input[placeholder*="Your name"]', 'Nadia')
    await tap(page.getByText('ต่อไป · Next'))

    await expect(page.getByText('Pick your first goal')).toBeVisible()
    await tap(page.getByText('ดนตรี', { exact: true }))
    await tap(page.getByText('เริ่มเลย'))

    // create sheet pre-opened, seeded from the "music" template (sessions type)
    await expect(page.getByText('เป้าหมายใหม่ 🎯')).toBeVisible()
    await expect(page.getByText('20 คาบ').first()).toBeVisible()
    await page.fill('input[placeholder*="ติวสอบเข้ามหาลัย"]', 'เปียโนของฉัน')
    await tap(page.getByText('สร้างเป้าหมาย · Create goal ✨'))
    await expect(page.locator('[data-day]').first()).toBeVisible()

    // captured name shows in settings profile
    await tap(page.locator('button[aria-label="Settings"]'))
    await expect(page.getByText('Nadia', { exact: true })).toBeVisible()
  })

  test('skip goes straight to home', async ({ page }) => {
    await gotoApp(page)
    await signIn(page)
    await tap(page.getByText('ข้ามไปก่อน · Skip'))
    await waitForPlans(page)
    await expect(page.getByText('Summer Shred Plan')).toBeVisible()
  })
})

test.describe('calendar & booking', () => {
  test('month nav, up-next, day sheet, booking with cost preview + confirmation', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))

    // month navigation
    const mIdx = await page.evaluate(() => new Date().getMonth())
    await expect(page.getByText(MONTHS_TH[mIdx], { exact: true })).toBeVisible()
    await tap(page.locator('button[aria-label="Next month"]'))
    await expect(page.getByText(MONTHS_TH[(mIdx + 1) % 12], { exact: true })).toBeVisible()
    await tap(page.locator('button[aria-label="Previous month"]'))
    await expect(page.getByText(MONTHS_TH[mIdx], { exact: true })).toBeVisible()

    // up-next card opens the day sheet
    await expect(page.getByText(/UP NEXT|TODAY|TOMORROW|IN \d+ DAYS/)).toBeVisible()
    await tap(page.getByText(/UP NEXT|TODAY|TOMORROW|IN \d+ DAYS/))
    await expect(page.getByText('＋ เพิ่มคาบ · Add session')).toBeVisible()

    // booking with live budget preview (Uni Prep = budget goal, MATH ฿270/hr)
    await tap(page.getByText('＋ เพิ่มคาบ · Add session'))
    await expect(page.getByText('เพิ่มคาบ ✏️')).toBeVisible()
    await expect(page.getByText('ค่าใช้จ่ายคาบนี้ · Cost')).toBeVisible()
    await expect(page.getByText('฿540', { exact: true })).toBeVisible() // 2h × 270
    // hours stepper "+" sits in the row showing "2 ชม."
    await tap(page.getByText(/^\d+ ชม\.$/).locator('..').locator('button').last())
    await expect(page.getByText('฿810', { exact: true })).toBeVisible() // 3h × 270

    await tap(page.getByText('บันทึกคาบ · Book session 🎉'))
    await expect(page.getByText('Added to your calendar')).toBeVisible()
    await tap(page.getByText('ดูวันนั้น · View day 🗓️'))
    await expect(page.getByText('＋ เพิ่มคาบ · Add session')).toBeVisible()
  })

  test('fitness plan booking exposes intensity, sets and reps', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('Summer Shred Plan'))
    await tap(page.locator('button[aria-label="Add session"]'))
    await expect(page.getByText('Intensity 🔥')).toBeVisible()
    await expect(page.getByText('เซ็ต · Sets')).toBeVisible()
    await tap(page.getByText('หนัก', { exact: true }))
    await tap(page.getByText('บันทึกคาบ · Book session 🎉'))
    await expect(page.getByText('Added to your calendar')).toBeVisible()
    await tap(page.getByText('ดูวันนั้น · View day 🗓️'))
    // open the newly booked slot → fitness stats visible
    await tap(page.locator('button', { hasText: '›' }).last())
    await expect(page.getByText('เซ็ต · SETS')).toBeVisible()
    await expect(page.getByText('ครั้ง · REPS')).toBeVisible()
  })

  test('slot detail: reactions toggle, comments, reschedule', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))

    const source = page.locator('[data-day][data-has="true"]').first()
    await tap(source)
    await tap(page.locator('button', { hasText: '17:00–19:00' }).last())
    await expect(page.getByText('รีแอคชัน · React')).toBeVisible()

    // add a reaction from the palette → appears as an active chip with count
    await tap(page.getByText('💪', { exact: true }))
    await expect(page.locator('button', { hasText: '💪' }).first()).toContainText('1')

    // comment
    await page.fill('input[placeholder*="เขียนคอมเมนต์"]', 'สู้ๆ นะคะ!')
    await tap(page.getByText('ส่ง', { exact: true }))
    await expect(page.getByText('สู้ๆ นะคะ!')).toBeVisible()

    // reschedule to day 25
    await tap(page.getByText('ย้ายวัน · Reschedule'))
    await expect(page.getByText('ย้ายไปวันไหน? 🗓️')).toBeVisible()
    await tap(page.locator('button', { hasText: /^25$/ }).last())
    await expect(page.getByText('Rescheduled!')).toBeVisible()
  })

  test('drag a day onto another day moves its sessions after confirm', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))
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
    await expect(page.locator(`[data-day="${src.day}"]`)).toHaveAttribute('data-has', 'false')
  })
})

test.describe('goals & plan management', () => {
  test('goals dashboard, momentum strip, edit target', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))
    await navGoals(page)

    await expect(page.getByText('TOTAL FUNDING')).toBeVisible()
    await expect(page.getByText('Last 7 days')).toBeVisible()
    await expect(page.getByText(/สตรีค \d+ วัน|เริ่มสตรีค/)).toBeVisible()

    await tap(page.locator('button[aria-label="Edit target"]'))
    await tap(page.getByText('฿30k', { exact: true }))
    await tap(page.getByText('บันทึก · Save target'))
    await expect(page.getByText('ใช้จาก ฿30,000')).toBeVisible()
  })

  test('assign a category to a teammate — English taught by Ms. Lisa', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))

    // before: legend shows English taught by Kru Mai; team has no Ms. Lisa
    await expect(page.getByText('English · Kru Mai · ฿250/hr')).toBeVisible()
    await navTeam(page)
    await expect(page.getByText('IELTS coach')).toHaveCount(0)

    // assign via plan settings → English card → tutor chip "Ms. Lisa" (4th category card)
    await navGoals(page)
    await tap(page.getByText('แก้ไข', { exact: true }))
    await expect(page.getByText('ตั้งค่าแพลน ⚙️')).toBeVisible()
    await expect(page.getByText('ผู้สอน · Taught by').first()).toBeVisible()
    await tap(page.locator('button', { hasText: 'Ms. Lisa' }).nth(3))
    await tap(page.getByText('บันทึกการตั้งค่า · Save changes ✨'))
    await expect(page.getByText('Plan updated!')).toBeVisible()

    // after: team roster now includes Ms. Lisa with her role & rate
    await navTeam(page)
    await expect(page.getByText('ครูลิซ่า')).toBeVisible()
    await expect(page.getByText('IELTS coach')).toBeVisible()
    await expect(page.getByText('฿600/hr')).toBeVisible()

    // legend reflects the new instructor
    await navCal(page)
    await expect(page.getByText('English · Ms. Lisa · ฿250/hr')).toBeVisible()
  })

  test('plan edit: rename, add + remove category, delete a scratch plan', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)

    // scratch plan so seeded data stays intact
    await tap(page.locator('button[aria-label="New goal"]'))
    await page.fill('input[placeholder*="ติวสอบเข้ามหาลัย"]', 'แพลนทดลอง')
    await tap(page.getByText('สร้างเป้าหมาย · Create goal ✨'))
    await navGoals(page)

    await tap(page.getByText('แก้ไข', { exact: true }))
    const nameInput = page.locator('input').first()
    await nameInput.fill('แพลนทดลอง v2')
    await tap(page.getByText('＋ เพิ่ม'))
    await expect(page.locator('button[aria-label="Remove"]')).toHaveCount(2)
    await tap(page.locator('button[aria-label="Remove"]').last())
    await expect(page.locator('button[aria-label="Remove"]')).toHaveCount(1)
    await tap(page.getByText('บันทึกการตั้งค่า · Save changes ✨'))
    await expect(page.getByText('แพลนทดลอง v2')).toBeVisible()

    // delete the scratch plan
    await tap(page.getByText('แก้ไข', { exact: true }))
    await tap(page.getByText('🗑️ ลบแพลนนี้ · Delete plan'))
    await expect(page.getByText('Plan deleted')).toBeVisible()
    await expect(page.getByText('แพลนทดลอง v2')).toHaveCount(0)
    await expect(page.getByText('University Entrance Prep')).toBeVisible()
  })
})

test.describe('market & publish', () => {
  test('search, filter, like, copy a template', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('🛍️ มาร์เก็ต · Explore'))

    // Thai search narrows results
    await page.fill('input[placeholder*="search templates"]', 'มาราธอน')
    await expect(page.getByText('Half-Marathon in 12 Weeks')).toBeVisible()
    await expect(page.getByText('TCAS Math Crash Course')).toHaveCount(0)
    await page.fill('input[placeholder*="search templates"]', 'ไม่มีอยู่จริง')
    await expect(page.getByText('ไม่พบแพลนที่ค้นหา')).toBeVisible()
    await page.fill('input[placeholder*="search templates"]', '')

    // category filter
    await tap(page.getByText('💪 ฟิตเนส'))
    await expect(page.getByText('Half-Marathon in 12 Weeks')).toBeVisible()
    await expect(page.getByText('Piano for Beginners')).toHaveCount(0)
    await tap(page.getByText('✨ ทั้งหมด'))

    // like + copy
    await tap(page.getByText('Piano for Beginners'))
    await expect(page.getByText('Copy to my plans')).toBeVisible()
    await tap(page.getByText('❤️ ถูกใจ'))
    await expect(page.getByText('❤️ 199').first()).toBeVisible() // 198 + 1
    await tap(page.getByText('คัดลอกไปยังของฉัน'))
    await expect(page.locator('[data-day]').first()).toBeVisible()
    await tap(page.locator('button[aria-label="Back to plans"]'))
    await expect(page.getByText('เปียโนสำหรับมือใหม่')).toBeVisible()
  })

  test('publish my plan into Explore', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))
    await navGoals(page)
    await tap(page.getByText('📤 เผยแพร่สู่มาร์เก็ต · Publish to Explore'))
    await tap(page.getByText('เผยแพร่เลย 🚀'))
    await expect(page.getByText('Published to Explore')).toBeVisible()

    await tap(page.locator('button[aria-label="Back to plans"]'))
    await tap(page.getByText('🛍️ มาร์เก็ต · Explore'))
    await expect(page.getByText('โดย พิมพ์ชนก (You)')).toBeVisible()
  })
})

test.describe('team & assistant', () => {
  test('team roster + invite toast; AI answers from plan data', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.getByText('University Entrance Prep'))
    await navTeam(page)

    await expect(page.getByText('เจ้าของ', { exact: true })).toBeVisible()
    await expect(page.getByText('ครูแนน')).toBeVisible()
    await tap(page.getByText('🔗 คัดลอกลิงก์เชิญ · Copy invite link'))
    await expect(page.getByText('Invite link copied!')).toBeVisible()

    await navAI(page)
    await tap(page.getByText('💸 งบพอไหม?'))
    await expect(page.getByText(/ใช้ไป ฿[\d,]+ จากงบ/)).toBeVisible({ timeout: 5000 })
    await page.fill('input[placeholder*="ask me anything"]', 'หมวดไหนยังขาด')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/ที่ยังตามเป้าไม่ทัน/)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('settings & persistence', () => {
  test('theme accent, toggles, replay intro, reset demo, sign out', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)

    await tap(page.locator('button[aria-label="Settings"]'))
    await expect(page.getByText('ธีมสี · App accent')).toBeVisible()

    // switch accent to mint → FAB adopts the mint primary color
    // (plain click: waits for the sheet's entry animation to settle)
    const swatches = page.getByText('ธีมสี · App accent').locator('xpath=following-sibling::div[1]').locator('button')
    await swatches.nth(2).click() // mint
    await page.mouse.click(195, 60) // close sheet via scrim
    const fabBg = await page.locator('button[aria-label="New goal"]').evaluate((el) => el.style.background)
    expect(fabBg).toContain('79, 199, 168') // #4FC7A8

    // replay intro
    await tap(page.locator('button[aria-label="Settings"]'))
    await tap(page.getByText('ดูวิธีใช้อีกครั้ง · Replay intro'))
    await expect(page.getByText('1 เป้าหมาย = 1 ปฏิทิน')).toBeVisible()
    await tap(page.getByText('ข้ามไปก่อน · Skip'))

    // reset demo
    await tap(page.locator('button[aria-label="Settings"]'))
    await tap(page.getByText('🧹 รีเซ็ตข้อมูลเดโม · Reset demo data'))
    await expect(page.getByText('Demo data reset')).toBeVisible()

    // sign out returns to auth
    await tap(page.locator('button[aria-label="Settings"]'))
    await tap(page.getByText('🚪 ออกจากระบบ · Sign out'))
    await expect(page.getByText('Sign in to TutorSync')).toBeVisible()
  })

  test('created plan and theme survive a reload', async ({ page }) => {
    await seedSession(page)
    await gotoApp(page)
    await waitForPlans(page)
    await tap(page.locator('button[aria-label="New goal"]'))
    await page.fill('input[placeholder*="ติวสอบเข้ามหาลัย"]', 'แพลนถาวร')
    await tap(page.getByText('สร้างเป้าหมาย · Create goal ✨'))
    await expect(page.locator('[data-day]').first()).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await waitForPlans(page)
    await expect(page.getByText('แพลนถาวร')).toBeVisible()
  })
})
