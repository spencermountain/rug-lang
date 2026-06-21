# rug syntax

rug is a **prose-first** markup language. You write plain text, and only drop
into structured markup when you need to. The signal is a single character at the
start of a line.

```
This is prose. Newlines and tabs are preserved exactly.

.button label: Sign up, href: /join

And prose resumes here.
```

`parseRug(input)` returns a flat array of **blocks**, in source order. There is
no nesting — the document is a sequence of prose, components, and comments.

---

## The three block kinds

Everything is decided by the **first character of a line, at column zero**.

| Starts with        | Block type  |
| ------------------ | ----------- |
| `.` + a letter/`_` | `component` |
| `#`                | `comment`   |
| anything else      | `prose`     |

Because the markers only matter at column zero, indented text is always prose,
and values like `color: #fff` are never mistaken for comments.

### Prose

Any run of lines that aren't components or comments. The text is preserved
**verbatim** — newlines, blank lines, and indentation all survive into
`contents`.

```
{ type: 'prose', contents: 'hello world\n\n   still prose', start, end }
```

### Comments

A line beginning with `#`. Contiguous comment lines merge into one block, and
the leading `# ` is stripped from each.

```
# TODO: revisit this
# second note
```

```
{ type: 'comment', contents: 'TODO: revisit this\nsecond note', start, end }
```

> Note: this means a Markdown-style heading (`# Title`) in prose becomes a
> comment. rug is not Markdown.

### Components

A line beginning with `.name`. The body — the component's properties — can be
written **inline**, as an **indented block**, or both. When both are present
they are merged, and the **inline form wins** on any key collision:

```
.heading {cool: true}
  level: 1
```

→ `{ cool: true, level: 1 }`

```
.card
  title: Hello
  count: 3
```

```
{
  type: 'component',
  name: 'card',
  properties: { title: 'Hello', count: 3 },
  start, end,
  nameRange: [...],   // source range of `.card`
  bodyRange: [...],   // source range of the body, or null
}
```

A component's body extends through following indented and blank lines, and ends
at the first line that returns to **column zero**.

---

## Properties

Property values use a small, predictable YAML-like grammar. Two spellings — an
indented **block** form and an inline **flow** form — share the exact same value
rules, so they never drift apart.

### Block form

```
.container
  this: is a string
  list:
    - one
    - two
  map:
    a: 1
    b: 2
```

- Nesting is by **deeper indentation** (use consistent indentation).
- Sequences use `- `.
- A value may itself be inline flow: `list: [one, two]`.

### Inline form

Everything after the component name. Two flavours, both supported:

```
.button label: Click, href: /buy, primary: true     # bare
.button {label: Click, tags: [a, b], meta: {x: 1}}   # braced
```

Bare is an implicit map; values with commas should be quoted. An inline body
may be combined with an indented block body — they merge, inline winning
collisions (see Components above).

### Shorthand: id and class

Right after the component name, Pug/Emmet-style `#id` and `.class` tokens become
`id` and `class` properties. They may be space-separated or attached:

```
.Heading #myid .cool.fun     → { id: 'myid', class: 'cool fun' }
.Heading.cool#myid           → { id: 'myid', class: 'cool' }
```

- Each `.name` adds a class; multiple classes join with a space.
- `#id` sets the id (the last one wins).
- Shorthand has the **lowest** precedence — an explicit `class`/`id` in a block
  or inline body overrides it, and it merges with everything else:

```
.btn #go .primary label: Click   → { id: 'go', class: 'primary', label: 'Click' }
```

---

## Scalars

Coercion is deliberately boring — only three literals and numbers are special:

| Source                           | Result            |
| -------------------------------- | ----------------- |
| `true` / `false`                 | boolean           |
| `null` (or empty, or `~`)        | null              |
| `42`, `-3.14`                    | number            |
| `'...'` / `"..."`                | string (verbatim) |
| anything else bare               | string            |

So `/buy`, `#fff`, `12:30`, `2026-06-21`, and `https://x:8080/p` all stay
strings. Quote a value to force a string: `"true"` → `"true"`, `"42"` → `"42"`.

There is no `yes`/`no`/`on`/`off`, no date parsing, no `1.0`-becomes-`1`.

---

## Source offsets

Every block carries `start` and `end` character offsets into the source.
Components also carry `nameRange` and `bodyRange`. These make the output
suitable for syntax highlighting and editor tooling:

```js
const [block] = parseRug('.card\n  k: v')
src.slice(block.start, block.end)              // '.card\n  k: v'
src.slice(...block.nameRange)                  // '.card'
src.slice(block.bodyRange[0], block.bodyRange[1]) // '  k: v'
```

---

## Not yet supported

These are deliberate omissions in the current pass:

- **Multiline strings** — planned as the `|` block-scalar form (it composes with
  the column-zero rule); multiline _quoted_ strings are not planned, as they
  fight that rule.
- **Escaping** a literal leading `.` or `#` in prose.
- **Nested components** — components are always top-level and flat.
- **Structured parse errors** — malformed flow currently stops at the bad value
  rather than emitting an `error` block.
