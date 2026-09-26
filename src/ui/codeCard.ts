import QRCode from 'qrcode';
import { api } from '../api';
import { googleToken, googleUser } from '../google';
import { signInDialog } from './signin';

// The character's code: shown big, as a QR code (a link that opens the game
// and loads the character), as a picture to save, and shared to any app
// (WhatsApp, SMS…) with the phone's share menu.

/** Link that opens the game and loads this character. */
export function codeLink(name: string, code: string) {
  return `${location.origin}${location.pathname}#postac=${encodeURIComponent(name)}&kod=${code}`;
}

/** Reads a character from a link like the one above (and clears it from the address bar). */
export function codeFromLink(): { name: string; code: string } | null {
  const h = new URLSearchParams(location.hash.slice(1));
  const name = h.get('postac');
  const code = h.get('kod');
  if (!name || !code) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return { name, code };
}

/** "Assign to an account": then the character can be loaded from the account's list. */
function googleLink(name: string, code: string) {
  const msg = el('p', { className: 'm-note' });
  const btn = el('button', { type: 'button', className: 'm-btn m-google' }, ['🔵 Przypisz do konta (Google / Magicownia)']) as HTMLButtonElement;
  btn.onclick = async () => {
    msg.textContent = '';
    btn.disabled = true;
    try {
      let token = googleUser() ? await googleToken() : null;
      if (!token) {
        try {
          await signInDialog();
        } catch {
          return;
        }
        token = await googleToken();
      }
      if (!token) throw new Error('Nie udało się zalogować.');
      await api.linkGoogle(name, code, token);
      msg.textContent = `✅ Postać przypisana do ${googleUser()?.email || 'Twojego konta'}. Wczytasz ją przyciskiem „Wczytaj z konta”.`;
    } catch (e) {
      msg.textContent = `❌ ${(e as Error).message}`;
    } finally {
      btn.disabled = false;
    }
  };
  return el('div', { className: 'm-card' }, [btn, msg]);
}

/** The code with a space in the middle, easier to read and copy by hand. */
export function prettyCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

/** Everything about one character's code. */
export function codeCard(name: string, code: string): HTMLElement {
  const link = codeLink(name, code);
  const qr = el('canvas', { className: 'm-qr' });
  QRCode.toCanvas(qr, link, { margin: 2, width: 220, color: { dark: '#000000', light: '#ffffff' } }).catch(() => qr.remove());

  const save = el('button', { type: 'button', className: 'm-btn', onclick: () => savePicture(name, code, link) }, ['📷 Zapisz jako obrazek']);
  const share = el('button', { type: 'button', className: 'm-btn m-share', onclick: () => shareCode(name, code, link) }, ['📤 Wyślij sobie (WhatsApp, SMS…)']);
  const parts: (Node | string)[] = [
    el('div', { className: 'm-code-row' }, [el('span', {}, ['Imię:']), el('b', {}, [name])]),
    el('div', { className: 'm-idik' }, [prettyCode(code)]),
    qr,
    el('p', { className: 'm-note' }, ['Zeskanuj telefonem, żeby od razu wczytać postać.']),
    share,
    save,
    googleLink(name, code),
  ];

  return el('div', { className: 'm-card' }, parts);
}

/**
 * Sends the code with the phone's own share menu (WhatsApp, Messenger, SMS,
 * e-mail…), with the QR picture where the phone allows files; without a
 * share menu (most computers) it opens WhatsApp with the message ready.
 */
async function shareCode(name: string, code: string, link: string) {
  const text = `Erpeg – moja postać\nImię: ${name}\nKod: ${prettyCode(code)}\nGraj: ${link}`;
  try {
    if (navigator.share) {
      const file = new File([await picture(name, code, link)], `erpeg-${name}.png`, { type: 'image/png' });
      const withFile = { title: 'Erpeg', text, files: [file] };
      if (navigator.canShare?.(withFile)) await navigator.share(withFile);
      else await navigator.share({ title: 'Erpeg', text });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return; // closed the share menu
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

/** The picture with name, code and QR code, as PNG. */
async function picture(name: string, code: string, link: string): Promise<Blob> {
  const c = await pictureCanvas(name, code, link);
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('no image'))), 'image/png'));
}

/** Downloads a picture with the name, code and QR code (e.g. to keep in the phone gallery). */
async function savePicture(name: string, code: string, link: string) {
  const c = await pictureCanvas(name, code, link);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `erpeg-${name}.png`;
  a.click();
}

async function pictureCanvas(name: string, code: string, link: string) {
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, link, { margin: 2, width: 300 });
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 470;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1a24';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#f7c531';
  g.textAlign = 'center';
  g.font = 'bold 30px monospace';
  g.fillText('ERPEG', 180, 42);
  g.fillStyle = '#ffffff';
  g.font = '20px monospace';
  g.fillText(name, 180, 76);
  g.drawImage(qr, 30, 92);
  g.fillStyle = '#fff2a8';
  g.font = 'bold 34px monospace';
  g.fillText(prettyCode(code), 180, 438);
  return c;
}

let open: HTMLDivElement | null = null;

export function isCodeOpen() {
  return !!open;
}

/** The code card as an overlay during the game (from the ☰ menu). */
export function showCodeOverlay(name: string, code: string) {
  open?.remove();
  const root = el('div', { id: 'codecard', className: 'm-screen' });
  const close = () => {
    root.remove();
    open = null;
  };
  root.onclick = (e) => {
    if (e.target === root) close();
  };
  const box = el('div', { className: 'm-box' }, [
    el('h2', {}, ['Twój kod postaci']),
    el('p', {}, ['Imię i ten kod wystarczą, żeby wczytać postać na każdym urządzeniu.']),
    codeCard(name, code),
    el('button', { type: 'button', className: 'm-btn m-primary', onclick: close }, ['Zamknij']),
  ]);
  root.append(box);
  document.body.append(root);
  open = root;
}
