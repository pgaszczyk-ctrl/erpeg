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
// Two pages: the game (index.html) and the admin panel (admin.html).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  // version.json next to the page: a running game checks it for a new version (src/update.ts).
  plugins: [{ name: 'version-json', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) }); } }],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } },
  },
});
