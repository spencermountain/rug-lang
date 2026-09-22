/* eslint-disable no-use-before-define */
// Block structure — the indented body of a component.
//
// `items` are the non-blank body lines, each `{indent, text}` where `text` has
// its leading whitespace stripped and `indent` is that whitespace's length.
// Nesting is by deeper indentation; sequences use `- `. Values reuse the flow
// grammar, so `tags: [a, b]` and an indented `- ` list produce the same thing.
import { parseFlowOrScalar } from './flow.js'

const isSeqLine = (t) => t === '-' || t.startsWith('- ')

const parseStructure = (items) => {
  let idx = 0

  const parseNode = (indent) => (isSeqLine(items[idx].text) ? parseSeq(indent) : parseMap(indent))

  const parseMap = (indent) => {
    const obj = {}
    while (idx < items.length && items[idx].indent === indent && !isSeqLine(items[idx].text)) {
      const t = items[idx].text
      const ci = t.indexOf(':')
      const key = ci === -1 ? t.trim() : t.slice(0, ci).trim()
      const rest = ci === -1 ? '' : t.slice(ci + 1).trim()
      idx++
      if (rest === '') {
        obj[key] =
          idx < items.length && items[idx].indent > indent ? parseNode(items[idx].indent) : null
      } else {
        obj[key] = parseFlowOrScalar(rest)
      }
    }
    return obj
  }

  const parseSeq = (indent) => {
    const arr = []
    while (idx < items.length && items[idx].indent === indent && isSeqLine(items[idx].text)) {
      const t = items[idx].text
      const rest = t === '-' ? '' : t.slice(2).trim()
      idx++
      if (rest === '') {
        arr.push(
          idx < items.length && items[idx].indent > indent ? parseNode(items[idx].indent) : null
        )
      } else {
        arr.push(parseFlowOrScalar(rest))
      }
    }
    return arr
  }

  return items.length === 0 ? {} : parseNode(items[0].indent)
}

export default parseStructure
