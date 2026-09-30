import type Phaser from 'phaser';
import { gameShot } from './snapshot';
import { pixelLogo } from './logo';

// "📸 Pochwal się": a square picture for Instagram / WhatsApp – the game's view
// right now (without the HUD), the logo, the character's name and what they
// achieved – shown in a window with "Udostępnij" (the phone's share menu,
// with the picture) and "Zapisz obrazek".

/** Size of the square picture (px). */
const BOK = 1080;

export interface Brag {
  /** The achievement, big, e.g. "Brat smoków". */
  title: string;
  /** The line over it, e.g. "Gratulacje!". */
  top?: string;
  /** A smaller line under it, e.g. "poziom 20 · 19 000 EXP". */
  sub?: string;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the square card. */
export async function bragCard(game: Phaser.Game, name: string, b: Brag): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas');
  c.width = c.height = BOK;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1e1a24';
  ctx.fillRect(0, 0, BOK, BOK);
  const shot = await gameShot(game, { maxW: 1400, withHud: false });
  if (shot) {
    // Cover the square, keeping the hero (the middle of the view) in the middle.
    const k = Math.max(BOK / shot.width, BOK / shot.height);
    const w = shot.width * k, h = shot.height * k;
    ctx.imageSmoothingEnabled = false;
    // The hero a bit above the middle, clear of the words at the bottom (as far as the picture reaches).
    const up = Math.min(140, (h - BOK) / 2 + 140);
    ctx.drawImage(shot, (BOK - w) / 2, (BOK - h) / 2 - up, w, h);
  }
  // Dark bands top and bottom so the words read on any map.
  const top = ctx.createLinearGradient(0, 0, 0, 230);
  top.addColorStop(0, 'rgba(20,16,26,0.85)');
  top.addColorStop(1, 'rgba(20,16,26,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, BOK, 230);
  const bot = ctx.createLinearGradient(0, BOK - 460, 0, BOK);
  bot.addColorStop(0, 'rgba(20,16,26,0)');
  bot.addColorStop(0.35, 'rgba(20,16,26,0.82)');
  bot.addColorStop(1, 'rgba(20,16,26,0.95)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, BOK - 460, BOK, 460);
  // Logo.
  const logo = pixelLogo(undefined, 10);
  ctx.imageSmoothingEnabled = false;
  const lw = Math.min(BOK - 120, logo.width);
  ctx.drawImage(logo, 60, 50, lw, (logo.height * lw) / logo.width);
  // Words.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff2a8';
  ctx.font = 'bold 54px ui-monospace, Menlo, Consolas, monospace';
  let y = BOK - 380;
  if (b.top) {
    ctx.fillText(b.top, BOK / 2, y);
    y += 30;
  }
  ctx.fillStyle = '#f7c531';
  ctx.font = 'bold 96px ui-monospace, Menlo, Consolas, monospace';
  for (const line of wrap(ctx, b.title, BOK - 120)) {
    y += 96;
    ctx.fillText(line, BOK / 2, y);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px ui-monospace, Menlo, Consolas, monospace';
  y += 72;
  ctx.fillText(name, BOK / 2, y);
  ctx.fillStyle = '#c9c3d6';
  ctx.font = '34px ui-monospace, Menlo, Consolas, monospace';
  const date = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  if (b.sub) ctx.fillText(b.sub, BOK / 2, BOK - 92);
  ctx.fillText(`${date} · exp-lore.app`, BOK / 2, BOK - 44);
  return c;
}

/** The window with the card and its buttons. */
export async function showBrag(game: Phaser.Game, name: string, b: Brag): Promise<void> {
  const card = await bragCard(game, name, b);
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'm-screen';
    root.id = 'brag';
    const box = document.createElement('div');
    box.className = 'm-box';
    const h = document.createElement('h2');
    h.textContent = '📸 Pochwal się';
    const img = Object.assign(document.createElement('img'), { src: card.toDataURL('image/jpeg', 0.9), alt: b.title });
    img.style.cssText = 'width:100%;border-radius:6px;border:2px solid #4a4a55;display:block;margin:6px 0 10px';
    const msg = document.createElement('p');
    msg.style.cssText = 'min-height:1.2em;color:#fff2a8;margin:4px 0';
    const blob = () => new Promise<Blob>((ok, no) => card.toBlob((x) => (x ? ok(x) : no(new Error('no image'))), 'image/jpeg', 0.9));
    const fileName = `exp-lore-${name}-${b.title}.jpg`.replace(/\s+/g, '-');
    const text = `${b.top ? `${b.top} ` : ''}${name}: ${b.title} w Exp-lore! https://exp-lore.app`;
    const save = async () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await blob());
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    const share = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn m-primary', textContent: '📤 Udostępnij' });
    share.onclick = async () => {
      try {
        const file = new File([await blob()], fileName, { type: 'image/jpeg' });
        const data = { title: 'Exp-lore', text, files: [file] };
        if (navigator.share && navigator.canShare?.(data)) return void (await navigator.share(data));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
      // No share menu with pictures here (most computers): save it instead.
      await save();
      msg.textContent = 'Obrazek zapisany – wyślij go, komu chcesz.';
    };
    const saveBtn = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn', textContent: '💾 Zapisz obrazek' });
    saveBtn.onclick = () => void save();
    const close = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn', textContent: 'Zamknij' });
    const done = () => {
      root.remove();
      resolve();
    };
    close.onclick = done;
    root.onclick = (e) => e.target === root && done();
    box.append(h, img, share, saveBtn, msg, close);
    root.append(box);
    document.body.append(root);
  });
}
