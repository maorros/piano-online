import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,  // Expose on local network (accessible from mobile)
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      // Polyfill Node.js 'events' module for @tonejs/piano's MidiInput
      events: 'events',
    },
  },
  optimizeDeps: {
    include: ['events'],
  },
})
