// Tool (function-calling) definitions for the TutorSync agent + their executors.
//
// Read tools resolve against the compact `ctx` snapshot the client sends (which
// is exactly what the user sees), so answers are grounded in real, current data.
// Action tools don't mutate anything server-side — they return a structured
// `action` the client surfaces as a tappable suggestion (open a plan, pre-fill
// the booking sheet). The agent NEVER books or deletes on its own.

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_plans',
      description: 'ดูรายชื่อทุกแพลนของผู้ใช้พร้อมความคืบหน้าโดยสรุป (ชื่อ, ชนิดเป้าหมาย, %). ใช้เมื่อผู้ใช้ถามภาพรวมหรือไม่ได้ระบุแพลน.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_plan',
      description: 'ดูรายละเอียดแพลนหนึ่ง: งบใช้ไป/คงเหลือ, ชั่วโมง, จำนวนคาบต่อหมวดเทียบเป้า, วัน/คาบคงเหลือ. ถ้าไม่ระบุ planName จะใช้แพลนที่เปิดอยู่.',
      parameters: {
        type: 'object',
        properties: { planName: { type: 'string', description: 'ชื่อแพลน (บางส่วนก็ได้). เว้นว่างเพื่อใช้แพลนที่เปิดอยู่.' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_free_days',
      description: 'หาวันที่ยังไม่มีคาบเรียนในเดือนนี้ของแพลน เพื่อเสนอช่วงเวลาเรียนเพิ่ม. ใช้ก่อนเสนอจัดตาราง.',
      parameters: {
        type: 'object',
        properties: {
          planName: { type: 'string' },
          count: { type: 'integer', description: 'จำนวนวันว่างที่ต้องการ (ค่าเริ่มต้น 5)' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_plan',
      description: 'เสนอให้เปิด/ไปยังแพลนที่ระบุในหน้าจอ (ผู้ใช้กดยืนยันเอง). ใช้เมื่อผู้ใช้อยากดูแพลนนั้น.',
      parameters: {
        type: 'object',
        properties: { planName: { type: 'string' } },
        required: ['planName'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prefill_booking',
      description: 'เสนอคาบเรียนโดยเปิดฟอร์มจองที่กรอกไว้ให้แล้ว (ผู้ใช้กดยืนยันเอง ไม่ได้จองอัตโนมัติ). ใช้เมื่อจะเสนอเพิ่มคาบ.',
      parameters: {
        type: 'object',
        properties: {
          planName: { type: 'string' },
          subject: { type: 'string', description: 'ชื่อหมวด/วิชา (อังกฤษหรือไทย) — จะจับคู่กับหมวดในแพลน' },
          day: { type: 'integer', description: 'วันที่ในเดือน (1–31)' },
          time: { type: 'string', description: "ช่วงเวลา เช่น '17:00–19:00'" },
          hours: { type: 'number' },
        },
        required: ['subject'],
        additionalProperties: false,
      },
    },
  },
]

const norm = (s) => String(s || '').toLowerCase().trim()

function pickPlan(ctx, planName) {
  const plans = (ctx && ctx.plans) || []
  if (!plans.length) return null
  if (!planName) return plans.find((p) => p.name === ctx.activePlanName) || plans[0]
  const q = norm(planName)
  return (
    plans.find((p) => norm(p.name) === q) ||
    plans.find((p) => norm(p.name).includes(q) || norm(p.en).includes(q)) ||
    plans.find((p) => (p.categories || []).some((c) => norm(c.en).includes(q) || norm(c.th).includes(q))) ||
    null
  )
}

function planSummary(p) {
  return {
    name: p.name, goalType: p.goalType, progressPct: p.pct,
    budget: p.goalType === 'budget' ? { spent: p.spent, total: p.budgetTotal, left: Math.max(0, p.budgetTotal - p.spent) } : undefined,
    hours: p.goalType === 'hours' ? { done: p.hours, goal: p.hoursGoal } : undefined,
    daysLeft: p.goalType === 'window' ? p.daysLeft : undefined,
  }
}

// Execute one tool call. Returns { result, action? }.
// `result` is JSON returned to the model; `action` (if any) is forwarded to the client.
export function executeTool(name, args, ctx) {
  switch (name) {
    case 'list_plans': {
      const plans = (ctx.plans || []).map(planSummary)
      return { result: { plans, activePlan: ctx.activePlanName || null } }
    }
    case 'get_plan': {
      const p = pickPlan(ctx, args.planName)
      if (!p) return { result: { error: 'ไม่พบแพลนนี้', available: (ctx.plans || []).map((x) => x.name) } }
      const categories = (p.categories || []).map((c) => ({
        subject: c.en, th: c.th, count: c.count, target: c.target,
        left: Math.max(0, (c.target || 0) - c.count), ratePerHour: c.rate || 0,
      }))
      const lagging = [...categories].sort((a, b) => (a.count / (a.target || 1)) - (b.count / (b.target || 1))).slice(0, 2).map((c) => c.subject)
      return {
        result: {
          name: p.name, goalType: p.goalType, progressPct: p.pct, ...planSummary(p),
          totalSessions: p.count, categories, laggingCategories: lagging,
          upcoming: (p.upcoming || []).slice(0, 8),
        },
      }
    }
    case 'find_free_days': {
      const p = pickPlan(ctx, args.planName)
      if (!p) return { result: { error: 'ไม่พบแพลนนี้' } }
      const want = Math.max(1, Math.min(10, args.count || 5))
      const busy = new Set((p.upcoming || []).map((s) => s.day))
      const dim = ctx.today?.daysInMonth || 30
      const startDay = ctx.today?.date || 1
      const free = []
      for (let d = startDay; d <= dim && free.length < want; d++) if (!busy.has(d)) free.push(d)
      return { result: { plan: p.name, freeDays: free, month: ctx.today?.monthLabel } }
    }
    case 'open_plan': {
      const p = pickPlan(ctx, args.planName)
      if (!p) return { result: { error: 'ไม่พบแพลนนี้', available: (ctx.plans || []).map((x) => x.name) } }
      return { result: { ok: true, opening: p.name }, action: { type: 'open_plan', planId: p.id, planName: p.name } }
    }
    case 'prefill_booking': {
      const p = pickPlan(ctx, args.planName)
      if (!p) return { result: { error: 'ไม่พบแพลนนี้' } }
      const q = norm(args.subject)
      const cat = (p.categories || []).find((c) => norm(c.en) === q || norm(c.th) === q) ||
        (p.categories || []).find((c) => norm(c.en).includes(q) || norm(c.th).includes(q)) ||
        (p.categories || [])[0]
      if (!cat) return { result: { error: 'แพลนนี้ยังไม่มีหมวดให้จอง' } }
      const action = {
        type: 'prefill_session', planId: p.id, planName: p.name,
        subjKey: cat.key, subject: cat.en,
        day: args.day || ctx.today?.date || 1,
        time: args.time || '17:00–19:00',
        hours: args.hours || 2,
      }
      return { result: { ok: true, prefilled: { plan: p.name, subject: cat.en, day: action.day, time: action.time, hours: action.hours } }, action }
    }
    default:
      return { result: { error: `unknown tool ${name}` } }
  }
}
