/**
 * How explored fog is stored in the save (one string per 64×64 chunk of cells).
 *
 * Old format: the 4096 bits packed into 512 bytes, base64 (684 characters for every chunk).
 * New format (29 Oct 2026): „~” + base64 of the run lengths (alternating unseen/seen, starting with
 * unseen), each a 7-bit varint. Explored land is mostly long runs, so a fully seen chunk is „~AIAg”
 * and a typical one a few dozen characters (Arceus's 8 MB of fog → a fraction of that).
 * Both are read; the new one is written only when it is shorter. No DOM, so Node tests can use it.
 */

export const KOMORKI_KAWALKA = 64 * 64;
const BAJTY = KOMORKI_KAWALKA / 8;

function b64enc(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64dec(str: string) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Packed bits (512 bytes, bit i = byte i>>3, bit i&7) → the shorter of the two formats. */
export function kodujKawalek(bity: Uint8Array): string {
  const bajty: number[] = [];
  const dopisz = (n: number) => {
    while (n >= 0x80) {
      bajty.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    bajty.push(n);
  };
  let bit = 0, dlugosc = 0;
  for (let i = 0; i < KOMORKI_KAWALKA; i++) {
    const b = (bity[i >> 3] >> (i & 7)) & 1;
    if (b === bit) dlugosc++;
    else {
      dopisz(dlugosc);
      bit = b;
      dlugosc = 1;
    }
  }
  dopisz(dlugosc);
  const rle = '~' + b64enc(Uint8Array.from(bajty));
  const surowy = b64enc(bity);
  return rle.length < surowy.length ? rle : surowy;
}

/** Either format → packed bits (512 bytes). A damaged string gives what could be read, never throws. */
export function dekodujKawalek(s: string): Uint8Array {
  const bity = new Uint8Array(BAJTY);
  try {
    if (s.charCodeAt(0) !== 126 /* ~ */) {
      bity.set(b64dec(s).subarray(0, BAJTY));
      return bity;
    }
    const bajty = b64dec(s.slice(1));
    let i = 0, bit = 0, poz = 0;
    while (poz < bajty.length && i < KOMORKI_KAWALKA) {
      let n = 0, przes = 0, b;
      do {
        b = bajty[poz++];
        n |= (b & 0x7f) << przes;
        przes += 7;
      } while (b & 0x80 && poz < bajty.length);
      const koniec = Math.min(KOMORKI_KAWALKA, i + n);
      if (bit) for (; i < koniec; i++) bity[i >> 3] |= 1 << (i & 7);
      else i = koniec;
      bit ^= 1;
    }
  } catch {
    /* not base64: leave the chunk unseen */
  }
  return bity;
}

type Mgla = { s: number; chunks: Record<string, string> };

/** Rewrites a saved map's fog into the short format. `null` when nothing got shorter (already new). */
export function scisnijMgle(m: Mgla | undefined | null): Mgla | null {
  if (!m?.chunks) return null;
  let zmiana = false;
  const chunks: Record<string, string> = {};
  for (const [k, v] of Object.entries(m.chunks)) {
    if (typeof v !== 'string' || v.charCodeAt(0) === 126) {
      chunks[k] = v;
      continue;
    }
    const nowy = kodujKawalek(dekodujKawalek(v));
    if (nowy.length < v.length) zmiana = true;
    chunks[k] = nowy;
  }
  return zmiana ? { s: m.s, chunks } : null;
}
