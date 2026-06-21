<script setup>
import { computed, ref } from 'vue'

const sample = `Welcome to rug — edit on the left, watch it parse on the right.

Plain text stays as prose, and line breaks are preserved
exactly as you type them.

# this line is a comment, lifted out of the prose

.heading #title .accent
  text: Hello, rug
  level: 1

.button label: Try the inline form, href: #

.card
  title: Block form
  body: Properties parse as a small, predictable YAML-like structure.
  tags: [demo, nuxt, vue]
`

const source = ref(sample)

// the parser, provided app-wide by plugins/rug.ts
const { $rug } = useNuxtApp()
const blocks = computed(() => $rug(source.value))
const json = computed(() => JSON.stringify(blocks.value, null, 2))

const view = ref('parsed') // 'parsed' | 'rendered'
</script>

<template>
  <main class="page">
    <header class="bar">
      <h1>rug</h1>
      <span class="tag">live parser demo</span>
      <span class="count">{{ blocks.length }} block{{ blocks.length === 1 ? '' : 's' }}</span>
    </header>

    <section class="panes">
      <div class="pane">
        <div class="pane-head">source</div>
        <textarea v-model="source" spellcheck="false" class="editor" />
      </div>

      <div class="pane">
        <div class="pane-head">
          <button :class="['toggle', { on: view === 'parsed' }]" @click="view = 'parsed'">parsed</button>
          <button :class="['toggle', { on: view === 'rendered' }]" @click="view = 'rendered'">rendered</button>
        </div>
        <pre v-if="view === 'parsed'" class="output">{{ json }}</pre>
        <div v-else class="output rendered">
          <RugRenderer :source="source" />
        </div>
      </div>
    </section>
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#__nuxt {
  height: 100%;
  margin: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a;
  background: #f4f5f7;
}
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.bar {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  background: #1a1a1a;
  color: #fff;
}
.bar h1 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: 0.02em;
}
.bar .tag {
  font-size: 0.8rem;
  opacity: 0.6;
}
.bar .count {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.6;
}
.panes {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #ddd;
  min-height: 0;
}
.pane {
  display: flex;
  flex-direction: column;
  background: #fff;
  min-height: 0;
}
.pane-head {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.4rem 0.8rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  border-bottom: 1px solid #eee;
}
.toggle {
  font: inherit;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  background: none;
  color: #aaa;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}
.toggle.on {
  color: #1a1a1a;
  background: #eee;
}
.editor,
.output {
  flex: 1;
  margin: 0;
  padding: 1rem;
  border: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  overflow: auto;
  min-height: 0;
}
.editor {
  resize: none;
  outline: none;
  white-space: pre;
  tab-size: 2;
}
.output {
  white-space: pre-wrap;
  color: #333;
  background: #fcfcfc;
}
.output.rendered {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  white-space: normal;
}
</style>
