# rug demo

A small [Nuxt](https://nuxt.com) app that doubles as an integration test for
`rug-lang`: an editable source pane on the left, and the parsed result on the
right — toggle between the raw **parsed** blocks (JSON) and a **rendered** Vue
view.

It also demonstrates the two integration surfaces:

- **`plugins/rug.ts`** — a Nuxt plugin that provides the parser app-wide as
  `$rug`, consumed in [`app.vue`](app.vue).
- **`components/RugRenderer.vue`** — maps rug component blocks to Vue/HTML
  templates via a small registry (`.heading`, `.button`, `.card`), with a
  labelled fallback for unknown components.

## Run

From the repo root (a pnpm workspace):

```sh
pnpm install
pnpm --filter rug-demo dev      # http://localhost:3000
```

Because `rug-demo` depends on `rug-lang` via `workspace:*`, edits to the parser
in `../src` are picked up live.
