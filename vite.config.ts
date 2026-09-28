import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Which code a build is (shown on the test server): short commit + date.
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return '';
  }
})();

// base: './' so the built game works from any sub-path (e.g. GitHub Pages).
// Two pages: the game (index.html) and the admin panel (admin.html).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(`${commit} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`) },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } },
  },
});
