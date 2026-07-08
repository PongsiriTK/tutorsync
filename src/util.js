// sx('css: string') → React style object. The design file authors styles as
// CSS strings with interpolations; parsing keeps the port 1:1 with the source.
const cache = new Map()

export function sx(str) {
  if (!str) return undefined
  let obj = cache.get(str)
  if (obj) return obj
  obj = {}
  for (const decl of String(str).split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (!prop || !val) continue
    let key
    if (prop.startsWith('--')) key = prop
    else if (prop.startsWith('-webkit-')) key = 'Webkit' + camel(prop.slice(8), true)
    else key = camel(prop, false)
    obj[key] = val
  }
  if (cache.size < 4000) cache.set(str, obj)
  return obj
}

function camel(prop, capFirst) {
  const s = prop.replace(/-(\w)/g, (_, c) => c.toUpperCase())
  return capFirst ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export const fmt = (n) => (n || 0).toLocaleString('en-US')
