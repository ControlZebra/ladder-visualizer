import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '.performance-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'tests/visual/fbd.html'),
    },
  },
});
