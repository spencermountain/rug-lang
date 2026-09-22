// Shorthand parser — Pug/Emmet-style id and class on a component's opening line.
//
//   .Heading #myid .cool.fun   ->   { id: 'myid', class: 'cool fun' }
//
// Tokens may be space-separated or attached (`.Heading.cool#myid`). `#id` sets
// the id (last one wins); each `.name` adds a class. Identifier characters are
// [A-Za-z0-9_-], and a `.` ends the current class — so `.cool.fun` is two
// classes. Parsing stops at the first token that is not `#`/`.`, leaving the
// remainder to be parsed as the inline body.

const isWs = (c) => c === ' ' || c === '\t'
const isIdent = (c) => /[\w-]/.test(c)

const parseShorthand = (s) => {
  let p = 0
  const len = s.length
  let id = null
  const classes = []

  while (p < len && isWs(s[p])) p++
  while (p < len && (s[p] === '#' || s[p] === '.')) {
    const marker = s[p++]
    const start = p
    while (p < len && isIdent(s[p])) p++
    const ident = s.slice(start, p)
    if (!ident) {
      p = start - 1 // a lone marker — hand it back to the inline body
      break
    }
    if (marker === '#') id = ident
    else classes.push(ident)
    while (p < len && isWs(s[p])) p++
  }

  const shorthand = {}
  if (id !== null) shorthand.id = id
  if (classes.length > 0) shorthand.class = classes.join(' ')
  return { shorthand, rest: s.slice(p) }
}

export default parseShorthand
