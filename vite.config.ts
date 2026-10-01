import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /<repo>/; the native app is served from /.
  base: process.env.BASE_PATH ?? '/',
  build: {
    // three.js makes the globe bundle ~2 MB; that's expected.
    chunkSizeWarningLimit: 2500,
  },
})
