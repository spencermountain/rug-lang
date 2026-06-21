// Integration point: expose the rug parser to the whole Nuxt app.
//
// Usage in any component:
//   const { $rug } = useNuxtApp()
//   const blocks = $rug(source)
import parseRug from 'rug-lang'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      rug: parseRug,
    },
  }
})
