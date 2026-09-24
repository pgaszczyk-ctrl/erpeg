import { defineConfig } from 'vite';

// base: './' so the built game works from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
