import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FIX 6: Otimizações de performance para Android 4G LATAM
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  // Vite 8 uses oxc instead of esbuild — drop console/debugger in production
  oxc: {
    transform: {
      define: {
        'import.meta.env.DEV': 'false',
      },
    },
  },
})
