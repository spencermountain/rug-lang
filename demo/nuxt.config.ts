// Minimal Nuxt config for the rug demo.
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  // rug-lang is plain ESM in the workspace — let Vite transpile it
  build: { transpile: ['rug-lang'] },
  app: {
    head: {
      title: 'rug — live parser demo',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
})
