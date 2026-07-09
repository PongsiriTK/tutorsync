import { catCost } from './data.js'

// Draft a starter schedule for a plan: spread each category's target number of
// sessions across the upcoming days of the current month, alternating
// categories and rotating time slots, while respecting a budget or hours cap.
// Used when copying a template (so the calendar isn't empty) and by the
// "auto-fill" action. Sessions come out 'confirmed' (a draft the user adjusts).
export function autoScheduleSessions(plan, { today, dim, startId = 1 }) {
  const cats = Object.entries(plan.categories || {})
  if (!cats.length) return []

  // desired count per category (bounded so we never overwhelm the month)
  const want = cats.map(([key, cat]) => ({ key, cat, n: Math.max(0, Math.min(cat.target || 0, 12)) }))
  let total = want.reduce((a, w) => a + w.n, 0)
  if (total === 0) { want.forEach((w) => { w.n = 3 }); total = want.length * 3 }
  total = Math.min(total, 24)

  // round-robin category order so subjects interleave
  const order = []
  const left = want.map((w) => w.n)
  let i = 0, placed = 0
  while (placed < total) {
    let tries = 0
    while (left[i] <= 0 && tries < want.length) { i = (i + 1) % want.length; tries++ }
    if (left[i] <= 0) break
    order.push(want[i]); left[i]--; placed++; i = (i + 1) % want.length
  }

  const budget = plan.goalType === 'budget' ? (plan.budgetTotal || Infinity) : Infinity
  const hoursGoal = plan.goalType === 'hours' ? (plan.hoursGoal || Infinity) : Infinity
  const hoursPer = plan.kind === 'fitness' ? 1 : 2
  const times = ['17:00–19:00', '15:00–17:00', '13:00–15:00', '09:00–11:00']

  const firstDay = Math.min(dim, today + 1)
  const lastDay = dim
  const span = Math.max(1, lastDay - firstDay)
  const step = Math.max(1, Math.floor(span / Math.max(1, order.length - 1 || 1)))

  const sessions = []
  let spent = 0, hours = 0, id = startId, day = firstDay, ti = 0, perDay = {}
  for (let k = 0; k < order.length; k++) {
    const { key, cat } = order[k]
    const cost = catCost(cat, hoursPer)
    if (plan.goalType === 'budget' && spent + cost > budget) break
    if (plan.goalType === 'hours' && hours + hoursPer > hoursGoal) break
    let d = Math.min(day, lastDay)
    // avoid piling too many on one day; nudge forward if already 2 there
    let guard = 0
    while ((perDay[d] || 0) >= 2 && d < lastDay && guard < dim) { d++; guard++ }
    perDay[d] = (perDay[d] || 0) + 1
    sessions.push({ id: id++, day: d, subj: key, time: times[ti % times.length], hours: hoursPer, cost, done: false, status: 'confirmed', reactions: {}, comments: [] })
    spent += cost; hours += hoursPer; ti++
    day = Math.min(lastDay, day + step)
  }
  return sessions
}
