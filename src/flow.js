// Flow parser — the inline forms.
//
// Handles `{a: 1, b: 2}`, `[x, y, z]`, `"quoted"`, and the brace-less implicit
// map used on a component line (`.btn a: 1, b: 2`). The same value grammar is
// reused by the indented block form, so the two spellings can never drift.
import coerceScalar from './scalar.js'

const flowParser = (s) => {
  let p = 0
  const len = s.length
  const skipWs = () => {
    while (p < len && (s[p] === ' ' || s[p] === '\t')) p++
  }

  const parseQuoted = () => {
    const q = s[p++]
    let out = ''
    while (p < len && s[p] !== q) {
      if (s[p] === '\\' && q === '"' && p + 1 < len) {
        p++
        out += s[p++]
        continue
      }
      out += s[p++]
    }
    p++ // closing quote
    return out
  }

  // a bare scalar runs until a structural delimiter — not `:`, so URLs survive
  const parseBare = () => {
    const start = p
    while (p < len && s[p] !== ',' && s[p] !== '}' && s[p] !== ']') p++
    return coerceScalar(s.slice(start, p).trim())
  }

  const parseKey = () => {
    skipWs()
    if (s[p] === '"' || s[p] === "'") return parseQuoted()
    const start = p
    while (p < len && s[p] !== ':' && s[p] !== ',' && s[p] !== '}') p++
    return s.slice(start, p).trim()
  }

  const parseValue = () => {
    skipWs()
    const c = s[p]
    if (c === '{') return parseMap(true)
    if (c === '[') return parseSeq()
    if (c === '"' || c === "'") return parseQuoted()
    return parseBare()
  }

  const parseMap = (braced) => {
    if (braced) p++ // consume {
    const obj = {}
    skipWs()
    if (braced && s[p] === '}') {
      p++
      return obj
    }
    while (p < len) {
      skipWs()
      if (p >= len || s[p] === '}') {
        if (s[p] === '}') p++
        break
      }
      const key = parseKey()
      skipWs()
      if (s[p] === ':') p++
      obj[key] = parseValue()
      skipWs()
      if (s[p] === ',') {
        p++
        continue
      }
      if (s[p] === '}') {
        p++
        break
      }
      break
    }
    return obj
  }

  const parseSeq = () => {
    p++ // consume [
    const arr = []
    skipWs()
    if (s[p] === ']') {
      p++
      return arr
    }
    while (p < len) {
      arr.push(parseValue())
      skipWs()
      if (s[p] === ',') {
        p++
        continue
      }
      if (s[p] === ']') {
        p++
        break
      }
      break
    }
    return arr
  }

  return {
    value: () => parseValue(),
    implicitMap: () => parseMap(false),
  }
}

// Dispatch a block-form value: flow if it opens with a structural char,
// otherwise a plain scalar (so the whole remainder, colons and all, is kept).
const parseFlowOrScalar = (raw) => {
  const s = raw.trim()
  const c = s[0]
  if (c === '{' || c === '[' || c === '"' || c === "'") return flowParser(s).value()
  return coerceScalar(s)
}

export { flowParser, parseFlowOrScalar }
