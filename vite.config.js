// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Lắng nghe tất cả IP
    port: 5173,      // Cổng hiện tại
  },
});
