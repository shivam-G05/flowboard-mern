import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser talks to one origin (localhost:5173); Vite forwards /api to Express.
    // Same-origin means the auth cookie just works and no CORS preflight is needed in development.
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app code changes don't invalidate the cached libraries.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          dnd: ['@dnd-kit/core'],
        },
      },
    },
  },
});
