/**
 * Start anywhere (owner, 8 Nov 2026: „zezwól na start w dowolnym miejscu, pozwól wpisywać też nazwę miasta”):
 * a typed town is looked up in public/miasta-start.json (cities >= 100k worldwide, Polish towns >= 1500,
 * Polish names of big foreign cities – scripts/miasta-start.py), else in OpenStreetMap's Nominatim
 * (also streets abroad, e.g. „Rue de Rivoli, Paris”).
 */
import { sciezkaGry } from './sciezka';

export type MiejsceStartu = { nazwa: string; lat: number; lon: number };

const zloz = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, ' ').trim();

let lista: Promise<[string, number, number, number][]> | null = null;
function wczytaj() {
  lista ??= fetch(`${sciezkaGry()}miasta-start.json`).then((r) => (r.ok ? r.json() : [])).catch(() => { lista = null; return []; });
  return lista;
}
/** Starts the download early (the form is open, the player is still typing). */
export function przygotujMiasta() { void wczytaj(); }

/** A town from the offline list: the whole text, else its last comma part („Rue X, Paris”). */
export async function miastoZListy(q: string): Promise<MiejsceStartu | null> {
  const l = await wczytaj();
  const kandydaci = [q, ...q.split(',').map((p) => p.trim()).reverse()].map(zloz).filter(Boolean);
  for (const k of kandydaci)
    for (const [nazwy, lat, lon] of l) {
      const n = nazwy.split('|');
      if (n.some((x) => zloz(x) === k)) return { nazwa: n[n.length > 1 && /[ąćęłńóśźż]/i.test(n[n.length - 1]) ? n.length - 1 : 0], lat, lon };
    }
  return null;
}

/** Any place on Earth by OpenStreetMap's geocoder (one request, on the player's tap). */
export async function miejsceZOsm(q: string, jezyk: string): Promise<MiejsceStartu | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${jezyk}&q=${encodeURIComponent(q)}`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const a = (await r.json()) as { lat: string; lon: string; name?: string; display_name?: string }[];
    if (!a[0]) return null;
    const lat = Number(a[0].lat), lon = Number(a[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { nazwa: a[0].name || a[0].display_name?.split(',')[0] || q, lat, lon };
  } catch {
    return null;
  }
}

export async function znajdzMiejsceStartu(q: string, jezyk: string) {
  return (await miastoZListy(q)) ?? (await miejsceZOsm(q, jezyk));
}
