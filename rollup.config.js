import terser from '@rollup/plugin-terser'

export default {
  input: 'src/index.js',
  output: [
    { file: 'builds/rug-lang.mjs', format: 'esm' },
    { file: 'builds/rug-lang.cjs', format: 'cjs', exports: 'default' },
    { file: 'builds/rug-lang.min.js', format: 'iife', name: 'parseRug', plugins: [terser()] },
  ],
}
