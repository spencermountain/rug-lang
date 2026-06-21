// Line handling — splitting input into offset-preserving lines and
// classifying each one. Only column-zero markers are special.

// a component opens with a period + identifier at column zero (`.myThing`)
const COMPONENT_RE = /^\.([A-Za-z_][\w-]*)/

// Split into lines, keeping each line's source offsets so blocks can report
// `start`/`end` for syntax highlighting and language tooling.
const splitLines = (input) => {
  const lines = []
  let start = 0
  for (let k = 0; k <= input.length; k++) {
    if (k === input.length || input[k] === '\n') {
      lines.push({ text: input.slice(start, k), start, end: k })
      start = k + 1
    }
  }
  // drop the phantom empty line produced by a trailing newline
  if (lines.length > 1 && input.endsWith('\n')) lines.pop()
  return lines
}

const isBlank = (line) => line.text.trim() === ''
const isIndented = (line) => /^[ \t]/.test(line.text) && !isBlank(line)
const isComment = (line) => line.text.startsWith('#')
const isComponent = (line) => COMPONENT_RE.test(line.text)

export { COMPONENT_RE, splitLines, isBlank, isIndented, isComment, isComponent }
