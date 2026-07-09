// Email delivery of OTP codes via Resend (https://resend.com).
//
// Enabled when RESEND_API_KEY is set (Bun auto-loads server/.env). Without it,
// /auth/request falls back to returning the code in the response so the demo
// stays usable. TS_MAIL_FAKE=1 pretends to send (for tests/UX preview) without
// calling Resend. Sending to arbitrary recipients requires a Resend-verified
// domain in TS_MAIL_FROM; the default onboarding@resend.dev only reaches the
// Resend account owner's own address.

const RESEND_URL = 'https://api.resend.com/emails'

export const mailConfigured = () => !!process.env.RESEND_API_KEY || process.env.TS_MAIL_FAKE === '1'
const mailFrom = () => process.env.TS_MAIL_FROM || 'TutorSync 🗓️ <onboarding@resend.dev>'

function otpHtml(code) {
  const boxed = String(code).split('').map((d) => `<span style="display:inline-block;min-width:34px;padding:12px 0;margin:0 3px;background:#FFF3EC;border-radius:12px;font-size:26px;font-weight:800;color:#4A3F55;font-family:'Baloo Thai 2',Arial,sans-serif;">${d}</span>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#FDEFF6;padding:32px 16px;font-family:'Nunito',Arial,sans-serif;color:#4A3F55;">
    <div style="max-width:440px;margin:0 auto;background:#fff;border-radius:24px;padding:32px 28px;box-shadow:0 12px 40px rgba(180,120,150,.18);text-align:center;">
      <div style="font-size:40px;">🗓️</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px;">TutorSync</div>
      <div style="font-size:14px;font-weight:700;color:#B0A4BC;margin-top:2px;">รหัสเข้าสู่ระบบของคุณ · Your sign-in code</div>
      <div style="margin:22px 0 8px;">${boxed}</div>
      <div style="font-size:13px;font-weight:700;color:#8A7C93;line-height:1.5;">ใส่รหัส 6 หลักนี้เพื่อเข้าสู่ระบบ<br/>Enter this 6-digit code to sign in. It expires in 10 minutes.</div>
      <div style="font-size:11.5px;font-weight:700;color:#C6B6D0;margin-top:20px;">ถ้าคุณไม่ได้ขอรหัสนี้ ข้ามอีเมลนี้ได้เลย · If you didn't request this, ignore this email.</div>
    </div>
  </body></html>`
}
const otpText = (code) => `TutorSync sign-in code: ${code}\nรหัสเข้าสู่ระบบ TutorSync: ${code}\nEnter it to sign in. Expires in 10 minutes.`

// Returns true if the email was accepted for delivery, false otherwise.
export async function sendOtpEmail(to, code) {
  if (process.env.TS_MAIL_FAKE === '1') return true
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: mailFrom(), to: [to],
        subject: `รหัสเข้าสู่ระบบ TutorSync: ${code}`,
        html: otpHtml(code), text: otpText(code),
      }),
    })
    if (!res.ok) { console.warn('[mail] resend send failed', res.status, (await res.text().catch(() => '')).slice(0, 200)); return false }
    return true
  } catch (e) { console.warn('[mail] resend error', e && e.message); return false }
}
