import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: resolve(rootDir, 'src/renderer'),
  build: {
    outDir: resolve(rootDir, 'dist-renderer'),
    emptyOutDir: true,
  },
})
