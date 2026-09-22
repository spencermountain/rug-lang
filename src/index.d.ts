// ESM entry point; shared declarations live in the CommonJS entry point.
import parseRug from './index.cjs'

export default parseRug
export type {
  Range,
  RugValue,
  RugMap,
  RugProperties,
  ProseBlock,
  CommentBlock,
  ComponentBlock,
  Block,
} from './index.cjs'
