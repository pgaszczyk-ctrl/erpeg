import { rpc } from './api';
import { POGODA, type Pogoda } from './content/pogoda';

// The weather where the hero is: the server fetches MET Norway forecasts for
// squares of ~33 × 31 km three times a day (RPC `weather`, see CLAUDE.md), the
// game only reads the hourly list and picks the current hour.

interface Hour {
  /** Start of the hour (epoch s). */
  t: number;
  /** °C, mm of rain in the hour, MET symbol, wind m/s, cloud %, snow on the ground (cm). */
  c: number;
  p: number;
  s: string | null;
  w: number;
  k: number;
  n: number;
}

export const weather = {
  kind: 'czysto' as Pogoda,
  temp: null as number | null,
  /** mm/h */
  rain: 0,
  /** Snow on the ground (cm) and its level: 0 none, 1 light, 2 heavy. */
  snowCm: 0,
  snowLevel: 0 as 0 | 1 | 2,
  /** Wind (m/s) from the forecast; moves the tree crowns (overhaul 09). `?wiatr=<m/s>` forces it. */
  wind: 3,
  /** true once real data arrived (else the defaults above). */
  real: false,
  /** Forced by ?pogoda= (tests, showing it off). */
  forced: null as Pogoda | null,
};

const KINDS: Pogoda[] = ['czysto', 'pochmurno', 'deszcz', 'ulewa', 'burza', 'snieg', 'mgla'];
{
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('pogoda');
  if (q && (KINDS as string[]).includes(q)) weather.forced = q as Pogoda;
}

const forcedWind = (() => {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('wiatr');
  return q !== null && Number.isFinite(+q) ? +q : null;
})();
if (forcedWind !== null) weather.wind = forcedWind;

let hours: Hour[] = [];
let cell = '';
let fetchedAt = 0;
let asking: Promise<void> | null = null;

/** What kind of weather an hour of the forecast is. */
export function classify(h: Hour): Pogoda {
  const s = h.s ?? '';
  if (s.includes('thunder')) return 'burza';
  if (s.includes('snow') || (h.p >= POGODA.padaOdMm && h.c <= 0.5 && !s.includes('rain'))) return 'snieg';
  if (s.includes('fog')) return 'mgla';
  if (h.p >= POGODA.ulewaOdMm || s.includes('heavyrain')) return 'ulewa';
  if (h.p >= POGODA.padaOdMm || s.includes('rain') || s.includes('sleet')) return 'deszcz';
  if (h.k >= POGODA.pochmurnoOd || s.includes('cloudy') && !s.includes('partly')) return 'pochmurno';
  return 'czysto';
}

/** Re-reads the current hour from the forecast we have (call every few minutes). Returns true if the weather kind changed. */
export function tickWeather(now = Date.now()): boolean {
  const before = weather.kind;
  const t = now / 1000;
  let h: Hour | undefined;
  for (const x of hours) if (x.t <= t) h = x;
  h ??= hours[0];
  if (h) {
    weather.kind = classify(h);
    weather.temp = h.c;
    weather.rain = h.p;
    weather.snowCm = h.n ?? 0;
    weather.wind = h.w ?? 3;
    weather.real = true;
  }
  const S = POGODA.snieg;
  weather.snowLevel = weather.snowCm >= S.duzyOdCm ? 2 : weather.snowCm >= S.drobnyOdCm ? 1 : 0;
  if (forcedWind !== null) weather.wind = forcedWind;
  if (weather.forced) {
    weather.kind = weather.forced;
    if (weather.forced === 'snieg') weather.temp = Math.min(weather.temp ?? -2, -1);
  }
  return weather.kind !== before;
}

/** Asks the server for the weather at (lat, lon) – at most once an hour for the same square. */
export function loadWeather(lat: number, lon: number): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Promise.resolve();
  const want = `${Math.floor(lat / 0.3)}:${Math.floor(lon / 0.45)}`;
  if (want === cell && Date.now() - fetchedAt < POGODA.odswiezMin * 60_000) return Promise.resolve();
  if (asking) return asking;
  asking = rpc<{ cell: string; h: Hour[] } | null>('weather', { p_lat: lat, p_lon: lon })
    .then((r) => {
      if (r?.h?.length) {
        hours = r.h;
        cell = r.cell;
        fetchedAt = Date.now();
      } else if (want !== cell) {
        // A square nobody played in yet: the server fetches it now, ask again in a few minutes.
        cell = '';
        hours = [];
        fetchedAt = Date.now() - (POGODA.odswiezMin - 3) * 60_000;
      }
      tickWeather();
    })
    .catch(() => {})
    .finally(() => (asking = null));
  return asking;
}

/** "🌧 8°C" for the HUD. */
export function weatherLabel(night: boolean): string {
  if (!weather.real && !weather.forced) return '';
  const o = POGODA.opis[weather.kind];
  const t = weather.temp === null ? '' : ` ${Math.round(weather.temp)}°C`;
  return `${night ? o.noc : o.ikona}${t}`;
}

export const isWet = () => weather.kind === 'deszcz' || weather.kind === 'ulewa' || weather.kind === 'burza';
