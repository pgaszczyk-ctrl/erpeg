import { RPC } from './api';

// Player accounts (Supabase Auth): e-mail + password, or Google. One account
// holds up to 3 characters (link_google / my_characters on the server work
// for any account, whatever the sign-in). The session is kept in localStorage.
//
// Signing in with Google opens in a separate window (a new
// tab on phones), so the game keeps running: the window comes back to this
// site with `?google=1` and the tokens in the address, stores them and closes
// itself (see catchGoogleReturn, called first thing in main.ts); this tab
// hears about it through the `storage` event.

const AUTH = RPC.url.replace('/rest/v1/rpc/', '/auth/v1');
const KEY = 'erpeg-google';

export interface GoogleSession {
  access_token: string;
  refresh_token: string;
  /** Seconds since 1970. */
  expires_at: number;
  email: string;
}

function read(): GoogleSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return s?.access_token ? s : null;
  } catch {
    return null;
  }
}

function store(s: GoogleSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // private mode: signed in for this page only
  }
}

function emailOf(jwt: string) {
  try {
    const p = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(p.email ?? '');
  } catch {
    return '';
  }
}

/** In the sign-in window: keep the tokens and close. True if this page was that window. */
export function catchGoogleReturn(): boolean {
  if (!new URLSearchParams(location.search).has('google')) return false;
  const h = new URLSearchParams(location.hash.slice(1));
  const token = h.get('access_token');
  const error = h.get('error_description') ?? h.get('error');
  if (token) {
    store({ access_token: token, refresh_token: h.get('refresh_token') ?? '', expires_at: Math.floor(Date.now() / 1000) + Number(h.get('expires_in') ?? 3600), email: emailOf(token) });
    // The "forgot password" link: set a new one here.
    if (h.get('type') === 'recovery') {
      newPasswordPage(token);
      return true;
    }
  } else {
    try {
      localStorage.setItem(`${KEY}-error`, error ?? 'Logowanie przerwane');
    } catch {
      // nothing to report back
    }
  }
  document.body.innerHTML = `<div style="font:18px monospace;color:#fff;background:#1b2a1b;padding:40px;text-align:center">${token ? '✅ Zalogowano. Wróć do gry.' : `❌ ${error ?? 'Nie udało się zalogować.'}`}</div>`;
  setTimeout(() => window.close(), 600);
  return true;
}

export function googleUser(): GoogleSession | null {
  return read();
}

export function googleSignOut() {
  store(null);
}

/** Is Google sign-in switched on in the server settings? */
export async function googleEnabled(): Promise<boolean> {
  try {
    const r = await fetch(`${AUTH}/settings`, { headers: { apikey: RPC.headers.apikey } });
    const s = await r.json();
    return !!s?.external?.google;
  } catch {
    return false;
  }
}

/** Opens Google sign-in and resolves once it's done (or fails). */
export function googleSignIn(): Promise<GoogleSession> {
  const back = `${location.origin}${location.pathname}?google=1`;
  const url = `${AUTH}/authorize?provider=google&redirect_to=${encodeURIComponent(back)}`;
  try {
    localStorage.removeItem(`${KEY}-error`);
  } catch {
    // ignore
  }
  const win = window.open(url, 'erpeg-google', 'width=480,height=640');
  return new Promise((resolve, reject) => {
    const done = () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(poll);
    };
    const check = () => {
      const s = read();
      if (s) {
        done();
        resolve(s);
        return;
      }
      let err: string | null = null;
      try {
        err = localStorage.getItem(`${KEY}-error`);
      } catch {
        // ignore
      }
      if (err) {
        done();
        reject(new Error(err));
      }
    };
    const onStorage = () => check();
    window.addEventListener('storage', onStorage);
    const started = Date.now();
    const poll = setInterval(() => {
      check();
      if (Date.now() - started > 180_000 || (win && win.closed && !read())) {
        done();
        reject(new Error('Logowanie przez Google przerwane.'));
      }
    }, 800);
    if (!win) {
      done();
      reject(new Error('Przeglądarka zablokowała okienko logowania – zezwól na okienka i spróbuj ponownie.'));
    }
  });
}

/** A valid access token (refreshed when it's about to expire), or null. */
export async function googleToken(): Promise<string | null> {
  const s = read();
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  try {
    const r = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: RPC.headers.apikey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!r.ok) throw new Error();
    const t = await r.json();
    const next = { access_token: t.access_token, refresh_token: t.refresh_token ?? s.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (t.expires_in ?? 3600), email: emailOf(t.access_token) || s.email };
    store(next);
    return next.access_token;
  } catch {
    store(null);
    return null;
  }
}

// ---------------------------------------------------------------- e-mail + password

/** Where links in account e-mails lead back to (this page, caught by catchGoogleReturn). */
const backUrl = () => `${location.origin}${location.pathname}?google=1`;

const POLISH: [RegExp, string][] = [
  [/invalid login credentials/i, 'Zły e-mail albo hasło.'],
  [/email not confirmed/i, 'Najpierw potwierdź e-mail – kliknij link, który wysłaliśmy.'],
  [/already registered|already been registered|user already exists/i, 'To konto już istnieje – zaloguj się.'],
  [/password should be at least|weak password/i, 'Hasło jest za krótkie (co najmniej 8 znaków).'],
  [/unable to validate email|invalid.*email|email address .* is invalid/i, 'To nie wygląda na poprawny adres e-mail.'],
  [/rate limit|too many/i, 'Za dużo prób – spróbuj za kilka minut.'],
  [/signups not allowed|signup is disabled/i, 'Zakładanie kont jest wyłączone na serwerze gry.'],
];

async function auth(path: string, body: unknown, method = 'POST', bearer?: string) {
  let r: Response;
  try {
    r = await fetch(`${AUTH}${path}`, {
      method,
      headers: { apikey: RPC.headers.apikey, 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Brak połączenia z serwerem gry. Sprawdź internet.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = String(j.error_description ?? j.msg ?? j.message ?? j.error ?? `Błąd serwera (${r.status})`);
    throw new Error(POLISH.find(([re]) => re.test(msg))?.[1] ?? msg);
  }
  return j;
}

function keep(t: { access_token: string; refresh_token?: string; expires_in?: number }) {
  const s = { access_token: t.access_token, refresh_token: t.refresh_token ?? '', expires_at: Math.floor(Date.now() / 1000) + (t.expires_in ?? 3600), email: emailOf(t.access_token) };
  store(s);
  return s;
}

/** Signs in with e-mail and password. */
export async function emailSignIn(email: string, password: string): Promise<GoogleSession> {
  return keep(await auth('/token?grant_type=password', { email: email.trim(), password }));
}

/**
 * Creates an account. Signed in right away when the server doesn't ask to
 * confirm e-mails; otherwise null (a confirmation link was sent).
 */
export async function emailSignUp(email: string, password: string): Promise<GoogleSession | null> {
  const j = await auth(`/signup?redirect_to=${encodeURIComponent(backUrl())}`, { email: email.trim(), password });
  return j.access_token ? keep(j) : null;
}

/** Sends a "set a new password" link. */
export async function emailReset(email: string) {
  await auth(`/recover?redirect_to=${encodeURIComponent(backUrl())}`, { email: email.trim() });
}

/** The page the reset link opens: a form for the new password. */
function newPasswordPage(token: string) {
  const css = 'font:18px monospace;color:#fff;background:#1b2a1b;padding:40px;text-align:center;min-height:100vh;box-sizing:border-box';
  document.body.innerHTML = `<form style="${css}"><p>🔑 Nowe hasło do konta gry</p>
    <input type="password" autocomplete="new-password" minlength="8" required style="font:18px monospace;padding:8px;width:260px"><br><br>
    <button style="font:18px monospace;padding:8px 20px">Zapisz</button><p class="msg"></p></form>`;
  const form = document.querySelector('form')!;
  const msg = form.querySelector('.msg')!;
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await auth('/user', { password: form.querySelector('input')!.value }, 'PUT', token);
      msg.textContent = '✅ Hasło zmienione. Wróć do gry.';
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      msg.textContent = `❌ ${(err as Error).message}`;
    }
  };
}
