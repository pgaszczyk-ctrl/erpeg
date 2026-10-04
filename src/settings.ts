import { PLAYER } from './objects/Player';
import { PX_PER_M } from './map/CityMap';
import { PRZEDMIOTY } from './content/przedmioty';
import { OWOCE, WSKRZESZENIE, DIAMENT, ALCHEMIK, LECZENIE_OWOCAMI, LAS } from './content/sklepy';
import { NAMIOT } from './content/hotele';
import { ZUZYCIE, STRZALY } from './content/zuzycie';
import { POKRETLA } from './content/ustawienia';
import { rpc } from './api';

// Wpisuje pokrętła z panelu admina (content/ustawienia.ts) w stałe gry.

// Ceny bazowe (do mnożników) – zapamiętane przed jakąkolwiek zmianą.
const CENY_PRZEDMIOTOW = new Map(PRZEDMIOTY.map((p) => [p.id, p.cena]));
const WYTRZYMALOSC = new Map(PRZEDMIOTY.map((p) => [p.id, p.wytrzymalosc]));
const CENY_ZBIOROW = new Map(Object.entries(OWOCE).map(([k, o]) => [k, o.cena]));

const USTAW: Record<string, (v: number) => void> = {
  predkosc_kmh: (v) => (PLAYER.speed = (v / 3.6) * PX_PER_M),
  wskrzeszenie_diamenty: (v) => (WSKRZESZENIE.diamentow = Math.round(v)),
  diament_monet: (v) => (DIAMENT.monet = Math.round(v)),
  ceny_przedmiotow: (v) => PRZEDMIOTY.forEach((p) => (p.cena = Math.round((CENY_PRZEDMIOTOW.get(p.id) ?? p.cena) * v))),
  ceny_zbiorow: (v) => Object.entries(OWOCE).forEach(([k, o]) => (o.cena = Math.max(1, Math.round((CENY_ZBIOROW.get(k) ?? o.cena) * v)))),
  namiot_pole: (v) => (NAMIOT.cenaPola = Math.round(v)),
  alchemik_owocow: (v) => (ALCHEMIK.owocow = Math.round(v)),
  leczenie_owocow: (v) => (LECZENIE_OWOCAMI.owocow = Math.round(v)),
  grzybow_na_kratke: (v) => (LAS.grzybowNaKratke = Math.round(v)),
  uderzen_na_drzewo: (v) => (LAS.uderzenNaDrzewo = Math.round(v)),
  wytrzymalosc_mnoznik: (v) => PRZEDMIOTY.forEach((p) => {
    const base = WYTRZYMALOSC.get(p.id);
    if (base && !p.szklany) p.wytrzymalosc = Math.max(1, Math.round(base * v));
  }),
  naprawa_czesc_ceny: (v) => (ZUZYCIE.naprawaCzescCeny = v),
  strzala_cena: (v) => (STRZALY.cena = Math.round(v)),
  kolczan: (v) => (STRZALY.kolczan = Math.round(v)),
};

/** Wpisuje wartości z serwera (brakujące = domyślne). */
export function applySettings(values: Record<string, number>) {
  for (const p of POKRETLA) {
    const v = Number(values[p.k]);
    USTAW[p.k]?.(Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.domyslnie);
  }
}

let loading: Promise<void> | null = null;

/** Pokrętła z serwera, raz na start gry (najwyżej 5 s czekania; bez serwera – domyślne). */
export function loadSettings() {
  loading ??= Promise.race([
    rpc<Record<string, number>>('game_settings', {}),
    new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 5000)),
  ])
    .then((v) => applySettings(v ?? {}))
    .catch(() => {
      applySettings({});
      loading = null; // try again next time
    });
  return loading;
}
