import { emailReset, emailSignIn, emailSignUp, googleEnabled, googleSignIn, googleToken, googleUser, type GoogleSession } from '../google';

// The player account window (HTML, above the menu or the game): sign in with
// e-mail and password, create an account, "forgot password", or Google.
// Resolves with the signed-in session, or null when closed.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

/** A signed-in session (asks for one if needed), or null. */
export async function askAccount(why = 'Zaloguj się na konto gry – postacie przypisane do konta wczytasz z listy, bez kodu.'): Promise<GoogleSession | null> {
  if (googleUser() && (await googleToken())) return googleUser();
  return new Promise((resolve) => {
    const root = el('div', { className: 'm-screen', id: 'account' });
    const box = el('form', { className: 'm-box' });
    const email = el('input', { type: 'email', name: 'email', autocomplete: 'email', placeholder: 'e-mail', className: 'm-input', required: true });
    const pass = el('input', { type: 'password', name: 'password', autocomplete: 'current-password', placeholder: 'hasło (co najmniej 8 znaków)', className: 'm-input', minLength: 8 });
    const msg = el('p', { className: 'm-error' });
    const info = el('p', {});
    const signIn = el('button', { type: 'submit', className: 'm-btn m-primary' }, ['Zaloguj']);
    const signUp = el('button', { type: 'button', className: 'm-btn' }, ['Załóż konto']);
    const forgot = el('button', { type: 'button', className: 'm-btn' }, ['Nie pamiętam hasła']);
    const google = el('button', { type: 'button', className: 'm-btn m-google' }, ['🔵 Zaloguj przez Google']);
    const cancel = el('button', { type: 'button', className: 'm-btn' }, ['Anuluj']);
    box.append(el('h2', {}, ['👤 Konto gry']), el('p', {}, [why]), email, pass, msg, info, signIn, signUp, forgot, google, cancel);
    root.append(box);
    document.body.append(root);
    email.focus();
    const done = (s: GoogleSession | null) => {
      root.remove();
      resolve(s);
    };
    const run = async (btn: HTMLButtonElement, fn: () => Promise<void>) => {
      msg.textContent = '';
      info.textContent = '';
      btn.disabled = true;
      try {
        await fn();
      } catch (e) {
        msg.textContent = (e as Error).message;
      } finally {
        btn.disabled = false;
      }
    };
    const need = (withPass: boolean) => {
      if (!/.+@.+\..+/.test(email.value.trim())) throw new Error('Wpisz adres e-mail.');
      if (withPass && pass.value.length < 8) throw new Error('Hasło musi mieć co najmniej 8 znaków.');
    };
    box.onsubmit = (e) => {
      e.preventDefault();
      run(signIn, async () => {
        need(true);
        done(await emailSignIn(email.value, pass.value));
      });
    };
    signUp.onclick = () =>
      run(signUp, async () => {
        need(true);
        const s = await emailSignUp(email.value, pass.value);
        if (s) return done(s);
        info.textContent = '📧 Wysłaliśmy e-mail z linkiem. Kliknij go, a potem wróć tutaj i zaloguj się.';
      });
    forgot.onclick = () =>
      run(forgot, async () => {
        need(false);
        await emailReset(email.value);
        info.textContent = '📧 Jeśli to konto istnieje, wysłaliśmy link do ustawienia nowego hasła.';
      });
    google.onclick = () =>
      run(google, async () => {
        if (!(await googleEnabled())) throw new Error('Logowanie przez Google nie jest jeszcze włączone na serwerze gry.');
        done(await googleSignIn());
      });
    cancel.onclick = () => done(null);
  });
}
