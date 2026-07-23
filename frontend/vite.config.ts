import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const WORKER_URL = process.env.VITE_WORKER_URL || 'https://tata-aig-voice-agent.whatsappai.workers.dev'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/health': { target: WORKER_URL, changeOrigin: true, secure: true },
      '/voice': { target: WORKER_URL, changeOrigin: true, secure: true },
      '/api': { target: WORKER_URL, changeOrigin: true, secure: true },
    },
  },
})

