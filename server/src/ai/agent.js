// The agentic loop: talks to MaxPlus AI (GLM 5.2, OpenAI-compatible), runs any
// tool calls against the request context, and returns a grounded final reply
// plus any UI actions the client should offer.
//
// Two provider quirks handled here (verified against the live API):
//  1. GLM 5.2 is a reasoning model — responses carry `reasoning_content` and
//     spend tokens on it, so max_tokens must be generous and we strip reasoning.
//  2. tool_call `arguments` sometimes arrive malformed, e.g. `"{}{\"x\":1}"`
//     (a stray empty object prefixed). parseToolArgs() recovers the real object.

import { buildSystemPrompt } from './prompt.js'
import { TOOLS, executeTool } from './tools.js'

const BASE_URL = process.env.MAXPLUS_BASE_URL || 'https://api.maxplus-ai.cc/deepseek/v1'
const MODEL = process.env.MAXPLUS_MODEL || 'glm-5.2'
const MAX_STEPS = 4
const MAX_TOKENS = 1800
const TEMPERATURE = 0.3
const TIMEOUT_MS = 60000
const MAX_HISTORY = 10 // trailing chat turns sent to the model

export function aiConfigured() {
  return !!process.env.MAXPLUS_API_KEY
}

// Recover a tool-call argument object from the (sometimes malformed) string.
export function parseToolArgs(raw) {
  if (raw == null || raw === '') return {}
  if (typeof raw === 'object') return raw
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === 'object' && !Array.isArray(v)) return v
  } catch { /* fall through to brace scan */ }
  // Extract every top-level {...} block; take the last non-empty one.
  const objs = []
  let depth = 0, start = -1, inStr = false, esc = false
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === '{') { if (depth === 0) start = i; depth++ }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) { objs.push(raw.slice(start, i + 1)); start = -1 } }
  }
  for (let i = objs.length - 1; i >= 0; i--) {
    try { const v = JSON.parse(objs[i]); if (v && typeof v === 'object' && Object.keys(v).length) return v } catch { /* keep scanning */ }
  }
  return {}
}

async function callModel(messages, { tools } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const body = { model: MODEL, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, messages }
    if (tools) { body.tools = TOOLS; body.tool_choice = 'auto' }
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MAXPLUS_API_KEY}` },
      body: JSON.stringify(body),
      signal: ctl.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`maxplus ${res.status}: ${text.slice(0, 200)}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// Map the client's chat history to OpenAI messages (trailing window only).
function historyMessages(messages) {
  return (messages || [])
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.isAi ? 'assistant' : 'user', content: m.text }))
}

// Run the agent. Returns { reply, actions, usage, model }.
export async function runAgent(messages, ctx) {
  const convo = [{ role: 'system', content: buildSystemPrompt(ctx) }, ...historyMessages(messages)]
  const actions = []
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  const addUsage = (u) => { if (u) for (const k of Object.keys(usage)) usage[k] += u[k] || 0 }

  for (let step = 0; step < MAX_STEPS; step++) {
    const lastStep = step === MAX_STEPS - 1
    const data = await callModel(convo, { tools: !lastStep }) // final step forces a text answer
    addUsage(data.usage)
    const msg = (data.choices && data.choices[0] && data.choices[0].message) || {}
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : []

    if (!calls.length) {
      return { reply: (msg.content || '').trim() || 'ขออภัยค่ะ ตอนนี้ยังตอบไม่ได้ ลองใหม่อีกครั้งนะคะ', actions, usage, model: MODEL }
    }

    // Echo the assistant turn (with cleaned args) then append each tool result.
    const cleaned = calls.map((c, i) => ({
      id: c.id || `call_${step}_${i}`,
      type: 'function',
      function: { name: c.function?.name, arguments: JSON.stringify(parseToolArgs(c.function?.arguments)) },
    }))
    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: cleaned })
    for (const c of cleaned) {
      const args = parseToolArgs(c.function.arguments)
      const { result, action } = executeTool(c.function.name, args, ctx)
      if (action) actions.push(action)
      convo.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) })
    }
  }

  // Exhausted steps without a plain answer — one last forced text turn.
  const data = await callModel(convo, { tools: false })
  addUsage(data.usage)
  const msg = (data.choices && data.choices[0] && data.choices[0].message) || {}
  return { reply: (msg.content || '').trim() || 'สรุปให้ไม่ทันค่ะ ลองถามใหม่อีกครั้งนะคะ 💛', actions, usage, model: MODEL }
}
