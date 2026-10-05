// Photos from the camera button (the "Pochwal się" cards), kept on this device for the
// Kufer's "Aparat" tab: the last ZDJEC_MAX, as smaller JPEGs in localStorage
// (it can be full or switched off: then the gallery just stays empty).

const KEY = 'exp-zdjecia';
const ZDJEC_MAX = 8;
const BOK = 720;

export interface Zdjecie {
  url: string;
  title: string;
  at: number;
}

export function zdjecia(): Zdjecie[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function zapisz(list: Zdjecie[]) {
  // Too big for the storage: drop the oldest until it fits.
  for (let l = list; l.length; l = l.slice(0, -1)) {
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
      return;
    } catch {
      /* full */
    }
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no storage */
  }
}

/** Keeps a card (newest first). */
export function zachowajZdjecie(card: HTMLCanvasElement, title: string) {
  const c = document.createElement('canvas');
  const k = Math.min(1, BOK / card.width);
  c.width = Math.round(card.width * k);
  c.height = Math.round(card.height * k);
  c.getContext('2d')!.drawImage(card, 0, 0, c.width, c.height);
  zapisz([{ url: c.toDataURL('image/jpeg', 0.85), title, at: Date.now() }, ...zdjecia()].slice(0, ZDJEC_MAX));
}

export function usunZdjecie(at: number) {
  zapisz(zdjecia().filter((z) => z.at !== at));
}

/** The phone's share menu with the picture, else a download. */
export async function wyslijZdjecie(z: Zdjecie): Promise<'shared' | 'saved'> {
  const blob = await (await fetch(z.url)).blob();
  const name = `exp-lore-${new Date(z.at).toISOString().slice(0, 10)}.jpg`;
  try {
    const file = new File([blob], name, { type: 'image/jpeg' });
    const data = { title: 'Exp-lore', text: `${z.title} – Exp-lore! https://exp-lore.app`, files: [file] };
    if (navigator.share && navigator.canShare?.(data)) {
      await navigator.share(data);
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'saved';
}
