import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { roomPlugin } from './room-plugin.js'

export default defineConfig({
  plugins: [react(), roomPlugin()],
  server: { host: '0.0.0.0', port: 5173 },
})
