// Type definitions for rug — an experimental prose-first markup language.

/**
 * A character offset range into the source string, `[start, end)`.
 */
export type Range = [start: number, end: number]

/**
 * Any value a component property can hold. Scalars are coerced predictably:
 * only `true`/`false`/`null` and numbers are special — everything else bare is
 * a string. Maps and sequences nest arbitrarily.
 */
export type RugValue = string | number | boolean | null | RugValue[] | RugMap

/**
 * A mapping of string keys to values.
 */
export interface RugMap {
  [key: string]: RugValue
}

/**
 * A component's parsed body. Usually a map; it is an array when the body's
 * first line is a top-level sequence (`- ...`).
 */
export type RugProperties = RugMap | RugValue[]

/**
 * Fields shared by every block.
 */
interface BlockBase {
  /** Inclusive character offset of the block's first character. */
  start: number
  /** Exclusive character offset just past the block's last character. */
  end: number
}

/**
 * A run of plain text. `contents` is verbatim — newlines, blank lines, and
 * indentation are preserved.
 */
export interface ProseBlock extends BlockBase {
  type: 'prose'
  contents: string
}

/**
 * One or more contiguous `#` comment lines. The leading `# ` marker is stripped
 * from each line; multiple lines are joined with `\n`.
 */
export interface CommentBlock extends BlockBase {
  type: 'comment'
  contents: string
}

/**
 * A component introduced by a column-zero `.name`. Its body — written inline or
 * as an indented block — is parsed into `properties`.
 */
export interface ComponentBlock extends BlockBase {
  type: 'component'
  /** The component name, without the leading period. */
  name: string
  /** The parsed body. `{}` when the component has no body. */
  properties: RugProperties
  /** Source range of the `.name` marker. */
  nameRange: Range
  /** Source range of the body, or `null` when there is no body. */
  bodyRange: Range | null
}

/**
 * A parsed block. The document is a flat, ordered array of these.
 */
export type Block = ProseBlock | CommentBlock | ComponentBlock

/**
 * Parse rug source into a flat array of blocks in source order.
 *
 * Non-string input returns an empty array.
 *
 * @param input rug source text
 * @returns the document's blocks, each carrying source offsets
 */
export default function parseRug(input: string): Block[]
