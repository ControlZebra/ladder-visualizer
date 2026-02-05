import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  onSuccess: async () => {
    // Copy CSS files to dist
    mkdirSync('dist/styles', { recursive: true });
    copyFileSync('src/styles/variables.css', 'dist/styles/variables.css');
    copyFileSync('src/styles/index.css', 'dist/styles/index.css');
    console.log('✓ CSS files copied to dist/styles/');
  },
});
