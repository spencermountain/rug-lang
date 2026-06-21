# rug language specification

**Version 0.1 (draft).** This document is the formal, implementation-oriented
reference for the rug markup language. For a gentle introduction see
[syntax.md](syntax.md); this document is precise rather than friendly, so that
rug can be re-implemented or embedded (in a Nuxt module, an editor extension, a
different runtime) against a stable contract.

The reference implementation is the [`rug-lang`](../README.md) package; where
this document and that implementation disagree, that is a bug in one of them.

---

## 1. Overview

rug is a **prose-first**, **line-oriented**, **flat** markup language:

- **Prose-first** — text is plain prose by default. Structure is opt-in.
- **Line-oriented** — a line's role is determined by its first character at
  column zero. The language never re-flows or reinterprets lines.
- **Flat** — a document is an ordered sequence of top-level blocks. There is no
  block nesting. (Structure exists _within_ a component's properties, not
  between blocks.)

Parsing a document yields an ordered array of **blocks**. Every block records
its character range in the source, so the output is suitable for rendering,
syntax highlighting, and language tooling.

---

## 2. Source text

- A rug document is a sequence of Unicode characters (a JavaScript string in the
  reference implementation).
- **Lines** are separated by the line feed character `U+000A` (`\n`). A carriage
  return is not treated specially; CRLF input retains the `\r` as the last
  character of a line's text.
- **Column zero** is the first character of a line.
- **Indentation** is the maximal run of space (`U+0020`) and tab (`U+0009`)
  characters at the start of a line. Its **width** is the count of those
  characters (a tab counts as one). Implementations SHOULD treat indentation
  consistently within a document; mixing tabs and spaces at sibling levels is
  unspecified.
- **Offsets** are zero-based character indices. A range `[start, end)` is
  half-open: `start` is inclusive, `end` is exclusive, so
  `source.slice(start, end)` yields the spanned text.
- A single trailing newline at the end of the document is not significant and
  does not produce a trailing empty block.

---

## 3. Block model

A document is:

```
Document := Block*
Block    := Prose | Comment | Component
```

Each line is classified by its **column-zero prefix**:

| Condition (at column zero)                 | Opens a   |
| ------------------------------------------ | --------- |
| `.` immediately followed by `[A-Za-z_]`    | Component |
| `#`                                        | Comment   |
| otherwise (including indented lines)        | Prose     |

Because classification only considers column zero, indented text is always
prose, and the marker characters are unambiguous inside values (e.g. a `#fff`
value, a `.` mid-sentence).

### 3.1 Prose

A **prose block** is a maximal run of consecutive lines, none of which opens a
component or a comment. Blank lines and indented lines belong to prose.

`contents` is the spanned source text, **verbatim** — newlines, blank lines, and
indentation are preserved exactly.

```json
{ "type": "prose", "contents": "…", "start": 0, "end": 12 }
```

### 3.2 Comment

A **comment block** is a maximal run of consecutive lines that each begin with
`#` at column zero. A blank line or any non-`#` line ends the run.

`contents` is formed by removing a leading `#` and one optional following space
or tab from each line, then joining the lines with `\n`.

```json
{ "type": "comment", "contents": "…", "start": 0, "end": 20 }
```

> A line consisting of a Markdown-style heading (`# Title`) is a comment. rug is
> not Markdown.

### 3.3 Component

A **component block** opens with `.name` at column zero, where `name` matches:

```
name := [A-Za-z_] [A-Za-z0-9_-]*
```

On the opening line, the text after the name is, in order: an optional
**shorthand** region (§3.3.1) followed by an optional **inline body** — the
remaining text, trimmed. The lines following the opening line, up to but not
including the next column-zero line, are the **block body**: the maximal run of
subsequent lines that are each either blank or indented.

A component's **properties** combine all three sources:

1. The shorthand region yields a map of `id`/`class` (§3.3.1), possibly empty.
   The inline body, if non-empty, is parsed as a map (§5.2). The block body, if
   it has structural content, is parsed (§5.1).
2. The maps are **merged** by precedence — shorthand (lowest), then block, then
   inline (highest) — `{ ...shorthand, ...block, ...inline }`. A block body that
   is a top-level sequence (an array, §4.3) has no keys to merge; it survives as
   the properties only when no other source contributes keys, and is otherwise
   dropped in favour of the merged map.
3. If no source contributes, properties are the empty map `{}`.

The merge is **shallow** — collisions are resolved at the top level only; a
higher-precedence source replaces a colliding key wholesale rather than
deep-merging into a nested map.

#### 3.3.1 Shorthand (id and class)

Immediately after the name, a run of `#id` and `.class` tokens — space-separated
or attached — contributes `id` and `class` properties:

```ebnf
shorthand = { ws } { ("#" | ".") ident { ws } } ;
ident     = { [A-Za-z0-9_-] } ;
```

- Each `.ident` appends a class; the resulting `class` value is the classes
  joined by a single space. Each `#ident` sets `id` (the last occurrence wins).
- A `#` or `.` not followed by an identifier character ends the shorthand region
  and begins the inline body.
- `id` is present only when an `#id` token appeared; `class` only when at least
  one `.class` token appeared.

```
.Heading #myid .cool.fun     →  { id: "myid", class: "cool fun" }
.Heading.cool#myid           →  { id: "myid", class: "cool" }
```

```json
{
  "type": "component",
  "name": "card",
  "properties": { "title": "Hello" },
  "start": 0,
  "end": 19,
  "nameRange": [0, 5],
  "bodyRange": [6, 19]
}
```

- `nameRange` spans the `.name` marker.
- `bodyRange` spans the block body, or is `null` when there is no block body
  (including when an inline body was used).

---

## 4. Values

Component properties are built from **values**. The value language has two
spellings — an inline **flow** form and an indented **block** form — that share
identical semantics. A value is one of: a map, a sequence, or a scalar.

### 4.1 Scalars and coercion

A bare (unquoted) scalar is coerced by these rules, applied in order:

| Input (trimmed)               | Result            |
| ----------------------------- | ----------------- |
| `""`, `null`, `~`             | `null`            |
| `true`                        | `true` (boolean)  |
| `false`                       | `false` (boolean) |
| matches `-?\d+`               | number (integer)  |
| matches `-?(\d+\.\d*\|\.\d+)`  | number (float)    |
| anything else                 | string            |

A **quoted** scalar is always a string and is never coerced:

- `'…'` — single-quoted: characters are taken literally up to the closing quote.
- `"…"` — double-quoted: `\` escapes the following character (e.g. `\"`).

Consequently `/buy`, `#fff`, `12:30`, `2026-06-21`, and `https://x:8080/p` are
strings; `"true"` and `"42"` are the strings `"true"` and `"42"`. There is no
`yes`/`no`/`on`/`off`, no date or time parsing, and no `1.0`→`1` normalization.

### 4.2 Flow form (EBNF)

```ebnf
flowValue  = flowMap | flowSeq | quoted | bare ;
flowMap    = "{" [ pair { "," pair } ] "}" ;
pair       = key ":" flowValue ;
key        = quoted | { any character except ":" "," "}" } ;
flowSeq    = "[" [ flowValue { "," flowValue } ] "]" ;
bare       = { any character except "," "}" "]" } ;
quoted     = '"' { char | "\" char } '"' | "'" { char } "'" ;
```

Notes:

- A bare value is delimited by `,`, `}`, or `]` — **not** by `:`, so colons
  inside a value (URLs, times) are preserved.
- Surrounding whitespace around keys and values is trimmed before coercion.

### 4.3 Block form (indentation-sensitive)

The block body is a single node — a mapping or a sequence — determined by its
first non-blank line. Blank lines within the body are insignificant.

```ebnf
blockNode  = mapping | sequence ;
mapping    = mapEntry+ ;                 (* entries share one indent width *)
mapEntry   = key ":" ( inlineValue | childBlock ) ;
sequence   = seqItem+ ;                  (* items share one indent width *)
seqItem    = "-" [ " " ] ( inlineValue | childBlock ) ;
inlineValue = flowValue ;                (* on the same line as the key/dash *)
childBlock = blockNode ;                 (* on following lines, deeper indent *)
```

Semantics:

- Sibling entries/items are the consecutive lines at the **same** indentation
  width. A line indented **more** than its parent starts a child node; a line
  indented the **same as or less than** an ancestor closes the current node.
- A map entry is `key : rest`. The key is the text before the first `:`. If
  `rest` is empty, the value is the child block on the following deeper-indented
  lines, or `null` if there is none. Otherwise the value is `rest` parsed as a
  flow value (§4.2).
- A sequence item begins with `-`. The rule for its value mirrors map entries.
- A block body whose first non-blank line is a sequence item yields top-level
  **array** properties rather than a map.

The block and flow forms are interchangeable; these three produce the same
`properties`:

```
.x                  .x                  .x {tags: [a, b]}
  tags:               tags: [a, b]
    - a
    - b
```

---

## 5. Component bodies

### 5.1 Block-body components

```
.container
  title: Hello
  list:
    - one
    - two
```

→

```json
{ "title": "Hello", "list": ["one", "two"] }
```

### 5.2 Inline-body components

The inline body is everything after the name on the opening line (trimmed). Two
forms are accepted:

- **Braced** — begins with `{`; parsed as a flow map (§4.2).
- **Bare** — an implicit map: comma-separated `key: value` pairs. Values that
  contain commas must be quoted.

```
.button {label: Click, tags: [a, b]}     → { label:"Click", tags:["a","b"] }
.button label: Click, href: /buy         → { label:"Click", href:"/buy" }
```

### 5.3 Mixed bodies

An inline body and a block body may be combined; they merge with the inline body
winning collisions (§3.3).

```
.heading {cool: true}     →  { cool: true, level: 1 }
  level: 1

.x {a: 9}                 →  { a: 9, b: 2 }   (inline `a` overrides block `a`)
  a: 1
  b: 2
```

---

## 6. Processing model

A conformant parser produces the same block array as this procedure:

1. Split the source into lines, recording each line's `[start, end)` offsets.
   Drop the single empty line implied by a trailing newline.
2. Scan lines top to bottom. At each line, by its column-zero classification
   (§3):
   - **Component** — read the opening line and its block body (the following
     run of blank/indented lines); emit a component block; resume at the first
     column-zero line after the body.
   - **Comment** — read the maximal run of `#` lines; emit one comment block.
   - **Prose** — read the maximal run of lines that open neither a component nor
     a comment; emit one prose block.
3. The result is the blocks in source order.

The parser is **total**: every input maps to some block array. Malformed flow
values are recovered locally (parsing of that value stops at the offending
character) rather than aborting the parse. Non-string input yields `[]`.

---

## 7. Data model

The output array contains objects of these shapes (mirroring
[`src/index.d.ts`](../src/index.d.ts)):

```ts
type Range = [start: number, end: number]
type RugValue = string | number | boolean | null | RugValue[] | RugMap
interface RugMap { [key: string]: RugValue }
type RugProperties = RugMap | RugValue[]

type Block =
  | { type: 'prose';     contents: string; start: number; end: number }
  | { type: 'comment';   contents: string; start: number; end: number }
  | { type: 'component'; name: string; properties: RugProperties;
      start: number; end: number; nameRange: Range; bodyRange: Range | null }
```

### API contract

```ts
parseRug(input: string): Block[]
```

Guarantees a consumer (a Nuxt module, a renderer, an editor) may rely on:

- Blocks are returned in source order and partition the document's meaningful
  content; each block's `[start, end)` indexes back into the original source.
- `type` is always one of `prose`, `comment`, `component`.
- A `component` always has a `name` and a `properties` object/array; `bodyRange`
  is `null` exactly when there is no block body.
- The function never throws for string input and returns `[]` for non-strings.

---

## 8. Not yet specified

Reserved for future versions; current implementations need not support them:

- **Multiline strings.** Intended as the `|` block-scalar form (it composes with
  the column-zero termination rule). Multiline _quoted_ strings are explicitly
  out of scope, as they conflict with that rule.
- **Escaping** a literal leading `.` or `#` so it stays prose.
- **Nested or self-closing components.**
- **Bare map items in sequences.** A sequence item's inline value is parsed as a
  flow value, so `- key: value` is the _string_ `"key: value"`. A mapping item
  must use the flow form (`- {key: value}`) or a child block under a bare `-`.
  Multi-line `key: value` continuation under a `-` is unspecified.
- **Structured parse errors / diagnostics** (e.g. `error` blocks with ranges).
- **Comments inside a flow or block value.** `#` is only a comment marker at
  column zero.

---

## 9. Versioning

This spec is **0.1 (draft)** and may change incompatibly before 1.0. The
language is experimental and not yet intended for production use.
