// A short tutorial right after a character is made (owner, 26 Oct 2026): how to walk, where the blow is, how to talk
// to someone – and then the arrow leads to the nearest newsboy, who has a first errand. Each step is one line in a
// small plaque; it waits while a dialog, the Kufer or another spotlight is up. Done once per character
// (`session.flagi.samouczek`, saved); „Pomiń” ends it at once.
import { live } from '../walka/live';
import { loadingMapVisible } from '../ui/loadingMap';

export interface SamouczekHost {
  /** The hero's position (map px) and how many px make a metre. */
  hero(): { x: number; y: number };
  pxNaM: number;
  /** The game is paused (dialog) or something else covers the screen. */
  zajete(): boolean;
  /** The nearest newsboy on this map (null: none made around yet). */
  gazeciarz(): { x: number; y: number; name: string } | null;
  /** Point the guiding arrow there (null: stop). */
  prowadz(cel: { x: number; y: number; name: string } | null): void;
  koniec(): void;
}

type Krok = 'chodz' | 'uderz' | 'gadaj' | 'gazeta';

const CSS = `
#samouczek-krok { position: fixed; left: 50%; top: calc(env(safe-area-inset-top) + 92px); transform: translateX(-50%); z-index: 7;
  width: max-content; max-width: min(88vw, 460px); padding: 10px 14px 8px; border-radius: 10px; pointer-events: none;
  background: rgba(32, 24, 30, 0.92); border: 2px solid #c9a24a; color: #fff2d0; text-align: center;
  font: 17px/1.35 'Alegreya Sans', system-ui, sans-serif; box-shadow: 0 3px 10px rgba(0,0,0,0.45); transition: opacity 0.3s; }
#samouczek-krok.ukryty { opacity: 0; }
#samouczek-krok .sk-nr { display: block; font-size: 12px; color: #d9b870; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
#samouczek-krok .sk-pomin { pointer-events: auto; margin-top: 6px; background: none; border: 0; color: #c9b38a; font: inherit; font-size: 13px;
  text-decoration: underline; cursor: pointer; padding: 2px 6px; }
#samouczek-krok.ukryty .sk-pomin { pointer-events: none; }
@media (pointer: coarse) and (max-height: 500px) { #samouczek-krok { top: calc(env(safe-area-inset-top) + 64px); font-size: 15px; } }
`;

const dotyk = () => matchMedia('(pointer: coarse)').matches;

function tekst(k: Krok): string {
  const telefon = dotyk();
  switch (k) {
    case 'chodz':
      if (live()) return '🕹 Chodzisz joystickiem w lewym dolnym rogu ekranu. Przejdź kawałek!';
      return telefon
        ? '👆 Połóż palec gdziekolwiek na ekranie i przesuń go w stronę, w którą chcesz iść. Przejdź kawałek!'
        : '⌨ Chodzisz strzałkami ← ↑ → ↓ albo klawiszami W A S D. Przejdź kawałek!';
    case 'uderz':
      if (live()) return '⚔ Uderzasz dużym przyciskiem w prawym dolnym rogu. Spróbuj!';
      return telefon
        ? '⚔ Krótkie stuknięcie w ekran to uderzenie. Spróbuj!'
        : '⚔ Uderzasz spacją albo kliknięciem myszy. Spróbuj!';
    case 'gadaj':
      return live()
        ? '🗣 Żeby z kimś pogadać, podejdź i naciśnij AKCJA. Na komputerze użyj F lub kliknij rozmówcę. Gazeciarz ma dla ciebie zlecenie – strzałka cię prowadzi!'
        : `🗣 Żeby z kimś pogadać, podejdź do niego i ${telefon ? 'stuknij w ekran' : 'uderz'} obok niego – nic mu nie zrobisz. Gazeciarz ma dla ciebie zlecenie – strzałka cię prowadzi!`;
    case 'gazeta':
      return '📰 Poproś o Kuriera – w gazecie, na stronie „Zlecenie”, czeka twoja pierwsza misja. Powodzenia!';
  }
}

const KROKI: Krok[] = ['chodz', 'uderz', 'gadaj', 'gazeta'];

export class SamouczekStartu {
  private krok: Krok = 'chodz';
  private box: HTMLDivElement;
  private przeszedl = 0;
  private ostatni: { x: number; y: number } | null = null;
  private timer = 0;
  private szukaOd = performance.now();
  private cel: { x: number; y: number } | null = null;
  private gazetaDo = 0;
  private skonczony = false;

  constructor(private host: SamouczekHost) {
    if (!document.getElementById('samouczek-krok-css')) {
      const st = document.createElement('style');
      st.id = 'samouczek-krok-css';
      st.textContent = CSS;
      document.head.append(st);
    }
    document.getElementById('samouczek-krok')?.remove();
    this.box = document.createElement('div');
    this.box.id = 'samouczek-krok';
    this.box.className = 'ukryty';
    document.body.append(this.box);
    this.pokaz();
    this.timer = window.setInterval(() => this.tik(), 250);
  }

  private pokaz() {
    this.box.replaceChildren();
    const nr = document.createElement('span');
    nr.className = 'sk-nr';
    nr.textContent = `Samouczek ${Math.min(3, KROKI.indexOf(this.krok) + 1)}/3`;
    const t = document.createElement('span');
    t.textContent = tekst(this.krok);
    const pomin = document.createElement('button');
    pomin.type = 'button';
    pomin.className = 'sk-pomin';
    pomin.textContent = this.krok === 'gazeta' ? 'OK' : 'Pomiń samouczek';
    pomin.addEventListener('pointerdown', (e) => e.stopPropagation());
    pomin.addEventListener('click', (e) => { e.stopPropagation(); this.zakoncz(); });
    this.box.append(nr, t, document.createElement('br'), pomin);
  }

  private dalej(k: Krok) {
    if (this.skonczony || KROKI.indexOf(k) <= KROKI.indexOf(this.krok)) return;
    this.krok = k;
    if (k === 'gazeta') {
      this.host.prowadz(null);
      this.gazetaDo = performance.now() + 12000;
    }
    this.pokaz();
  }

  /** The hero swung (tapped / Space / click). */
  uderzyl() {
    if (this.krok === 'uderz') window.setTimeout(() => this.dalej('gadaj'), 900);
  }

  /** The hero talked to a newsboy. */
  gazeciarz() {
    if (this.krok !== 'gazeta') this.dalej('gazeta');
  }

  private tik() {
    if (this.skonczony) return;
    const zajete = this.host.zajete() || loadingMapVisible() || !!document.getElementById('samouczek') || !!document.getElementById('character');
    this.box.classList.toggle('ukryty', zajete);
    if (zajete) return;
    const h = this.host.hero();
    if (this.krok === 'chodz') {
      if (this.ostatni) {
        const d = Math.hypot(h.x - this.ostatni.x, h.y - this.ostatni.y);
        if (d < 30 * this.host.pxNaM) this.przeszedl += d; // a jump (a ride, a respawn) doesn't count
      }
      this.ostatni = h;
      if (this.przeszedl >= 15 * this.host.pxNaM) this.dalej('uderz');
    } else if (this.krok === 'gadaj') {
      const g = this.host.gazeciarz();
      if (g && (!this.cel || Math.hypot(g.x - this.cel.x, g.y - this.cel.y) > 1)) {
        this.cel = g;
        this.host.prowadz(g);
      }
      // No newsboy anywhere near (a far world map): the step ends without one.
      if (!g && performance.now() - this.szukaOd > 90000) this.zakoncz();
    } else if (this.krok === 'gazeta' && performance.now() > this.gazetaDo) this.zakoncz();
    if (this.krok !== 'gadaj') this.szukaOd = performance.now();
  }

  zakoncz() {
    if (this.skonczony) return;
    this.skonczony = true;
    this.host.prowadz(null);
    this.usun();
    this.host.koniec();
  }

  /** The scene shuts down (the tutorial carries on in the next one unless finished). */
  usun() {
    window.clearInterval(this.timer);
    this.box.remove();
  }
}

