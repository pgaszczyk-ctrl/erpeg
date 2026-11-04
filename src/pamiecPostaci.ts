// The character played last on this device (owner, 26 Oct 2026: „trzymaj dane postaci w cookies, żeby
// pozwalać po prostu kontynuować grę” – a temporary account). Name + code live in a cookie (2 years) and,
// in case cookies are cleared or blocked, in localStorage. Playing this way is at the player's own risk:
// saving the code or linking an e-mail/Google account is what really keeps the character.

const KLUCZ = 'exp-postac';
const ROK_S = 365 * 24 * 3600;

export interface ZapamietanaPostac { name: string; code: string }

export function zapamietajPostac(name: string, code: string) {
  if (!name || !code) return;
  const v = encodeURIComponent(JSON.stringify({ name, code }));
  try {
    document.cookie = `${KLUCZ}=${v}; max-age=${2 * ROK_S}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch { /* cookies blocked */ }
  try { localStorage.setItem(KLUCZ, JSON.stringify({ name, code })); } catch { /* no storage */ }
}

export function zapamietanaPostac(): ZapamietanaPostac | null {
  const czytaj = (s: string | null | undefined) => {
    if (!s) return null;
    try {
      const o = JSON.parse(s) as Partial<ZapamietanaPostac>;
      return typeof o.name === 'string' && typeof o.code === 'string' && o.name && o.code ? { name: o.name, code: o.code } : null;
    } catch {
      return null;
    }
  };
  try {
    const c = document.cookie.split('; ').find((x) => x.startsWith(`${KLUCZ}=`));
    const z = czytaj(c ? decodeURIComponent(c.slice(KLUCZ.length + 1)) : null);
    if (z) return z;
  } catch { /* cookies blocked */ }
  try { return czytaj(localStorage.getItem(KLUCZ)); } catch { return null; }
}

export function zapomnijPostac() {
  try { document.cookie = `${KLUCZ}=; max-age=0; path=/`; } catch { /* nothing */ }
  try { localStorage.removeItem(KLUCZ); } catch { /* nothing */ }
}
