import { tx } from "../i18n";
import { resetKeys, resetTouch } from "../controls";
import { audio } from "../sfx";

// The underground pinball ride (owner, 2 Nov 2026: in metro cities instead of the cannon): the hero, in a glass ball,
// sits on the spring of a launcher in a brick chamber under the hatch; the spring is pulled and lets go, the ball shoots
// into brass tubes and rushes past flashing bumpers while the destination loads, then steam brakes slow it into the
// arrival chamber and light falls from the opening hatch. Same interface as flight.ts. Code-drawn until the artist's.

export const PINBALL = {
  /** Spring pulled back, then let go. */
  napinanieMs: 900,
  wystrzalMs: 450,
  /** The chamber gives way to the tubes. */
  komnataMs: 1500,
  /** Landing may start only after this, so the launch always plays. */
  minJazdaMs: 2600,
  /** Brakes into the arrival chamber + light from the hatch. */
  hamowanieMs: 1500,
  /** Ball size as a share of the shorter side of the view. */
  kula: 0.11,
  tekstRury: 1700,
  tekstWczytuje: 4000,
};

const INK = "#1e1a24";
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

function ding(freq: number) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(freq, a.currentTime);
  g.gain.setValueAtTime(0.06, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.2);
}

export function pinball(
  hero: string | string[] | undefined,
  describe: (e: unknown) => string = (e) => (e instanceof Error ? e.message : String(e)),
  cel = "",
) {
  resetKeys();
  resetTouch();
  const still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const root = document.createElement("div");
  root.id = "artillery-flight";
  root.className = "m-screen";
  root.dataset.tryb = "pinball";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", tx("Podziemny pinball", "Underground pinball"));
  root.innerHTML = `<style>#artillery-flight{z-index:10020;background:#141216;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:end;padding:24px;color:#1e1a24}#artillery-flight canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}#artillery-flight p{position:relative;font:600 17px 'Alegreya Sans',system-ui,sans-serif;background:#f6e7c6;padding:10px 18px;border:3px solid #1e1a24;box-shadow:4px 4px 0 #1e1a24;max-width:95%;text-align:center;margin:0 0 8px;transition:opacity .25s}#artillery-flight p.znika{opacity:0}#artillery-flight button{position:relative;min-height:44px;padding:10px 18px;border:3px solid #1e1a24;box-shadow:3px 3px 0 #1e1a24;background:#e9b856;margin:4px;font:600 16px 'Alegreya Sans',system-ui,sans-serif}</style><canvas></canvas><p aria-live="polite"></p>`;
  const canvas = root.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const text = root.querySelector("p")!;
  document.body.append(root);
  const focus = document.activeElement as HTMLElement | null;

  let tekstTimer: ReturnType<typeof setTimeout> | undefined;
  const pisz = (s: string) => {
    if (text.textContent === s) return;
    clearTimeout(tekstTimer);
    if (!text.textContent || still) {
      text.textContent = s;
      return;
    }
    text.classList.add("znika");
    tekstTimer = setTimeout(() => {
      text.textContent = s;
      text.classList.remove("znika");
    }, 220);
  };
  pisz(tx("Komnata wyrzutni – sprężyna się napina…", "The launcher chamber – the spring tightens…"));

  const klatki = (Array.isArray(hero) ? hero : hero ? [hero] : []).map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });

  let W = 0, H = 0, dpr = 1;
  const rozmiar = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth || window.innerWidth;
    H = root.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  };
  rozmiar();
  window.addEventListener("resize", rozmiar);

  const t0 = performance.now();
  let lad: { t: number; done: () => void } | null = null;
  let koniec = false, raf = 0;
  let droga = 0; // tube distance travelled, px
  let ostatnio = t0, ostatniDing = 0;
  let wystrzelony = false;

  const P = 12; // pixel size of bricks/rivets, CSS px

  /** Brick wall with mortar, scrolling by `przes`. */
  const cegly = (przes: number, jasnosc = 1) => {
    ctx.fillStyle = "#2a1f1c";
    ctx.fillRect(0, 0, W, H);
    const bw = P * 4, bh = P * 2;
    const o = ((przes % (bh * 2)) + bh * 2) % (bh * 2);
    for (let y = -bh * 2 + o; y < H + bh; y += bh) {
      const rz = Math.round((y - o) / bh);
      for (let x = (rz % 2) * (-bw / 2) - bw; x < W + bw; x += bw) {
        const k = ((x * 7 + rz * 13) & 7) / 7;
        ctx.fillStyle = k > 0.6 ? "#4e2723" : k > 0.3 ? "#4e1f1c" : "#3e2519";
        ctx.globalAlpha = jasnosc;
        ctx.fillRect(Math.round(x) + 2, Math.round(y) + 2, bw - 4, bh - 4);
      }
    }
    ctx.globalAlpha = 1;
  };

  /** A brass pipe from (x0,y0) to (x1,y1), w wide. */
  const rura = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    ctx.lineCap = "butt";
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = "#a08448";
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = "#e8d08c";
    ctx.lineWidth = Math.max(2, w * 0.18);
    ctx.beginPath();
    ctx.moveTo(x0 - w * 0.2, y0);
    ctx.lineTo(x1 - w * 0.2, y1);
    ctx.stroke();
  };

  /** The glass ball with the hero inside. */
  const kula = (x: number, y: number, r: number, obrot: number, t: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(140,192,170,0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    const img = klatki.length ? klatki[Math.floor(t / 120) % klatki.length] : null;
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.rotate(obrot);
      const s = (r * 1.7) / img.naturalHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, (-img.naturalWidth * s) / 2, (-img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      ctx.restore();
    }
    // Brass band and the light from the NW.
    ctx.strokeStyle = "#c8963e";
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r - 1, r * 0.28, obrot, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,246,200,0.85)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /** Bumper: a mushroom seen from above, lit when `swieci`. */
  const odbijacz = (x: number, y: number, r: number, swieci: number) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8963e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = swieci > 0 ? `rgba(255,${200 + 55 * swieci},120,1)` : "#8a3a3a";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (swieci > 0) {
      ctx.globalAlpha = 0.5 * swieci;
      ctx.fillStyle = "#fff6c8";
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const para = (x: number, y: number, t: number, ile: number) => {
    ctx.fillStyle = "#e9eef2";
    for (let i = 0; i < ile; i++) {
      const u = ((t / 900 + i / ile) % 1);
      ctx.globalAlpha = (1 - u) * 0.6;
      ctx.beginPath();
      ctx.arc(x + Math.sin(i * 2.1 + t / 400) * 20 * u, y - 60 * u, 8 + 18 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  let napisRury = false, napisWczytuje = false;
  const klatka = (now: number) => {
    if (koniec) return;
    raf = requestAnimationFrame(klatka);
    const dt = Math.min(0.05, (now - ostatnio) / 1000);
    ostatnio = now;
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const r = Math.min(W, H) * PINBALL.kula;
    const cx = W / 2;

    if (!lad && t < PINBALL.komnataMs && !still) {
      // The chamber: brick walls, a launch lane with brass rails, the spring under the ball.
      cegly(0);
      const napiecie = ease(clamp(t / PINBALL.napinanieMs));
      const strzal = clamp((t - PINBALL.napinanieMs) / PINBALL.wystrzalMs);
      if (strzal > 0 && !wystrzelony) {
        wystrzelony = true;
        pisz(tx("PSTRYK!", "PING!"));
        ding(660);
      }
      const dol = H * 0.78 + napiecie * r * 0.8 * (1 - strzal);
      rura(cx - r * 1.5, -20, cx - r * 1.5, H * 0.9, r * 0.35);
      rura(cx + r * 1.5, -20, cx + r * 1.5, H * 0.9, r * 0.35);
      // The spring (zig-zag) and the plunger knob.
      const sprezynaG = dol + r, sprezynaD = H * 0.95;
      ctx.strokeStyle = "#d9a84a";
      ctx.lineWidth = Math.max(3, r * 0.12);
      ctx.beginPath();
      const zwoje = 9;
      for (let i = 0; i <= zwoje; i++) {
        const y = sprezynaG + ((sprezynaD - sprezynaG) * i) / zwoje;
        ctx.lineTo(cx + (i % 2 ? r * 0.6 : -r * 0.6), y);
      }
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillRect(cx - r * 0.9 - 3, sprezynaG - 3, r * 1.8 + 6, r * 0.4 + 6);
      ctx.fillStyle = "#8f3a2c";
      ctx.fillRect(cx - r * 0.9, sprezynaG, r * 1.8, r * 0.4);
      // Ball: on the plunger, then up and out of the top.
      const by = dol - (dol + r * 2) * easeOut(strzal);
      kula(cx, by, r, strzal * 6, t);
      para(cx - r * 2.4, H * 0.3, t, 4);
      para(cx + r * 2.4, H * 0.5, t + 300, 4);
      return;
    }

    // The tubes: the view rushes down past brick and bumpers, the ball wobbles in its tube.
    let predkosc = 1500; // px/s
    let jasno = 0;
    if (lad) {
      const L = now - lad.t;
      const u = still ? 1 : clamp(L / PINBALL.hamowanieMs);
      predkosc *= 1 - easeOut(u);
      jasno = ease(clamp((u - 0.55) / 0.45));
      if (u >= 1 && jasno >= 1) {
        const done = lad.done;
        lad = { ...lad, done: () => {} };
        done();
      }
    }
    if (!still) droga += predkosc * dt;
    cegly(droga * 0.6, 0.8);
    // The tube's wiggle is fixed to the tunnel (world), which moves down the screen as the ball rushes up.
    const wezyk = (y: number) => cx + Math.sin((y - droga) / 260) * W * 0.12;
    // Tube walls along the wiggle.
    for (const bok of [-1, 1]) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = r * 0.45 + 6;
      ctx.beginPath();
      for (let y = -20; y <= H + 20; y += 16) ctx.lineTo(wezyk(y) + bok * r * 1.6, y);
      ctx.stroke();
      ctx.strokeStyle = "#a08448";
      ctx.lineWidth = r * 0.45;
      ctx.stroke();
      ctx.strokeStyle = "#e8d08c";
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      for (let y = -20; y <= H + 20; y += 16) ctx.lineTo(wezyk(y) + bok * r * 1.6 - r * 0.1, y);
      ctx.stroke();
      // Rivet bands across the tube.
      const krok = 140, o = droga % krok;
      ctx.fillStyle = "#f0c850";
      for (let y = -krok + o; y < H + krok; y += krok) ctx.fillRect(Math.round(wezyk(y) + bok * r * 1.6 - 3), Math.round(y - 3), 6, 6);
    }
    // Bumpers beside the tube; lit when the ball passes.
    const ky = H * 0.55;
    const krokB = 380;
    for (let k = Math.floor((droga - H) / krokB) - 1; k <= Math.floor((droga + H) / krokB) + 1; k++) {
      const y = ky + droga - k * krokB;
      if (y < -krokB || y > H + krokB) continue;
      const bok = k % 2 ? 1 : -1;
      const swieci = clamp(1 - Math.abs(y - ky) / (r * 2.2));
      if (swieci > 0.9 && now - ostatniDing > 260 && !still && predkosc > 300) {
        ostatniDing = now;
        ding(880 + (((k % 3) + 3) % 3) * 220);
      }
      odbijacz(wezyk(y) + bok * r * 3.1, y, r * 0.55, swieci);
    }
    // Speed streaks.
    if (predkosc > 200) {
      ctx.strokeStyle = "rgba(255,246,200,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const x = wezyk(ky) + Math.sin(i * 1.7) * r * 0.9, y0 = ky + r + ((i * 47 + droga * 0.9) % (H * 0.4));
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + 30 + predkosc / 40);
        ctx.stroke();
      }
    }
    kula(wezyk(ky) + Math.sin(t / 90) * r * 0.15, ky + Math.sin(t / 130) * r * 0.1, r, droga / (r * 1.2), t);
    if (lad) para(cx, ky + r, t, 6);
    if (jasno > 0) {
      ctx.globalAlpha = jasno;
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (!lad && !napisRury && t > PINBALL.tekstRury) {
      napisRury = true;
      pisz(tx("Pędzisz rurami pod miastem…", "Rushing through the tubes under the city…"));
    }
    if (!lad && !napisWczytuje && t > PINBALL.tekstWczytuje) {
      napisWczytuje = true;
      pisz(tx("Zwrotnice przestawiają tor – wczytuję wylot…", "The switches set the track – loading the exit…"));
    }
  };
  raf = requestAnimationFrame(klatka);

  const key = (e: KeyboardEvent) => {
    if (e.key !== "Tab") {
      e.preventDefault();
      e.stopImmediatePropagation();
    } else {
      const b = [...root.querySelectorAll("button")];
      if (b.length) {
        e.preventDefault();
        b[(b.indexOf(document.activeElement as HTMLButtonElement) + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus();
      } else e.preventDefault();
    }
  };
  window.addEventListener("keydown", key, true);

  return {
    root,
    text,
    launch() {},
    /** Steam brakes slow the ball into the arrival chamber; resolves when the hatch's light fills the view. */
    async land(k: { cel: string }) {
      const zostalo = t0 + PINBALL.minJazdaMs - performance.now();
      if (!still && zostalo > 0) await new Promise((r) => setTimeout(r, zostalo));
      pisz(
        k.cel || cel
          ? tx(`Hamulce parowe! Wylot: ${k.cel || cel}`, `Steam brakes! Exit: ${k.cel || cel}`)
          : tx("Hamulce parowe! Wylot!", "Steam brakes! Exit!"),
      );
      await new Promise<void>((done) => {
        lad = { t: performance.now(), done };
      });
    },
    async recover(message: string, actions: { label: string; run: () => Promise<void> }[]) {
      clearTimeout(tekstTimer);
      text.classList.remove("znika");
      text.textContent = message;
      napisRury = napisWczytuje = true;
      await new Promise<void>((resolve) => {
        const buttons = actions.map((action) => {
          const b = document.createElement("button");
          b.textContent = action.label;
          b.onclick = async () => {
            buttons.forEach((b) => ((b.disabled = true), (b.hidden = true)));
            pisz(tx("Ponawiam jazdę…", "Retrying the ride…"));
            try {
              await action.run();
              buttons.forEach((b) => b.remove());
              resolve();
            } catch (e) {
              clearTimeout(tekstTimer);
              text.classList.remove("znika");
              text.textContent = describe(e);
              buttons.forEach((b) => ((b.disabled = false), (b.hidden = false)));
            }
          };
          root.append(b);
          return b;
        });
        buttons[0]?.focus();
      });
    },
    close() {
      koniec = true;
      cancelAnimationFrame(raf);
      clearTimeout(tekstTimer);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", rozmiar);
      root.remove();
      resetKeys();
      resetTouch();
      focus?.focus();
    },
  };
}
