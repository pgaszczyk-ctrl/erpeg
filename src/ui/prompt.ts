// A small HTML window asking for one line of text (e.g. a secret code).
// Resolves with the text, or null when cancelled.

/** `opts.value` pre-fills the field, `opts.ok` names the button, `opts.number` shows a number pad. */
export function askText(title: string, text: string, placeholder = '', opts: { value?: string; ok?: string; number?: boolean } = {}): Promise<string | null> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'm-screen';
    root.id = 'prompt';
    const box = document.createElement('form');
    box.className = 'm-box';
    const h = document.createElement('h2');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    const input = Object.assign(document.createElement('input'), {
      placeholder, autocomplete: 'off', spellcheck: false, className: 'm-upper m-input',
    });
    if (opts.value) input.value = opts.value;
    if (opts.number) input.inputMode = 'numeric';
    const ok = Object.assign(document.createElement('button'), { type: 'submit', className: 'm-btn m-primary', textContent: opts.ok ?? 'Powiedz' });
    const cancel = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn', textContent: 'Anuluj' });
    box.append(h, p, input, ok, cancel);
    root.append(box);
    document.body.append(root);
    input.focus();
    const done = (v: string | null) => {
      root.remove();
      resolve(v);
    };
    box.onsubmit = (e) => {
      e.preventDefault();
      done(input.value.trim() || null);
    };
    cancel.onclick = () => done(null);
  });
}
