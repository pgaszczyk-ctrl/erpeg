import { api, type LoginResult } from '../api';
import { googleToken, googleUser } from '../google';
import { askAccount } from './account';
import { logoImage } from './logo';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { PO_DEMO_START, DEMO_TEKSTY } from '../content/demo';
import { TRUDNOSCI, DOMYSLNA_TRUDNOSC } from '../content/trudnosc';
import { BOHATEROWIE } from '../content/wyglad';
import { randomLook, type Look } from '../look';
import { rememberTestLook } from '../testAppearance';
import { sciezkaGry } from '../sciezka';

// The QR demo's own start screen (owner, 18 Oct 2026: many visitors from the flyers, nobody made a character):
// only the name, and below it – optional – an account (e-mail or Google). The character is made at once
// (home in front of Targi Lublin, difficulty Dziecięcy), the dream by the castle follows, and waking up
// is the first minute of the real game.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

/** Shows the name form; resolves with the new character (and its look) once the server has made it. */
export function demoStartForm(city: CityMap): Promise<{ r: LoginResult; look: Look }> {
  return new Promise((resolve) => {
    const root = el('div', { id: 'menu', className: 'm-demo' });
    const box = el('form', { className: 'm-box' }) as HTMLFormElement;
    root.append(box);
    document.body.append(root);
    const name = el('input', { maxLength: 20, placeholder: 'np. Zbyszko', autocomplete: 'nickname', spellcheck: false, className: 'm-input', enterKeyHint: 'go' }) as HTMLInputElement;
    const err = el('p', { className: 'm-error' });
    const go = el('button', { type: 'submit', className: 'm-btn m-primary' }, [DEMO_TEKSTY.formularzStart]) as HTMLButtonElement;
    // Optional: the account the character will belong to.
    const konto = el('div', { className: 'm-field m-demo-konto' });
    const showKonto = () => {
      const u = googleUser();
      konto.replaceChildren(
        el('span', {}, [DEMO_TEKSTY.formularzKonto]),
        u
          ? el('small', {}, [`✅ Postać trafi na konto ${u.email || ''}`.trim()])
          : el('button', { type: 'button', className: 'm-btn m-google', onclick: async () => { if (await askAccount('Zaloguj się albo załóż konto – postać wczytasz potem z listy, bez kodu.')) showKonto(); } }, ['👤 E-mail albo Google']),
      );
    };
    showKonto();
    const mam = el('a', { href: `${sciezkaGry()}#wczytaj`, className: 'm-demo-mam' }, ['Mam już postać – wczytaj']);
    mam.onclick = (e) => {
      e.preventDefault();
      location.href = `${location.origin}${sciezkaGry()}#wczytaj`;
    };
    const logo = logoImage(110, 'm-demo-logo');
    box.append(
      logo,
      el('h2', {}, [DEMO_TEKSTY.formularzTytul]),
      el('label', { className: 'm-field' }, [el('span', {}, ['Imię']), name, el('small', {}, ['Imienia nie można później zmienić.'])]),
      err, go, konto, mam,
    );
    if (!document.getElementById('demo-start-css')) {
      const st = el('style', { id: 'demo-start-css' });
      st.textContent = `
        #menu.m-demo { background: rgba(22,12,6,.45); }
        #menu.m-demo .m-box { max-width: 340px; align-items: stretch; }
        #menu.m-demo .m-demo-logo { width: 96px; height: auto; align-self: center; }
        #menu.m-demo h2 { text-align: center; margin: 0; }
        #menu.m-demo input.m-input { font-size: 20px; padding: 10px; }
        #menu.m-demo .m-primary { font-size: 20px; padding: 12px; }
        #menu.m-demo .m-demo-konto { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #5a4f3a; }
        #menu.m-demo .m-demo-konto span { color: #c9bfa6; font-size: 13px; }
        #menu.m-demo .m-demo-mam { color: #9aa39a; font-size: 13px; text-align: center; }
      `;
      document.head.append(st);
    }
    setTimeout(() => name.focus(), 50);
    box.onsubmit = async (e) => {
      e.preventDefault();
      if (go.disabled) return;
      err.textContent = '';
      const imie = name.value.trim();
      if (imie.length < 2) { err.textContent = 'Imię musi mieć co najmniej 2 znaki.'; return; }
      go.disabled = true;
      const label = go.textContent;
      go.textContent = 'Chwileczkę…';
      try {
        const look: Look = { ...randomLook(), postac: Math.floor(Math.random() * BOHATEROWIE.length) };
        const p = city.fromLatLon(PO_DEMO_START.lat, PO_DEMO_START.lon);
        const r = await api.createCharacter(imie, PO_DEMO_START.nazwa, p.x, p.y, PX_PER_M, TRUDNOSCI[DOMYSLNA_TRUDNOSC].wiek, look);
        rememberTestLook(look, r.player.name);
        const token = googleUser() ? await googleToken() : null;
        if (token) {
          await api.linkGoogle(r.player.name, r.player.idik, token).then(() => { r.player.konto = true; }).catch(() => {});
        }
        rememberCode(r.player.name, r.player.idik);
        root.remove();
        resolve({ r, look });
      } catch (x) {
        err.textContent = (x as Error).message || 'Nie udało się – spróbuj jeszcze raz.';
        go.disabled = false;
        go.textContent = label;
      }
    };
  });
}

/** Lets the browser offer to keep the name + code (like the menu's code screen). */
function rememberCode(name: string, code: string) {
  try {
    const PC = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string; name: string }) => Credential }).PasswordCredential;
    if (PC) navigator.credentials.store(new PC({ id: name, password: code, name })).catch(() => {});
  } catch { /* not supported */ }
}
