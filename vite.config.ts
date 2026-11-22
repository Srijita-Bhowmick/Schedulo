import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [M-22] & [M-26]: Split vendor chunks (Three.js WebGL, Framer Motion, QR Code) & set base: './' for GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'motion-vendor': ['framer-motion'],
          'qr-vendor': ['qrcode.react'],
          'lucide-vendor': ['lucide-react'],
        },
      },
    },
  },
})
