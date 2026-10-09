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

const build = `${commit} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

// base: './' so the built game works from any sub-path (e.g. GitHub Pages).
// Game, admin and the separate test2 map laboratory.
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  // version.json next to the page: a running game checks it for a new version (src/update.ts).
  plugins: [{ name: 'version-json', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) }); } }],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html', test2: 'test2.html' },
      output: {
        // Phaser is large and unchanged between game updates; let browsers keep it cached.
        manualChunks(id) {
          if (id.includes('/node_modules/phaser/')) return 'phaser';
          if (id.includes('/public/') && id.includes('?inline')) return 'rysunki';
        },
      },
    },
  },
});
