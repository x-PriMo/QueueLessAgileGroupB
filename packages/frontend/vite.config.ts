import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    }
  }
});
