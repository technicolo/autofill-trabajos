import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: '', // importante para extensiones (rutas relativas)
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // tu popup.html está en la raíz del proyecto
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
    },
  },
})
