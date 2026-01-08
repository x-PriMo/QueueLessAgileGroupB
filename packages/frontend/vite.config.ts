import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Build optimizations
  build: {
    // Use esbuild for minification (default, faster than terser)
    minify: 'esbuild',
    // Drop console in production
    target: 'es2020',

    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks - cached separately
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'date-utils': ['luxon'],
        },
      },
    },

    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 500,

    // Enable source maps for debugging (optional, can disable for production)
    sourcemap: false,

    // CSS code splitting
    cssCodeSplit: true,
  },

  // Development server configuration
  server: {
    port: 5173,
    proxy: {
      '/static': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/companies': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/reservations': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/services': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/working-hours': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/worker': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/queue': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/company-requests': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    }
  },

  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'luxon'],
  },
});
