import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'esm',
        intro: 'const __dirname = ""; const __filename = "";'
      }
    }
  }
})