/** Geography, never the visitor or the means of transport, owns a surface map. */
export const WORLD_RULES_VERSION = 1;
/** Immutable input: publishing a new archive requires an explicit world revision. */
export const WORLD_ARCHIVE = 'world-20261103.pmtiles';

export function worldMapId(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    throw new Error('Nieprawidłowe położenie na mapie');
  // Half-open 0.1° sectors, with their origin in the middle. In particular Warsaw's
  // test spawn, station and cannon no longer introduce three different projections.
  const y = Math.floor(lat * 10 + 0.5) / 10;
  const x = Math.floor(lon * 10 + 0.5) / 10;
  return `w:${y.toFixed(4)},${x.toFixed(4)}`;
}

const preparedRegions = new Map<string, (lat: number, lon: number) => boolean>();
export function registerSurfaceRegion(id: string, contains: (lat: number, lon: number) => boolean) {
  preparedRegions.set(id, contains);
}

/** A geographic quest can cross both sector edges and prepared/world source boundaries. */
export function surfaceBindingMatches(owner: string, current: string, anchors: readonly { lat: number; lon: number }[]) {
  if (owner === current) return true;
  const contains = preparedRegions.get(current);
  return anchors.some(p => current.startsWith('w:') ? worldMapId(p.lat, p.lon) === current : !!contains?.(p.lat, p.lon));
}
