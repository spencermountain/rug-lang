// Scalar coercion — deliberately boring and predictable.
//
// Only `true`/`false`/`null` and numbers are magic. Everything else bare is a
// string, so `/buy`, `#fff`, `12:30`, `2026-06-21` survive untouched. Quote a
// value to force it to a string (e.g. `"true"`, `"42"`).
const coerceScalar = (s) => {
  if (s === '' || s === 'null' || s === '~') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+$/.test(s)) return Number(s)
  if (/^-?(?:\d+\.\d*|\.\d+)$/.test(s)) return Number(s)
  return s
}

export default coerceScalar
