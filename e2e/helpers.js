// Shared journey helpers. Buttons with the ts-bob keyframe animation are never
// "stable" for Playwright's actionability check, so taps use force: true.
export const tap = (locator) => locator.click({ force: true })

// Pre-authenticated session: skips the auth overlay AND onboarding (both are
// derived from ts_session at mount). Auth/onboarding journeys don't use this.
export async function seedSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ts_session', 'e2e@tutorsync.app')
  })
}

export async function gotoApp(page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

// Walks the real auth flow: email → demo OTP shown in the UI → verified.
export async function signIn(page, email = 'e2e@tutorsync.app') {
  await page.fill('input[type="email"]', email)
  await tap(page.getByText('Send code'))
  const body = await page.locator('body').innerText()
  const code = body.match(/demo code:\s*(\d{6})/)[1]
  await page.fill('input[inputmode="numeric"]', code)
  await page.waitForTimeout(600)
}

export async function todayDate(page) {
  return page.evaluate(() => new Date().getDate())
}

// Waits out the 850ms home-screen loading shimmer.
export async function waitForPlans(page) {
  await page.getByText('University Entrance Prep').first().waitFor({ timeout: 5000 })
}
