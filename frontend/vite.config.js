import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/questions': 'http://localhost:8782',
      '/progress': 'http://localhost:8782',
      '/admin': 'http://localhost:8782',
    },
  },
})
