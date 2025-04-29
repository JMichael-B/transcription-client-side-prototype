import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/qurious-transcription-tester/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 9973,
    allowedHosts: ['lexcode-ph.ddns.net'],
  },
})