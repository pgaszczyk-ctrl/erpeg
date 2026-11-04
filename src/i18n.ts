// Language of the device: Polish for Polish devices, English for all others.
// Texts that exist in both languages are written as { pl, en }.

export type Lang = 'pl' | 'en';
export type Txt = { pl: string; en: string };

function detect(): Lang {
  try {
    const forced = new URLSearchParams(location.search).get('lang');
    if (forced === 'pl' || forced === 'en') return forced;
  } catch {
    // no location (tests)
  }
  try { const saved = localStorage.getItem('exp-language'); if (saved === 'pl' || saved === 'en') return saved; } catch { /* private mode */ }
  const langs = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith('pl')) ? 'pl' : 'en';
}

export let lang: Lang = detect();
/** Explicit device choice takes precedence over a profile loaded later. */
export function setLanguage(saved?: Lang) {
  try {
    const forced = new URLSearchParams(location.search).get('lang');
    const selected = localStorage.getItem('exp-language');
    if (forced === 'pl' || forced === 'en' || selected === 'pl' || selected === 'en') return;
  } catch { /* tests/private mode */ }
  if (saved === 'pl' || saved === 'en') lang = saved;
}

/** The text in the device's language. */
export function tr(t: Txt | string): string {
  return typeof t === 'string' ? t : t[lang];
}

/** Inline two-language text: tx('Tak', 'Yes'). */
export function tx(pl: string, en: string) {
  return lang === 'pl' ? pl : en;
}

/**
 * Server missions (and other stored content) may give any text as { pl, en } (owner, 1 Nov 2026: „wszystko musi być
 * po polsku i angielsku”). This walks the whole object and puts the player's language in place of every such pair,
 * so the rest of the game keeps reading plain strings. Anything else is copied unchanged.
 */
export function wybierzJezyk<T>(v: T): T {
  if (Array.isArray(v)) return v.map(wybierzJezyk) as T;
  if (!v || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 2 && typeof o.pl === 'string' && typeof o.en === 'string') return o[lang] as T;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = wybierzJezyk(o[k]);
  return out as T;
}
