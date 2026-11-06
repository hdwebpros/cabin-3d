import { defineConfig } from 'vite'

// source/ and work/ hold thousands of large files that the app never imports.
export default defineConfig({
  server: { watch: { ignored: ['**/source/**', '**/work/**'] } },
})
