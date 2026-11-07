import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    https: false,
    proxy: {
      '/sachet': {
        target: 'https://sachet.ndma.gov.in',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/sachet/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        redirect: fileURLToPath(new URL('./redirect.html', import.meta.url))
      }
    }
  }
});
