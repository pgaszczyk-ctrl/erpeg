/** Small, unchanged PNGs in one cached module instead of 62 serial HTTP requests.
 * Inline bytes preserve the artist's exact pixels; no resampling or palette change.
 * Kept in a dynamic chunk so menu/boot do not wait for the generator's artwork.
 */
const files = import.meta.glob<string>(['/public/uprawy/*.png', '/public/swiat/ozdoby/*.png'], {
  eager: true, query: '?inline', import: 'default',
});
export const rysunki: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, data]) => [path.split('/').pop()!.replace(/\.png$/, ''), data]),
);
