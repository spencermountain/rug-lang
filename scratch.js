// import parseRug from './builds/index.js';
import parseRug from './src/index.js';

const txt = `
hello world
this is below

and so is this.

   and this is really indented.


.container
  this: is yaml
  list:
    - item 1
    - item 2
    - item 3
  map:
    key1: 1
    key2: 'value2'
    key3: 3
`;

console.log('\n=== Output ===');
console.log(parseRug(txt));