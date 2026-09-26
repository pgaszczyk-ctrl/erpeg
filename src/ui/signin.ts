import { googleSignIn, passwordSignIn } from '../google';

// Signing in to an account. Accounts are Magicownia's (magicownia.pl): with
// Google, or with the e-mail and password of a Magicownia account. A new
// account is made on magicownia.pl (it has sign-up, password reset and so on).

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

/** A window over everything; resolves once signed in, rejects on "Anuluj". */
export function signInDialog(): Promise<void> {
  return new Promise((resolve, reject) => {
    const msg = el('p', { className: 'm-error' });
    const close = () => wrap.remove();
    const ok = () => {
      close();
      resolve();
    };
    const google = el('button', { type: 'button', className: 'm-btn m-google' }, ['🔵 Zaloguj przez Google']) as HTMLButtonElement;
    google.onclick = async () => {
      msg.textContent = '';
      google.disabled = true;
      try {
        await googleSignIn();
        ok();
      } catch (e) {
        msg.textContent = (e as Error).message;
      } finally {
        google.disabled = false;
      }
    };
    const email = el('input', { type: 'email', name: 'email', autocomplete: 'username', placeholder: 'twój@email.pl' }) as HTMLInputElement;
    const pass = el('input', { type: 'password', name: 'password', autocomplete: 'current-password' }) as HTMLInputElement;
    const go = el('button', { type: 'submit', className: 'm-btn m-primary' }, ['Zaloguj']) as HTMLButtonElement;
    const form = el('form', { className: 'm-card', action: '#', method: 'post' }, [
      el('label', { className: 'm-field' }, [el('span', {}, ['E-mail']), email]),
      el('label', { className: 'm-field' }, [el('span', {}, ['Hasło']), pass]),
      go,
    ]);
    form.onsubmit = async (e) => {
      e.preventDefault();
      msg.textContent = '';
      if (!email.value.trim() || !pass.value) {
        msg.textContent = 'Wpisz e-mail i hasło.';
        return;
      }
      go.disabled = true;
      try {
        await passwordSignIn(email.value.trim(), pass.value);
        ok();
      } catch (err) {
        msg.textContent = (err as Error).message;
      } finally {
        go.disabled = false;
      }
    };
    const cancel = el('button', { type: 'button', className: 'm-btn' }, ['Anuluj']);
    cancel.onclick = () => {
      close();
      reject(new Error(''));
    };
    const box = el('div', { className: 'm-box' }, [
      el('h2', {}, ['Zaloguj się']),
      el('p', { className: 'm-note' }, ['Konto jest wspólne z Magicownią (magicownia.pl) – możesz użyć Google albo e-maila i hasła z Magicowni.']),
      google,
      el('p', { className: 'm-or' }, ['albo kontem Magicowni:']),
      form,
      msg,
      el('p', { className: 'm-note' }, [
        'Nie masz konta? ',
        el('a', { href: 'https://magicownia.pl', target: '_blank', rel: 'noopener', className: 'm-link' }, ['Załóż je na magicownia.pl']),
        ' albo po prostu zaloguj się przez Google.',
      ]),
      cancel,
    ]);
    const wrap = el('div', { className: 'm-screen m-signin' }, [box]);
    document.body.append(wrap);
  });
}
