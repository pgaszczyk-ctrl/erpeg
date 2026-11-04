/** One road-material policy for prepared maps and streamed world tiles. */
export function nawierzchniaDrogi(kind: string): 'bruk' | 'chodnik' | 'droga' | null {
  switch (kind) {
    // The same street classes that Lublin's prepared paving polygons cover.
    case 'major': case 'medium': case 'minor': return 'bruk';
    case 'pedestrian': return 'chodnik';
    case 'service': case 'track': case 'path': case 'steps': case 'tram': return 'droga';
    default: return null;
  }
}
