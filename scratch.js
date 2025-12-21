// import parseRug from './builds/index.js';
import parseRug from './src/index.js';

const txt = `
hello world
this is below

and so is this.

   and this is really indented.


.container.mx-4
  But this is within a container
  .card.p-2
    Nested content
    with multiple lines
`;

console.log('\n=== Output ===');
console.log(parseRug(txt));