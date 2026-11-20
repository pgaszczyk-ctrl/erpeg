// Ulice i miejsca w alfabecie łacińskim z oryginałem obok (raport 19.11.2026: w Burgas ulice tylko cyrylicą –
// „Dunaw (Дунав)”). Cyrylica (bułgarska, rosyjska, ukraińska, serbska) i greka; w polskim interfejsie polska
// transkrypcja (Dunaw, Christo Botew), w angielskim łacińska (Dunav, Hristo Botev). Bez Phasera.
import { lang } from './i18n';

const CYR_PL: Record<string, string> = {
  а: 'a', б: 'b', в: 'w', г: 'g', д: 'd', е: 'e', ж: 'ż', з: 'z', и: 'i', й: 'j', к: 'k', л: 'ł', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'ch', ц: 'c', ч: 'cz', ш: 'sz', щ: 'szcz', ъ: 'y', ь: '', ю: 'ju', я: 'ja',
  ё: 'jo', ы: 'y', э: 'e', є: 'je', і: 'i', ї: 'ji', ґ: 'g', ђ: 'dź', ј: 'j', љ: 'l', њ: 'ń', ћ: 'ć', џ: 'dż', ў: 'ł',
};
const CYR_EN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
  ё: 'yo', ы: 'y', э: 'e', є: 'ye', і: 'i', ї: 'yi', ґ: 'g', ђ: 'dj', ј: 'j', љ: 'lj', њ: 'nj', ћ: 'c', џ: 'dz', ў: 'w',
};
const GR: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
  ά: 'a', έ: 'e', ή: 'i', ί: 'i', ό: 'o', ύ: 'y', ώ: 'o', ϊ: 'i', ϋ: 'y', ΐ: 'i', ΰ: 'y',
};

/** Latin letters only (no Cyrillic/Greek to read): null. */
export function naLacinke(s: string): string | null {
  if (!/[Ͱ-ϿЀ-ӿ]/.test(s)) return null;
  const cyr = lang === 'pl' ? CYR_PL : CYR_EN;
  let out = '';
  for (const ch of s) {
    const low = ch.toLowerCase();
    const t = cyr[low] ?? GR[low];
    if (t === undefined) { out += ch; continue; }
    out += ch !== low && t ? t[0].toUpperCase() + t.slice(1) : t;
  }
  return out;
}

/** "Dunaw (Дунав)" for a non-Latin name, the name itself otherwise. */
export function czytelnaNazwa(s: string): string {
  const l = naLacinke(s);
  return l ? `${l} (${s})` : s;
}
