// rug — an experimental prose-first markup language.
//
// Plain text is "prose". A line that begins (at column zero) with a period
// drops into a component whose body is parsed as a small, predictable
// YAML-like structure. A line beginning with `#` is a comment.
//
//   This is prose.
//   .myComponent
//     key: value
//     list: [a, b, c]
//   # a comment
//   And prose resumes here.
//
// `parseRug(input)` returns a flat array of blocks, each carrying source
// offsets so the result can drive syntax highlighting and language tooling.
import { COMPONENT_RE, splitLines, isBlank, isIndented, isComment, isComponent } from './lines.js'
import { flowParser } from './flow.js'
import parseStructure from './structure.js'
import parseShorthand from './shorthand.js'

// Turn a component's raw body lines into `{indent, text}` items, dropping
// blank lines (insignificant to the structure) and recording each line's
// indentation so nesting can be reconstructed.
const toItems = (bodyLines) =>
  bodyLines
    .filter((l) => !isBlank(l))
    .map((l) => {
      const stripped = l.text.trimStart()
      return { indent: l.text.length - stripped.length, text: stripped }
    })

// Read a `.name` component starting at line `i`. The body is the run of
// following indented/blank lines, up to the next column-zero line.
const readComponent = (lines, i, line) => {
  const m = line.text.match(COMPONENT_RE)
  const name = m[1]
  // peel off `#id`/`.class` shorthand; whatever is left is the inline body
  const { shorthand, rest } = parseShorthand(line.text.slice(m[0].length))
  const inline = rest.trim()

  let j = i + 1
  while (j < lines.length && (isBlank(lines[j]) || isIndented(lines[j]))) j++
  const bodyLines = lines.slice(i + 1, j)

  // inline body (bare or braced) is always a map; the block body may be a map
  // or, when it opens with `- `, a top-level array
  const inlineProps = inline ? (inline[0] === '{' ? flowParser(inline).value() : flowParser(inline).implicitMap()) : null
  const blockProps = bodyLines.some((l) => !isBlank(l)) ? parseStructure(toItems(bodyLines)) : null

  // Assemble properties by precedence: shorthand (lowest) < block < inline.
  // A top-level sequence body has no keys to merge, so it survives only when
  // there are no map sources to combine it with.
  const mapLayers = [shorthand]
  let arrayBody = null
  if (blockProps) {
    if (Array.isArray(blockProps)) arrayBody = blockProps
    else mapLayers.push(blockProps)
  }
  if (inlineProps) mapLayers.push(inlineProps)

  const hasMapKeys = mapLayers.some((l) => Object.keys(l).length > 0)
  const properties = arrayBody && !hasMapKeys ? arrayBody : Object.assign({}, ...mapLayers)

  const last = lines[j - 1]
  const block = {
    type: 'component',
    name,
    properties,
    start: line.start,
    end: last.end,
    nameRange: [line.start, line.start + m[0].length],
    bodyRange: bodyLines.length ? [bodyLines[0].start, last.end] : null,
  }
  return { block, next: j }
}

// Collect a contiguous run of `#` comment lines into one block, stripping the
// leading marker from each line.
const readComment = (lines, i) => {
  let j = i
  while (j < lines.length && isComment(lines[j])) j++
  const run = lines.slice(i, j)
  const block = {
    type: 'comment',
    contents: run.map((l) => l.text.replace(/^#[ \t]?/, '')).join('\n'),
    start: run[0].start,
    end: run[run.length - 1].end,
  }
  return { block, next: j }
}

// Prose runs until the next component or comment line, preserving the source
// text (newlines and tabs included) verbatim.
const readProse = (lines, i, input) => {
  let j = i
  while (j < lines.length && !isComponent(lines[j]) && !isComment(lines[j])) j++
  const run = lines.slice(i, j)
  const start = run[0].start
  const end = run[run.length - 1].end
  const block = { type: 'prose', contents: input.slice(start, end), start, end }
  return { block, next: j }
}

const parseRug = (input) => {
  if (typeof input !== 'string') return []
  const lines = splitLines(input)
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    let result
    if (isComponent(line)) result = readComponent(lines, i, line)
    else if (isComment(line)) result = readComment(lines, i)
    else result = readProse(lines, i, input)
    blocks.push(result.block)
    i = result.next
  }

  return blocks
}

export default parseRug
