An experimental markup language for thoughtlessly writing html, inspired by [pug-js](https://pugjs.org/api/getting-started.html) and <a href="https://en.wikipedia.org/wiki/Literate_programming"><i>literate programming</i></a>.

it uses the `<pre>` tag to preserve whitespace when it appears meaningfully in the document, and supports the leading-period syntax for html tags.

not ready for prime-time.

## Examples

'WYSIWYG' whitespace is preserved in the HTML. Newlines and indentations are well-respected.

```
hello world
this is below

and so is this.

   and this is really indented.


.container.mx-4
  But this is within a container
  .card.p-2
    Nested content
    with multiple lines
```

fancy html with attributes
```
.input#email:type="email"
.button.primary:type=submit
   Submit
```

inline html is also cool
```pug
oh hello there, <a href="#">world</a>
```

The main point is that you can just write plain text, and not think about it, and it will create intuitive mirror html, without bunging anything up.

Anytime you want to drop-into any some complex HTML, you're free to.

I built this because I was frustrated with **markdown** eating up whitespace. I was also interrupted by **pug** assuming any first word of a line was a tag name, and eating that up.

Primarily, I just wanted text to appear in the browser like in the text editor, unless specified otherwise.

It was built to be used in static-site generators like NUXT, but it's a standalone library that you can use in any project.

## Installation
```bash
npm install rug-lang
```

```js
import parseRug from 'rug-lang'
const html = parseRug(input)
console.log(html)
```


### Nuxt Installation
1. Install both packages:
```bash
npm install rug-lang nuxt-rug
```

2. Add to your `nuxt.config.ts`:
```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-rug'
  ]
})
```

3. Create a `.rug` file in your project:
```
// content/hello.rug
Hello world!

.container.mx-4
  This is some content
  .card.p-2
    Nested content
```

4. Use in your Vue components:
```vue
<template>
  <!-- Option 1: Inline content -->
  <Rug content="
.container.mx-4
  Hello world!
  " />

  <!-- Option 2: From a variable -->
  <Rug :content="rugContent" />

  <!-- Option 3: From a .rug file -->
  <Rug :content="content" />
</template>

<script setup>
// Option 2: Content in a variable
const rugContent = `
.alert.warning
  This is a warning message
`

// Option 3: Import from a .rug file
import content from '../content/hello.rug?raw'
</script>
```

### Attributes
Use colons to add attributes:
```
.button:type="submit":disabled="true"
  Submit

.input:required="true":type="email"
.label:for="email" Email Address
```

### Form Example
```
.form:method="post"
  .form-group
    .label:for="name" Name:
    .input#name:type="text":required="true"
  
  .form-group
    .label:for="email" Email:
    .input#email:type="email":required="true"
  
  .button.primary:type="submit"
    Submit Form
```

MIT
