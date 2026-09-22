import test from 'tape'
import TapDance from 'tap-dancer'

test.createStream().pipe(new TapDance()).pipe(process.stdout)

await import('./parser.test.js')
