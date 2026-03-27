import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['motion'],
          charts: ['recharts'],
          maps: ['leaflet'],
          analytics: ['posthog-js'],
        }
      }
    },
    target: 'es2020',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'motion', 'recharts', 'leaflet', 'posthog-js'],
  },
})
