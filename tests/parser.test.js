import { test } from 'node:test'
import assert from 'node:assert/strict'
import parseRug from '../src/index.js'

// convenience: the block types in order
const types = (src) => parseRug(src).map((b) => b.type)

test('non-string input returns an empty array', () => {
  assert.deepEqual(parseRug(null), [])
  assert.deepEqual(parseRug(42), [])
})

test('plain prose is a single block with verbatim contents', () => {
  const src = 'hello world\nsecond line\n'
  const blocks = parseRug(src)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'prose')
  assert.equal(blocks[0].contents, 'hello world\nsecond line')
})

test('prose preserves blank lines and indentation', () => {
  const src = 'a\n\n   indented prose\n'
  const blocks = parseRug(src)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].contents, 'a\n\n   indented prose')
})

test('a component splits prose on either side', () => {
  const src = 'before\n.thing\n  k: v\nafter'
  assert.deepEqual(types(src), ['prose', 'component', 'prose'])
})

test('component name and simple block properties', () => {
  const [block] = parseRug('.card\n  title: Hello\n  count: 3')
  assert.equal(block.type, 'component')
  assert.equal(block.name, 'card')
  assert.deepEqual(block.properties, { title: 'Hello', count: 3 })
})

test('nested maps and sequences via indentation', () => {
  const src = ['.container', '  list:', '    - one', '    - two', '  map:', '    a: 1', '    b: 2'].join('\n')
  const [block] = parseRug(src)
  assert.deepEqual(block.properties, { list: ['one', 'two'], map: { a: 1, b: 2 } })
})

test('inline flow values inside the block form', () => {
  const [block] = parseRug('.x\n  tags: [a, b, c]\n  meta: {k: 1}')
  assert.deepEqual(block.properties, { tags: ['a', 'b', 'c'], meta: { k: 1 } })
})

test('bare inline component form', () => {
  const [block] = parseRug('.button label: Click here, href: /buy, primary: true')
  assert.deepEqual(block.properties, { label: 'Click here', href: '/buy', primary: true })
})

test('braced inline component form', () => {
  const [block] = parseRug('.button {label: Click, tags: [a, b], meta: {x: 1}}')
  assert.deepEqual(block.properties, { label: 'Click', tags: ['a', 'b'], meta: { x: 1 } })
})

test('inline and block bodies merge', () => {
  const [block] = parseRug('.heading {cool: true}\n  level: 1')
  assert.deepEqual(block.properties, { cool: true, level: 1 })
})

test('inline wins on a key collision', () => {
  const [block] = parseRug('.x {a: 9}\n  a: 1\n  b: 2')
  assert.deepEqual(block.properties, { a: 9, b: 2 })
})

test('a top-level sequence body cannot merge, so inline wins outright', () => {
  const [block] = parseRug('.x {a: 1}\n  - one\n  - two')
  assert.deepEqual(block.properties, { a: 1 })
})

test('a component with no body has empty properties', () => {
  const [block] = parseRug('.divider')
  assert.deepEqual(block.properties, {})
  assert.equal(block.bodyRange, null)
})

test('scalar coercion is boring and predictable', () => {
  const src = ['.x', '  a: 42', '  b: 3.14', '  c: true', '  d: false', '  e: null', '  f: hello', '  g: "true"', '  h: #fff', '  i: 12:30', '  j: https://example.com:8080/p'].join('\n')
  const [block] = parseRug(src)
  assert.deepEqual(block.properties, {
    a: 42,
    b: 3.14,
    c: true,
    d: false,
    e: null,
    f: 'hello',
    g: 'true', // quoted forces a string
    h: '#fff',
    i: '12:30',
    j: 'https://example.com:8080/p',
  })
})

test('comments are their own block and contiguous lines merge', () => {
  const blocks = parseRug('intro\n# TODO: revisit\n# second note\nmore')
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['prose', 'comment', 'prose']
  )
  assert.equal(blocks[1].contents, 'TODO: revisit\nsecond note')
})

test('a blank line ends a comment run', () => {
  const blocks = parseRug('# one\n\n# two')
  assert.deepEqual(types('# one\n\n# two'), ['comment', 'prose', 'comment'])
  assert.equal(blocks[0].contents, 'one')
})

test('offsets and ranges point at the source', () => {
  const src = 'hi\n.card\n  k: v\nbye'
  const blocks = parseRug(src)
  const [prose, card, after] = blocks
  assert.equal(src.slice(prose.start, prose.end), 'hi')
  assert.equal(src.slice(card.start, card.end), '.card\n  k: v')
  assert.equal(src.slice(...card.nameRange), '.card')
  assert.equal(src.slice(card.bodyRange[0], card.bodyRange[1]), '  k: v')
  assert.equal(src.slice(after.start, after.end), 'bye')
})

test('the component body extends through blank lines until column zero', () => {
  const src = '.x\n  a: 1\n\n  b: 2\nout'
  const [block, prose] = parseRug(src)
  assert.deepEqual(block.properties, { a: 1, b: 2 })
  assert.equal(prose.contents, 'out')
})

test('a leading period not followed by an identifier stays prose', () => {
  assert.deepEqual(types('...and so on'), ['prose'])
  assert.deepEqual(types('. spaced'), ['prose'])
})

// --- id/class shorthand ---

test('id and class shorthand on the opening line', () => {
  const [block] = parseRug('.Heading #myid .cool.fun')
  assert.equal(block.name, 'Heading')
  assert.deepEqual(block.properties, { id: 'myid', class: 'cool fun' })
})

test('shorthand may be attached to the name', () => {
  const [block] = parseRug('.Heading.cool#myid')
  assert.deepEqual(block.properties, { id: 'myid', class: 'cool' })
})

test('shorthand merges with inline and block bodies', () => {
  const inlineCase = parseRug('.btn #go .primary label: Click')[0]
  assert.deepEqual(inlineCase.properties, { id: 'go', class: 'primary', label: 'Click' })

  const blockCase = parseRug('.card #c1 .box\n  title: Hi')[0]
  assert.deepEqual(blockCase.properties, { id: 'c1', class: 'box', title: 'Hi' })
})

test('an explicit class prop overrides shorthand class', () => {
  const [block] = parseRug('.x .a {class: b}')
  assert.deepEqual(block.properties, { class: 'b' })
})

test('a class-only component names the first token', () => {
  const [block] = parseRug('.cool.fun')
  assert.equal(block.name, 'cool')
  assert.deepEqual(block.properties, { class: 'fun' })
})

// --- behaviours the spec pins down (docs/spec.md) ---

test('a top-level sequence body yields array properties', () => {
  const [block] = parseRug('.list\n  - a\n  - b')
  assert.deepEqual(block.properties, ['a', 'b'])
})

test('a bare map item in a sequence is a string; flow form gives a map', () => {
  assert.deepEqual(parseRug('.x\n  - k: v')[0].properties, ['k: v'])
  assert.deepEqual(parseRug('.x\n  - {k: v}')[0].properties, [{ k: 'v' }])
})

test('a child block under a bare dash nests', () => {
  const [block] = parseRug('.x\n  items:\n    -\n      a: 1\n      b: 2')
  assert.deepEqual(block.properties, { items: [{ a: 1, b: 2 }] })
})

test('double-quoted values honour backslash escapes', () => {
  const [block] = parseRug('.x\n  a: "she said \\"hi\\""')
  assert.deepEqual(block.properties, { a: 'she said "hi"' })
})

test('single-quoted values are literal (no escapes)', () => {
  // rug source line is:  a: 'C:\path'  -> the backslash is kept verbatim
  const [block] = parseRug(".x\n  a: 'C:\\path'")
  assert.deepEqual(block.properties, { a: 'C:\\path' })
})

test('a trailing newline produces no extra block', () => {
  assert.equal(parseRug('hello\n').length, 1)
  assert.equal(parseRug('hello').length, 1)
})
