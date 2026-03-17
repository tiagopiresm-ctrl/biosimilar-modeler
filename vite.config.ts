import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/biosimilar-modeler/',
  plugins: [react(), tailwindcss()],
})
