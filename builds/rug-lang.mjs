// Line handling — splitting input into offset-preserving lines and
// classifying each one. Only column-zero markers are special.

// a component opens with a period + identifier at column zero (`.myThing`)
const COMPONENT_RE = /^\.([A-Za-z_][\w-]*)/;

// Split into lines, keeping each line's source offsets so blocks can report
// `start`/`end` for syntax highlighting and language tooling.
const splitLines = (input) => {
  const lines = [];
  let start = 0;
  for (let k = 0; k <= input.length; k++) {
    if (k === input.length || input[k] === '\n') {
      lines.push({ text: input.slice(start, k), start, end: k });
      start = k + 1;
    }
  }
  // drop the phantom empty line produced by a trailing newline
  if (lines.length > 1 && input.endsWith('\n')) lines.pop();
  return lines
};

const isBlank = (line) => line.text.trim() === '';
const isIndented = (line) => /^[ \t]/.test(line.text) && !isBlank(line);
const isComment = (line) => line.text.startsWith('#');
const isComponent = (line) => COMPONENT_RE.test(line.text);

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
};

// Flow parser — the inline forms.
//
// Handles `{a: 1, b: 2}`, `[x, y, z]`, `"quoted"`, and the brace-less implicit
// map used on a component line (`.btn a: 1, b: 2`). The same value grammar is
// reused by the indented block form, so the two spellings can never drift.

const flowParser = (s) => {
  let p = 0;
  const len = s.length;
  const skipWs = () => {
    while (p < len && (s[p] === ' ' || s[p] === '\t')) p++;
  };

  const parseQuoted = () => {
    const q = s[p++];
    let out = '';
    while (p < len && s[p] !== q) {
      if (s[p] === '\\' && q === '"' && p + 1 < len) {
        p++;
        out += s[p++];
        continue
      }
      out += s[p++];
    }
    p++; // closing quote
    return out
  };

  // a bare scalar runs until a structural delimiter — not `:`, so URLs survive
  const parseBare = () => {
    const start = p;
    while (p < len && s[p] !== ',' && s[p] !== '}' && s[p] !== ']') p++;
    return coerceScalar(s.slice(start, p).trim())
  };

  const parseKey = () => {
    skipWs();
    if (s[p] === '"' || s[p] === "'") return parseQuoted()
    const start = p;
    while (p < len && s[p] !== ':' && s[p] !== ',' && s[p] !== '}') p++;
    return s.slice(start, p).trim()
  };

  const parseValue = () => {
    skipWs();
    const c = s[p];
    if (c === '{') return parseMap(true)
    if (c === '[') return parseSeq()
    if (c === '"' || c === "'") return parseQuoted()
    return parseBare()
  };

  const parseMap = (braced) => {
    if (braced) p++; // consume {
    const obj = {};
    skipWs();
    if (braced && s[p] === '}') {
      p++;
      return obj
    }
    while (p < len) {
      skipWs();
      if (p >= len || s[p] === '}') {
        if (s[p] === '}') p++;
        break
      }
      const key = parseKey();
      skipWs();
      if (s[p] === ':') p++;
      obj[key] = parseValue();
      skipWs();
      if (s[p] === ',') {
        p++;
        continue
      }
      if (s[p] === '}') {
        p++;
        break
      }
      break
    }
    return obj
  };

  const parseSeq = () => {
    p++; // consume [
    const arr = [];
    skipWs();
    if (s[p] === ']') {
      p++;
      return arr
    }
    while (p < len) {
      arr.push(parseValue());
      skipWs();
      if (s[p] === ',') {
        p++;
        continue
      }
      if (s[p] === ']') {
        p++;
        break
      }
      break
    }
    return arr
  };

  return {
    value: () => parseValue(),
    implicitMap: () => parseMap(false),
  }
};

// Dispatch a block-form value: flow if it opens with a structural char,
// otherwise a plain scalar (so the whole remainder, colons and all, is kept).
const parseFlowOrScalar = (raw) => {
  const s = raw.trim();
  const c = s[0];
  if (c === '{' || c === '[' || c === '"' || c === "'") return flowParser(s).value()
  return coerceScalar(s)
};

// Block structure — the indented body of a component.
//
// `items` are the non-blank body lines, each `{indent, text}` where `text` has
// its leading whitespace stripped and `indent` is that whitespace's length.
// Nesting is by deeper indentation; sequences use `- `. Values reuse the flow
// grammar, so `tags: [a, b]` and an indented `- ` list produce the same thing.

const isSeqLine = (t) => t === '-' || t.startsWith('- ');

const parseStructure = (items) => {
  let idx = 0;

  const parseNode = (indent) => (isSeqLine(items[idx].text) ? parseSeq(indent) : parseMap(indent));

  const parseMap = (indent) => {
    const obj = {};
    while (idx < items.length && items[idx].indent === indent && !isSeqLine(items[idx].text)) {
      const t = items[idx].text;
      const ci = t.indexOf(':');
      const key = ci === -1 ? t.trim() : t.slice(0, ci).trim();
      const rest = ci === -1 ? '' : t.slice(ci + 1).trim();
      idx++;
      if (rest === '') {
        obj[key] = idx < items.length && items[idx].indent > indent ? parseNode(items[idx].indent) : null;
      } else {
        obj[key] = parseFlowOrScalar(rest);
      }
    }
    return obj
  };

  const parseSeq = (indent) => {
    const arr = [];
    while (idx < items.length && items[idx].indent === indent && isSeqLine(items[idx].text)) {
      const t = items[idx].text;
      const rest = t === '-' ? '' : t.slice(2).trim();
      idx++;
      if (rest === '') {
        arr.push(idx < items.length && items[idx].indent > indent ? parseNode(items[idx].indent) : null);
      } else {
        arr.push(parseFlowOrScalar(rest));
      }
    }
    return arr
  };

  return items.length === 0 ? {} : parseNode(items[0].indent)
};

// Shorthand parser — Pug/Emmet-style id and class on a component's opening line.
//
//   .Heading #myid .cool.fun   ->   { id: 'myid', class: 'cool fun' }
//
// Tokens may be space-separated or attached (`.Heading.cool#myid`). `#id` sets
// the id (last one wins); each `.name` adds a class. Identifier characters are
// [A-Za-z0-9_-], and a `.` ends the current class — so `.cool.fun` is two
// classes. Parsing stops at the first token that is not `#`/`.`, leaving the
// remainder to be parsed as the inline body.

const isWs = (c) => c === ' ' || c === '\t';
const isIdent = (c) => /[\w-]/.test(c);

const parseShorthand = (s) => {
  let p = 0;
  const len = s.length;
  let id = null;
  const classes = [];

  while (p < len && isWs(s[p])) p++;
  while (p < len && (s[p] === '#' || s[p] === '.')) {
    const marker = s[p++];
    const start = p;
    while (p < len && isIdent(s[p])) p++;
    const ident = s.slice(start, p);
    if (!ident) {
      p = start - 1; // a lone marker — hand it back to the inline body
      break
    }
    if (marker === '#') id = ident;
    else classes.push(ident);
    while (p < len && isWs(s[p])) p++;
  }

  const shorthand = {};
  if (id !== null) shorthand.id = id;
  if (classes.length) shorthand.class = classes.join(' ');
  return { shorthand, rest: s.slice(p) }
};

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

// Turn a component's raw body lines into `{indent, text}` items, dropping
// blank lines (insignificant to the structure) and recording each line's
// indentation so nesting can be reconstructed.
const toItems = (bodyLines) =>
  bodyLines
    .filter((l) => !isBlank(l))
    .map((l) => {
      const stripped = l.text.trimStart();
      return { indent: l.text.length - stripped.length, text: stripped }
    });

// Read a `.name` component starting at line `i`. The body is the run of
// following indented/blank lines, up to the next column-zero line.
const readComponent = (lines, i, line) => {
  const m = line.text.match(COMPONENT_RE);
  const name = m[1];
  // peel off `#id`/`.class` shorthand; whatever is left is the inline body
  const { shorthand, rest } = parseShorthand(line.text.slice(m[0].length));
  const inline = rest.trim();

  let j = i + 1;
  while (j < lines.length && (isBlank(lines[j]) || isIndented(lines[j]))) j++;
  const bodyLines = lines.slice(i + 1, j);

  // inline body (bare or braced) is always a map; the block body may be a map
  // or, when it opens with `- `, a top-level array
  const inlineProps = inline ? (inline[0] === '{' ? flowParser(inline).value() : flowParser(inline).implicitMap()) : null;
  const blockProps = bodyLines.some((l) => !isBlank(l)) ? parseStructure(toItems(bodyLines)) : null;

  // Assemble properties by precedence: shorthand (lowest) < block < inline.
  // A top-level sequence body has no keys to merge, so it survives only when
  // there are no map sources to combine it with.
  const mapLayers = [shorthand];
  let arrayBody = null;
  if (blockProps) {
    if (Array.isArray(blockProps)) arrayBody = blockProps;
    else mapLayers.push(blockProps);
  }
  if (inlineProps) mapLayers.push(inlineProps);

  const hasMapKeys = mapLayers.some((l) => Object.keys(l).length > 0);
  const properties = arrayBody && !hasMapKeys ? arrayBody : Object.assign({}, ...mapLayers);

  const last = lines[j - 1];
  const block = {
    type: 'component',
    name,
    properties,
    start: line.start,
    end: last.end,
    nameRange: [line.start, line.start + m[0].length],
    bodyRange: bodyLines.length ? [bodyLines[0].start, last.end] : null,
  };
  return { block, next: j }
};

// Collect a contiguous run of `#` comment lines into one block, stripping the
// leading marker from each line.
const readComment = (lines, i) => {
  let j = i;
  while (j < lines.length && isComment(lines[j])) j++;
  const run = lines.slice(i, j);
  const block = {
    type: 'comment',
    contents: run.map((l) => l.text.replace(/^#[ \t]?/, '')).join('\n'),
    start: run[0].start,
    end: run[run.length - 1].end,
  };
  return { block, next: j }
};

// Prose runs until the next component or comment line, preserving the source
// text (newlines and tabs included) verbatim.
const readProse = (lines, i, input) => {
  let j = i;
  while (j < lines.length && !isComponent(lines[j]) && !isComment(lines[j])) j++;
  const run = lines.slice(i, j);
  const start = run[0].start;
  const end = run[run.length - 1].end;
  const block = { type: 'prose', contents: input.slice(start, end), start, end };
  return { block, next: j }
};

const parseRug = (input) => {
  if (typeof input !== 'string') return []
  const lines = splitLines(input);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    let result;
    if (isComponent(line)) result = readComponent(lines, i, line);
    else if (isComment(line)) result = readComment(lines, i);
    else result = readProse(lines, i, input);
    blocks.push(result.block);
    i = result.next;
  }

  return blocks
};

export { parseRug as default };
