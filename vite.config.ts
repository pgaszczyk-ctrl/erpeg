import { defineConfig } from 'vite';

// base: './' so the built game works from any sub-path (e.g. GitHub Pages).
// Two pages: the game (index.html) and the admin panel (admin.html).
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } },
  },
});
