import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// room-plugin.js lama (REST /api/room) sudah digantikan PeerJS dan tidak dipakai lagi.
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
})
