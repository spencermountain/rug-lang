import test from 'tape'
import parseRug from '../src/index.js'

// convenience: the block types in order
const types = (src) => parseRug(src).map((b) => b.type)

test('non-string input returns an empty array', (t) => {
  t.deepEqual(parseRug(null), [])
  t.deepEqual(parseRug(42), [])
  t.end()
})

test('plain prose is a single block with verbatim contents', (t) => {
  const src = 'hello world\nsecond line\n'
  const blocks = parseRug(src)
  t.equal(blocks.length, 1)
  t.equal(blocks[0].type, 'prose')
  t.equal(blocks[0].contents, 'hello world\nsecond line')
  t.end()
})

test('prose preserves blank lines and indentation', (t) => {
  const src = 'a\n\n   indented prose\n'
  const blocks = parseRug(src)
  t.equal(blocks.length, 1)
  t.equal(blocks[0].contents, 'a\n\n   indented prose')
  t.end()
})

test('a component splits prose on either side', (t) => {
  const src = 'before\n.thing\n  k: v\nafter'
  t.deepEqual(types(src), ['prose', 'component', 'prose'])
  t.end()
})

test('component name and simple block properties', (t) => {
  const [block] = parseRug('.card\n  title: Hello\n  count: 3')
  t.equal(block.type, 'component')
  t.equal(block.name, 'card')
  t.deepEqual(block.properties, { title: 'Hello', count: 3 })
  t.end()
})

test('nested maps and sequences via indentation', (t) => {
  const src = ['.container', '  list:', '    - one', '    - two', '  map:', '    a: 1', '    b: 2'].join('\n')
  const [block] = parseRug(src)
  t.deepEqual(block.properties, { list: ['one', 'two'], map: { a: 1, b: 2 } })
  t.end()
})

test('inline flow values inside the block form', (t) => {
  const [block] = parseRug('.x\n  tags: [a, b, c]\n  meta: {k: 1}')
  t.deepEqual(block.properties, { tags: ['a', 'b', 'c'], meta: { k: 1 } })
  t.end()
})

test('bare inline component form', (t) => {
  const [block] = parseRug('.button label: Click here, href: /buy, primary: true')
  t.deepEqual(block.properties, { label: 'Click here', href: '/buy', primary: true })
  t.end()
})

test('braced inline component form', (t) => {
  const [block] = parseRug('.button {label: Click, tags: [a, b], meta: {x: 1}}')
  t.deepEqual(block.properties, { label: 'Click', tags: ['a', 'b'], meta: { x: 1 } })
  t.end()
})

test('inline and block bodies merge', (t) => {
  const [block] = parseRug('.heading {cool: true}\n  level: 1')
  t.deepEqual(block.properties, { cool: true, level: 1 })
  t.end()
})

test('inline wins on a key collision', (t) => {
  const [block] = parseRug('.x {a: 9}\n  a: 1\n  b: 2')
  t.deepEqual(block.properties, { a: 9, b: 2 })
  t.end()
})

test('a top-level sequence body cannot merge, so inline wins outright', (t) => {
  const [block] = parseRug('.x {a: 1}\n  - one\n  - two')
  t.deepEqual(block.properties, { a: 1 })
  t.end()
})

test('a component with no body has empty properties', (t) => {
  const [block] = parseRug('.divider')
  t.deepEqual(block.properties, {})
  t.equal(block.bodyRange, null)
  t.end()
})

test('scalar coercion is boring and predictable', (t) => {
  const src = ['.x', '  a: 42', '  b: 3.14', '  c: true', '  d: false', '  e: null', '  f: hello', '  g: "true"', '  h: #fff', '  i: 12:30', '  j: https://example.com:8080/p'].join('\n')
  const [block] = parseRug(src)
  t.deepEqual(block.properties, {
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
  t.end()
})

test('comments are their own block and contiguous lines merge', (t) => {
  const blocks = parseRug('intro\n# TODO: revisit\n# second note\nmore')
  t.deepEqual(
    blocks.map((b) => b.type),
    ['prose', 'comment', 'prose']
  )
  t.equal(blocks[1].contents, 'TODO: revisit\nsecond note')
  t.end()
})

test('a blank line ends a comment run', (t) => {
  const blocks = parseRug('# one\n\n# two')
  t.deepEqual(types('# one\n\n# two'), ['comment', 'prose', 'comment'])
  t.equal(blocks[0].contents, 'one')
  t.end()
})

test('offsets and ranges point at the source', (t) => {
  const src = 'hi\n.card\n  k: v\nbye'
  const blocks = parseRug(src)
  const [prose, card, after] = blocks
  t.equal(src.slice(prose.start, prose.end), 'hi')
  t.equal(src.slice(card.start, card.end), '.card\n  k: v')
  t.equal(src.slice(...card.nameRange), '.card')
  t.equal(src.slice(card.bodyRange[0], card.bodyRange[1]), '  k: v')
  t.equal(src.slice(after.start, after.end), 'bye')
  t.end()
})

test('the component body extends through blank lines until column zero', (t) => {
  const src = '.x\n  a: 1\n\n  b: 2\nout'
  const [block, prose] = parseRug(src)
  t.deepEqual(block.properties, { a: 1, b: 2 })
  t.equal(prose.contents, 'out')
  t.end()
})

test('a leading period not followed by an identifier stays prose', (t) => {
  t.deepEqual(types('...and so on'), ['prose'])
  t.deepEqual(types('. spaced'), ['prose'])
  t.end()
})

// --- id/class shorthand ---

test('id and class shorthand on the opening line', (t) => {
  const [block] = parseRug('.Heading #myid .cool.fun')
  t.equal(block.name, 'Heading')
  t.deepEqual(block.properties, { id: 'myid', class: 'cool fun' })
  t.end()
})

test('shorthand may be attached to the name', (t) => {
  const [block] = parseRug('.Heading.cool#myid')
  t.deepEqual(block.properties, { id: 'myid', class: 'cool' })
  t.end()
})

test('shorthand merges with inline and block bodies', (t) => {
  const inlineCase = parseRug('.btn #go .primary label: Click')[0]
  t.deepEqual(inlineCase.properties, { id: 'go', class: 'primary', label: 'Click' })

  const blockCase = parseRug('.card #c1 .box\n  title: Hi')[0]
  t.deepEqual(blockCase.properties, { id: 'c1', class: 'box', title: 'Hi' })
  t.end()
})

test('an explicit class prop overrides shorthand class', (t) => {
  const [block] = parseRug('.x .a {class: b}')
  t.deepEqual(block.properties, { class: 'b' })
  t.end()
})

test('a class-only component names the first token', (t) => {
  const [block] = parseRug('.cool.fun')
  t.equal(block.name, 'cool')
  t.deepEqual(block.properties, { class: 'fun' })
  t.end()
})

// --- behaviours the spec pins down (docs/spec.md) ---

test('a top-level sequence body yields array properties', (t) => {
  const [block] = parseRug('.list\n  - a\n  - b')
  t.deepEqual(block.properties, ['a', 'b'])
  t.end()
})

test('a bare map item in a sequence is a string; flow form gives a map', (t) => {
  t.deepEqual(parseRug('.x\n  - k: v')[0].properties, ['k: v'])
  t.deepEqual(parseRug('.x\n  - {k: v}')[0].properties, [{ k: 'v' }])
  t.end()
})

test('a child block under a bare dash nests', (t) => {
  const [block] = parseRug('.x\n  items:\n    -\n      a: 1\n      b: 2')
  t.deepEqual(block.properties, { items: [{ a: 1, b: 2 }] })
  t.end()
})

test('double-quoted values honour backslash escapes', (t) => {
  const [block] = parseRug('.x\n  a: "she said \\"hi\\""')
  t.deepEqual(block.properties, { a: 'she said "hi"' })
  t.end()
})

test('single-quoted values are literal (no escapes)', (t) => {
  // rug source line is:  a: 'C:\path'  -> the backslash is kept verbatim
  const [block] = parseRug(".x\n  a: 'C:\\path'")
  t.deepEqual(block.properties, { a: 'C:\\path' })
  t.end()
})

test('a trailing newline produces no extra block', (t) => {
  t.equal(parseRug('hello\n').length, 1)
  t.equal(parseRug('hello').length, 1)
  t.end()
})
