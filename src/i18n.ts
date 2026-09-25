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
  const langs = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith('pl')) ? 'pl' : 'en';
}

export const lang: Lang = detect();

/** The text in the device's language. */
export function tr(t: Txt | string): string {
  return typeof t === 'string' ? t : t[lang];
}

/** Inline two-language text: tx('Tak', 'Yes'). */
export function tx(pl: string, en: string) {
  return lang === 'pl' ? pl : en;
}
