<script>
// RugRenderer — turns rug source into actual Vue output, demonstrating the
// "rug component -> Vue/HTML template" integration.
//
// Prose becomes <p> (whitespace preserved). Comments are dropped from the
// rendered view. Each component name is looked up in a small registry that maps
// it to a render function; unknown names fall back to a labelled box showing
// the parsed properties.
import { defineComponent, h } from 'vue'
import parseRug from 'rug-lang'

// name -> (properties) => vnode
const registry = {
  heading: (p) => h('h' + Math.min(Math.max(Number(p.level) || 2, 1), 6), { id: p.id, class: p.class }, p.text ?? ''),
  button: (p) => h('a', { class: 'demo-btn', href: p.href || '#' }, p.label ?? 'button'),
  card: (p) =>
    h('div', { class: 'demo-card' }, [
      p.title ? h('h3', p.title) : null,
      p.body ? h('p', p.body) : null,
      Array.isArray(p.tags) ? h('div', { class: 'demo-tags' }, p.tags.map((t) => h('span', { class: 'demo-tag' }, String(t)))) : null,
    ]),
}

const fallback = (name, props) =>
  h('div', { class: 'demo-unknown' }, [h('code', '.' + name), h('pre', JSON.stringify(props, null, 2))])

export default defineComponent({
  name: 'RugRenderer',
  props: { source: { type: String, default: '' } },
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'rug-render' },
        parseRug(props.source).map((b, i) => {
          if (b.type === 'prose') return h('p', { key: i, class: 'demo-prose' }, b.contents)
          if (b.type === 'comment') return null // comments are not rendered
          const fn = registry[b.name]
          return fn ? h('div', { key: i }, [fn(b.properties)]) : fallback(b.name, b.properties)
        })
      )
  },
})
</script>

<style scoped>
.rug-render :deep(.demo-prose) {
  white-space: pre-wrap;
  margin: 0 0 0.75rem;
  line-height: 1.5;
}
.rug-render :deep(h1),
.rug-render :deep(h2),
.rug-render :deep(h3) {
  margin: 0.5rem 0;
}
.rug-render :deep(.demo-btn) {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  background: #2d6cdf;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
}
.rug-render :deep(.demo-card) {
  border: 1px solid #e2e2e2;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: #fafafa;
}
.rug-render :deep(.demo-tags) {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}
.rug-render :deep(.demo-tag) {
  font-size: 0.75rem;
  background: #eef2ff;
  color: #3949ab;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}
.rug-render :deep(.demo-unknown) {
  border: 1px dashed #c9c9c9;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  background: #fff;
}
.rug-render :deep(.demo-unknown code) {
  color: #b5179e;
  font-weight: 600;
}
.rug-render :deep(.demo-unknown pre) {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: #444;
}
</style>
