import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok.app'
    ],
    proxy: {
      '/webhook/whatsapp': {
        target: process.env.VITE_WEBHOOK_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
