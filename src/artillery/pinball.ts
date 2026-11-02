import { tx } from "../i18n";
import { resetKeys, resetTouch } from "../controls";
import { audio } from "../sfx";
import { Hala, HALA, Tor, kulociagGotowy, postacZ, wczytajKulociag, type Postac } from "./kulociag";

// The underground pinball ride (owner, 2 Nov 2026: in metro cities instead of the cannon): the hero, in a glass ball,
// sits on the spring of a launcher in a brick chamber under the hatch; the spring is pulled and lets go, the ball shoots
// into brass tubes and rushes past flashing bumpers while the destination loads, then steam brakes slow it into the
// arrival chamber and light falls from the opening hatch. Same interface as flight.ts.
// Since the artist's pack 48-G001 (owner, 2 Nov 2026) the launch and the arrival happen in his station hall
// (kulociag.ts: lane 0 = the hero, the spring holds until the destination is loaded, then the impulse shot); only the
// tubes between stations are still code-drawn (no tunnel art yet). Without the hall's pictures: the old code chamber.

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
  ciemnienieMs: 600,
  /** Wait at most this long for the hall's pictures before falling back to the code chamber. */
  czekajNaHaleMs: 2500,
  /** After the shot: the WHOOP! stays this long, then the view goes dark (ciemnienieMs) into the arrival hall. */
  poWystrzaleMs: 2000,
  /** Reduced motion: the arrival hall stays this long. */
  przyjazdStillMs: 1200,
};

const INK = "#1e1a24";
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

/** The shot's whoosh: a burst of noise swept from low to high through a band filter, with a short spring twang. */
function swist() {
  const a = audio();
  if (!a) return;
  const n = Math.floor(a.sampleRate * 0.7), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = "bandpass";
  f.Q.value = 2.5;
  f.frequency.setValueAtTime(300, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(2600, a.currentTime + 0.45);
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.35, a.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.7);
  src.connect(f).connect(g).connect(a.destination);
  src.start();
  ding(330);
}

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
  stacje: { z?: string; krajZ?: string | null; krajDo?: string | null } = {},
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
  if (!kulociagGotowy()) pisz(tx("Schodzisz do hali Kulociągu…", "Down into the Ballway hall…"));

  const klatki = (Array.isArray(hero) ? hero : hero ? [hero] : []).map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });

  // The hero as a passenger of the artist's ball: each frame's opaque box, filled as the pictures load.
  const bohater: Postac[] = [];
  klatki.forEach((i) => {
    const dodaj = () => { if (i.naturalWidth) bohater.push(postacZ(i)); };
    if (i.complete) dodaj();
    else i.addEventListener("load", dodaj, { once: true });
  });
  const hala = new Hala(!still);
  hala.stacja(stacje.z ?? "", stacje.krajZ ?? null);
  let tryb: "hala" | "kod" | null = kulociagGotowy() ? "hala" : null;
  let etap: "hala" | "przyjazd" = "hala";
  let tPrzyjazd = 0, poWystrzale = 0;
  let koniecPrzyjazdu: (() => void) | null = null;
  const zacznijHale = () => {
    tryb = "hala";
    hala.tory[0].depart(bohater, false);
    if (still) hala.tory[0].update(10);
    pisz(
      stacje.z
        ? tx(`Kulociąg Parowy – stacja ${stacje.z}. Siłowniki ściskają sprężynę…`, `Steam Ballway – ${stacje.z} station. The pistons press the spring…`)
        : tx("Kulociąg Parowy – siłowniki ściskają sprężynę…", "Steam Ballway – the pistons press the spring…"),
    );
  };
  const decyzja = new Promise<void>((ok) => {
    if (tryb) return ok();
    const zegar = setTimeout(() => { if (!tryb) tryb = "kod"; ok(); }, PINBALL.czekajNaHaleMs);
    void wczytajKulociag().then((jest) => {
      clearTimeout(zegar);
      if (!tryb) jest ? zacznijHale() : (tryb = "kod");
      ok();
    });
  });
  if (tryb === "hala") zacznijHale();

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

  let tKod = 0;
  /** Comic „WHOOP!” burst over the view: pops in, wobbles, fades out (screen px). */
  // The artist's comic burst (48-G002 v2: 320×200, frames 0 → 1 → 2 → 1 for 80/160/80/… ms, then hold 1, 2 s in all);
  // the code-drawn burst below only while the pictures are missing.
  const whoopKlatki = [0, 1, 2].map((i) => {
    const im = new Image();
    im.src = `${import.meta.env.BASE_URL || "/"}swiat/kulociag/comic/${tx("whoop_pl", "whoosh_en")}_${i}.png`;
    return im;
  });
  const whoopArtysty = (od: number) => {
    const k = still ? 1 : od < 80 ? 0 : od < 240 ? 1 : od < 320 ? 2 : 1;
    const im = whoopKlatki[k];
    if (!im.complete || !im.naturalWidth) return false;
    const zn = clamp((od - (PINBALL.poWystrzaleMs - 400)) / 400);
    // A whole number of screen pixels per picture pixel, about half the shorter side of the view.
    const sk = Math.max(1, Math.round(Math.min((W * 0.55) / 320, (H * 0.45) / 200) * dpr)) / dpr;
    ctx.save();
    ctx.globalAlpha = 1 - zn;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, Math.round((W / 2 - 160 * sk) * dpr) / dpr, Math.round((H * 0.32 - 100 * sk) * dpr) / dpr, 320 * sk, 200 * sk);
    ctx.restore();
    return true;
  };
  const whoop = (od: number) => {
    if (od > PINBALL.poWystrzaleMs + PINBALL.ciemnienieMs) return;
    if (whoopArtysty(od)) return;
    const wej = still ? 1 : easeOut(clamp(od / 160));
    const zn = clamp((od - (PINBALL.poWystrzaleMs - 400)) / 400);
    const m = Math.min(W, H);
    const x = W * 0.5, y = H * 0.32;
    const sk = (0.4 + 0.75 * wej) * (1 + (still ? 0 : Math.sin(od / 70) * 0.03 * (1 - zn)));
    ctx.save();
    ctx.globalAlpha = 1 - zn;
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    ctx.scale(sk, sk);
    const R = m * 0.2;
    // Starburst.
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, rr = i % 2 ? R * 0.68 : R * (1.02 + ((i * 7) % 5) * 0.03);
      ctx.lineTo(Math.cos(a) * rr * 1.45, Math.sin(a) * rr * 0.82);
    }
    ctx.closePath();
    ctx.fillStyle = "#1e1a24";
    ctx.translate(5, 5);
    ctx.fill();
    ctx.translate(-5, -5);
    ctx.fillStyle = "#f2c230";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1e1a24";
    ctx.stroke();
    const tekst = tx("WHOOP!", "WHOOSH!");
    ctx.font = `900 ${Math.round(R * 0.55)}px 'Alegreya Sans', Impact, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, R * 0.08);
    ctx.strokeStyle = "#1e1a24";
    ctx.strokeText(tekst, 0, 0);
    ctx.fillStyle = "#d8323c";
    ctx.fillText(tekst, 0, 0);
    ctx.restore();
  };
  /** The hall fitted to the view: covers it, but crops at most ~15 % so the sign and the launcher stay in sight. */
  const rysujHale = (now: number) => {
    const sc = Math.max(W / HALA.w, H / HALA.h), sn = Math.min(W / HALA.w, H / HALA.h);
    const s = Math.min(sc, sn * 1.18);
    // Cropped sideways (narrow views): keep the hero's launcher (x ≈ 1028) near the middle.
    const iw = HALA.w * s;
    const ox = iw <= W ? (W - iw) / 2 : Math.min(0, Math.max(W - iw, W / 2 - 1000 * s));
    const oy = (H - HALA.h * s) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#141216";
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    ctx.imageSmoothingEnabled = s * dpr < 0.95;
    hala.draw(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const t0r = etap === "przyjazd" ? now - tPrzyjazd : 0;
    if (etap === "przyjazd" && t0r < 450) {
      ctx.globalAlpha = 1 - t0r / 450;
      ctx.fillStyle = "#141216";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    const p0 = hala.tory[0].phase;
    if (etap === "hala") {
      if (!poWystrzale && (p0 === "recoil" || p0 === "empty") && hala.tory[0].ready) {
        poWystrzale = now;
        pisz(tx("PSTRYK! Kula mknie w rurę…", "PING! The ball shoots into the tube…"));
        swist();
      }
      if (poWystrzale) {
        // Owner, 2 Nov 2026: no tube ride after the shot – a whoosh and a comic WHOOP!, then the dark and the arrival.
        const od = now - poWystrzale;
        whoop(od);
        const u = clamp((od - PINBALL.poWystrzaleMs) / PINBALL.ciemnienieMs);
        if (u > 0) {
          ctx.globalAlpha = ease(u);
          ctx.fillStyle = "#141216";
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }
        if (u >= 1) przyjazd(now);
      } else if (!poWystrzale && !napisWczytuje && now - t0 > PINBALL.tekstWczytuje) {
        napisWczytuje = true;
        pisz(tx("Sprężyna trzyma – zwrotnice ustawiają tor do celu…", "The spring holds – the switches set the track…"));
      }
    } else if (etap === "przyjazd" && koniecPrzyjazdu && (still ? now - tPrzyjazd > PINBALL.przyjazdStillMs : p0 === "idle")) {
      const done = koniecPrzyjazdu;
      koniecPrzyjazdu = null;
      done();
    }
  };
  const przyjazd = (now: number) => {
    if (etap === "przyjazd") return;
    etap = "przyjazd";
    tPrzyjazd = now;
    hala.stacja(cel, stacje.krajDo ?? null);
    hala.tory[0] = new Tor(0, hala.tory[0].x);
    if (!still) hala.tory[0].arrive(bohater);
    pisz(cel ? tx(`Hamulce parowe! Stacja: ${cel}`, `Steam brakes! Station: ${cel}`) : tx("Hamulce parowe!", "Steam brakes!"));
  };
  let napisRury = false, napisWczytuje = false;
  const klatka = (now: number) => {
    if (koniec) return;
    raf = requestAnimationFrame(klatka);
    const dt = Math.max(0, Math.min(0.05, (now - ostatnio) / 1000));
    ostatnio = now;
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const r = Math.min(W, H) * PINBALL.kula;
    const cx = W / 2;

    if (!tryb) {
      // Waiting a moment for the hall's pictures.
      ctx.fillStyle = "#141216";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    if (tryb === "hala") {
      if (!still) hala.update(dt);
      rysujHale(now);
      return;
    }
    if (tryb === "kod" && !tKod) {
      tKod = now;
      pisz(tx("Komnata wyrzutni – sprężyna się napina…", "The launcher chamber – the spring tightens…"));
    }
    const tk = now - (tKod || t0);
    if (tryb === "kod" && !lad && tk < PINBALL.komnataMs && !still) {
      // The chamber: brick walls, a launch lane with brass rails, the spring under the ball.
      cegly(0);
      const napiecie = ease(clamp(tk / PINBALL.napinanieMs));
      const strzal = clamp((tk - PINBALL.napinanieMs) / PINBALL.wystrzalMs);
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
      await decyzja;
      if (tryb === "hala") {
        if (k.cel) cel = k.cel;
        await new Promise<void>((done) => {
          koniecPrzyjazdu = done;
          hala.tory[0].ready = true;
          if (still) przyjazd(performance.now());
        });
        return;
      }
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
