/** Tiny original PNGs delivered with the cached application, instead of dozens of HTTP round trips.
 * Larger artwork keeps independent URLs/caching. This does not change a single image pixel.
 */
const files = import.meta.glob<string>([
  '/public/swiat/*.png', '/public/items/*.png', '/public/uprawy/*_dojrzala_*.png', '/public/swiat/szyldy/*.png',
], { eager: true, query: '?inline', import: 'default' });
export function bootImageUrl(path: string) {
  return files[`/public/${path}`] ?? path;
}
