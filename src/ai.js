import { catCost } from './data.js'
import { fmt } from './util.js'

// Local planning assistant: computes real answers from plan data so the demo
// works fully offline (no LLM API on the static deploy).
export function assistantReply(plan, metric, question) {
  if (!plan) {
    return 'ยังไม่ได้เปิดแพลนเลยค่ะ ลองเลือกเป้าหมายจากหน้าแรกก่อนนะคะ แล้วหนูจะช่วยวิเคราะห์ให้ 💛'
  }
  const q = (question || '').toLowerCase()
  const m = metric
  const cats = Object.entries(plan.categories).map(([key, c]) => {
    const count = plan.sessions.filter((s) => s.subj === key).length
    return { key, ...c, count, left: Math.max(0, (c.target || 0) - count) }
  })
  const lagging = [...cats].sort((a, b) => (a.count / (a.target || 1)) - (b.count / (b.target || 1)))

  const hasAny = (words) => words.some((w) => q.includes(w))

  // Budget questions
  if (hasAny(['งบ', 'budget', 'เงิน', 'ค่าใช้จ่าย', 'money', 'cost', 'พอไหม', 'afford'])) {
    const left = Math.max(0, plan.budgetTotal - m.spent)
    const paidCats = cats.filter((c) => c.rate > 0)
    const avgRate = paidCats.length ? Math.round(paidCats.reduce((a, c) => a + catCost(c, 2), 0) / paidCats.length) : 0
    const roughly = avgRate > 0 ? Math.floor(left / avgRate) : 0
    if (left <= 0) {
      return `ตอนนี้ใช้งบครบ ฿${fmt(m.spent)} จาก ฿${fmt(plan.budgetTotal)} แล้วค่ะ 😮 ถ้าจะเพิ่มคาบอีก แนะนำขยับงบใน "แก้ไขเป้าหมาย" หรือเลือกหมวดที่ฟรีนะคะ`
    }
    return `ใช้ไป ฿${fmt(m.spent)} จากงบ ฿${fmt(plan.budgetTotal)} — เหลือ ฿${fmt(left)} ค่ะ 💛 ` +
      (roughly > 0 ? `ถ้าคาบละ ~฿${fmt(avgRate)} จะจองได้อีกประมาณ ${roughly} คาบ กำลังพอดีกับเป้าเลยค่ะ ✨` : 'สบายมากค่ะ ยังจองต่อได้อีกเยอะเลย ✨')
  }

  // "What's lacking / behind" questions
  if (hasAny(['ขาด', 'น้อย', 'lack', 'behind', 'less', 'เทียบ', 'ยังไม่ครบ'])) {
    const worst = lagging.slice(0, 2)
    const lines = worst.map((c) => `${c.en} ${c.count}/${c.target} คาบ`).join(' และ ')
    return `ที่ยังตามเป้าไม่ทันคือ ${lines} ค่ะ 🎯 ลองจองเพิ่มสัปดาห์นี้สักหมวดละ 1–2 คาบ แล้วหนูจะช่วยดูงบให้อีกทีนะคะ`
  }

  // Scheduling suggestions
  if (hasAny(['จัด', 'แนะนำ', 'เพิ่มคาบ', 'suggest', 'plan', 'schedule', 'ควร'])) {
    const need = lagging.filter((c) => c.left > 0).slice(0, 3)
    if (!need.length) {
      return `ทุกหมวดครบเป้าแล้วค่ะ เก่งมาก! 🎉 ถ้าอยากไปต่อ ลองขยับเป้าใน "ตั้งค่าแพลน" หรือเผยแพร่แพลนนี้ให้เพื่อนๆ copy ได้เลยนะคะ`
    }
    const lines = need.map((c) => `• ${c.en}: อีก ${c.left} คาบ (${c.rate > 0 ? '฿' + fmt(c.rate) + '/hr' : 'ฟรี'})`).join('\n')
    return `จากเป้าหมายตอนนี้ แนะนำจองเพิ่มค่ะ 📅\n${lines}\nกดปุ่ม ＋ ตรงกลางเพื่อจองได้เลย เดี๋ยวงบหนูคำนวณให้อัตโนมัติค่ะ ✨`
  }

  // Hours questions
  if (hasAny(['ชั่วโมง', 'hour', 'เวลาเรียน'])) {
    const left = Math.max(0, plan.hoursGoal - m.hours)
    return `สะสมได้ ${m.hours} จาก ${plan.hoursGoal} ชั่วโมงแล้วค่ะ ⏱️ เหลืออีก ${left} ชม. ถ้าจองคาบละ 2 ชม. ก็อีกประมาณ ${Math.ceil(left / 2)} คาบเองค่ะ สู้ๆ นะคะ 💪`
  }

  // Deadline questions
  if (hasAny(['กำหนด', 'deadline', 'ทัน', 'วันสอบ', 'เหลือกี่วัน'])) {
    const leftDays = Math.max(0, plan.deadlineDays - plan.elapsedDays)
    const leftSess = Math.max(0, m.catTargets - m.count)
    const perWeek = leftDays > 0 ? Math.ceil(leftSess / Math.max(1, Math.floor(leftDays / 7))) : leftSess
    return `เหลืออีก ${leftDays} วันค่ะ (${plan.deadlineLabel}) 📆 ยังขาดอีก ${leftSess} คาบ — เฉลี่ยสัปดาห์ละ ${perWeek} คาบก็ทันสบายค่ะ ✨`
  }

  // Default: summary
  return `สรุปแพลน "${plan.name}" ให้นะคะ 💛 ใช้งบ ฿${fmt(m.spent)}/฿${fmt(plan.budgetTotal)} · สะสม ${m.hours}/${plan.hoursGoal} ชม. · จองแล้ว ${m.count} คาบ ` +
    `ตอนนี้หมวดที่ควรโฟกัสคือ ${lagging[0] ? lagging[0].en : '—'} ค่ะ ลองถามว่า "งบพอไหม" หรือ "จัดคาบให้" ได้เลยนะคะ ✨`
}
