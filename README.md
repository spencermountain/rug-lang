# rug

An experimental, prose-first markup language for thoughtlessly writing
structured documents — inspired by [pug-js](https://pugjs.org/api/getting-started.html)
and <a href="https://en.wikipedia.org/wiki/Literate_programming"><i>literate programming</i></a>.

You write plain text. When you need structure, a line beginning with a period
drops you into a component, whose body is parsed as a small, predictable,
YAML-like format. That's the whole idea — a leading period is rare enough in
ordinary prose to be a clean signal.

```
This is just prose, with newlines and tabs preserved.

.button label: Sign up, href: /join

# a comment

And here the text resumes normally.
```

## Usage

```js
import parseRug from 'rug-lang'

parseRug('.card\n  title: Hello\n  count: 3')
// [
//   {
//     type: 'component',
//     name: 'card',
//     properties: { title: 'Hello', count: 3 },
//     start: 0, end: 28,
//     nameRange: [0, 5], bodyRange: [6, 28]
//   }
// ]
```

`parseRug(input)` returns a flat array of blocks — `prose`, `component`, or
`comment` — each carrying source offsets for syntax highlighting and tooling.

- **[docs/syntax.md](docs/syntax.md)** — the friendly language guide
- **[docs/spec.md](docs/spec.md)** — the formal specification (grammar, data
  model, processing model, API contract) for embedding rug elsewhere
- **[src/index.d.ts](src/index.d.ts)** — TypeScript definitions

## Develop

```sh
npm test          # run the test suite
npm run watch     # re-run scratch.js on change
```

Source is split into focused modules:

- [`src/lines.js`](src/lines.js) — split input into offset-preserving lines and classify them
- [`src/scalar.js`](src/scalar.js) — scalar coercion
- [`src/flow.js`](src/flow.js) — the inline/flow value parser
- [`src/structure.js`](src/structure.js) — indented block bodies
- [`src/index.js`](src/index.js) — ties it together

Not ready for prime-time.

MIT
