// Scan of "the game hangs" traps (owner, 8 Nov 2026: an iPhone held sideways left a dialog's buttons below the screen).
// Every window is opened on small phone screens – also opened on a taller screen and then shrunk, like a turned
// phone – and checked: every button can be reached (on screen, or inside something that scrolls), the game follows
// the new size, Escape/the window's own way out closes it and the game runs again afterwards.
// Run: VITE_TEST=1 npx vite build && npx vite preview --port 4173 & node scripts/tests/browser-skan-okien.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir('work/skan', { recursive: true });
const PORT = process.env.PORT || 4173;
const ring = [0, 0, 5760, 0, 0, 5760, -5760, 0];
const map = { unitsPerM: 1.92, w: 6000, h: 6000, bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 }, boundary: [ring], areas: [['paved', ring]], lines: [['minor', 0, [0, 3000, 5760, 0], 'Test']], buildings: [], pois: [], towns: [['Lublin', 2880, 2880]] };

// [name, size at open, size after (null = no change), touch]
const EKRANY = [
  ['iphone-obrot', { width: 390, height: 700 }, { width: 844, height: 340 }, true],
  ['se-poziomo', { width: 667, height: 320 }, null, true],
  ['maly-poziomo', { width: 568, height: 290 }, null, true],
  ['komputer-niski', { width: 1024, height: 520 }, null, false],
];

// Each opener runs in the page and returns nothing; the window is found afterwards.
const OKNA = {
  menu: `ui.openGameMenu()`,
  ustawienia: `ui.openSettingsMenu()`,
  kod: `ui.openGameMenu(); wybierz(1)`,
  bug: `ui.openGameMenu(); wybierz(2)`,
  muzyka: `ui.openSettingsMenu(); wybierz(3)`,
  trudnosc: `ui.openSettingsMenu(); wybierz(2)`,
  kufer: `ui.openCharacter('eq')`,
  kuferZloto: `ui.openCharacter('gold')`,
  dziennik: `ui.openCharacter('quests')`,
  mapa: `ui.openMap()`,
  sklep: `g.openShop({ id: 'shop:skan', kind: 'shop', name: 'Żabka', door: { x: g.player.x, y: g.player.y } })`,
  sklepSprzedaj: `g.openShop({ id: 'shop:skan', kind: 'shop', name: 'Żabka', door: { x: g.player.x, y: g.player.y } }, 1)`,
  kufer2: `g.openChest()`,
  gazeta: `g.newspaper({ id: 'skan', name: 'Franek', x: g.player.x, y: g.player.y })`,
  dlugiDialog: `g.dialog({ title: 'Wdowa Agata – Czarci Wyrok', text: 'Pod Trybunałem siedzi kobieta. '.repeat(30), buttons: ['Przyjmuję', 'Później'], kto: { tex: 'hd-babcia' }, onChoose: () => {} })`,
  wieleGuzikow: `g.dialog({ title: 'Lista', text: 'Wybierz.', buttons: Array.from({ length: 9 }, (_, i) => 'Opcja ' + (i + 1)), onChoose: () => {} })`,
  powrot: `window.__powrot.pokaz()`,
};

const W_STRONIE = () => {
  window.wybierz = (i) => {
    const ui = window.__game.scene.getScene('ui');
    const c = ui.dialogChoose; ui.closeDialog(); c?.(i);
  };
};

// What is open now, and can every button be reached?
const ZBADAJ = () => {
  const vv = window.visualViewport;
  const VW = vv ? vv.width : document.documentElement.clientWidth;
  const VH = vv ? vv.height : document.documentElement.clientHeight;
  const ui = window.__game.scene.getScene('ui');
  const gra = window.__game.scale;
  const ost = gra.width / (ui.view?.width || gra.width);
  const wynik = { okna: [], problemy: [], plotno: [Math.round(gra.width / ost), Math.round(gra.height / ost)], ekran: [Math.round(VW), Math.round(VH)] };
  const widoczny = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const przewijany = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) {
        const r = p.getBoundingClientRect();
        if (r.bottom > 20 && r.top < VH - 20 && r.right > 20 && r.left < VW - 20) return p;
      }
    }
    return null;
  };
  const okna = [...document.body.children].filter((el) => el.id && !/^(hud|game|test-badge|hud-tel|hud-ster|samouczek-krok|loch-wyjscie|update-bar|obrot-css|loading-map)$/.test(el.id) && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && widoczny(el));
  for (const o of okna) {
    const r = o.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) continue;
    wynik.okna.push(o.id);
    const guziki = [...o.querySelectorAll('button, [role=button], a[href], input:not([type=hidden]), select, textarea')].filter(widoczny);
    let wyjscie = false;
    for (const b of guziki) {
      const q = b.getBoundingClientRect();
      const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
      const naEkranie = q.left >= -1 && q.right <= VW + 1 && q.top >= -1 && q.bottom <= VH + 1;
      const nazwa = (b.getAttribute('aria-label') || b.textContent || b.tagName).trim().slice(0, 30);
      if (/zamknij|close|wyjd|✕|×|złóż|wstecz|anuluj|odejd|gram dalej|ok\b/i.test(nazwa + (b.className || ''))) wyjscie = wyjscie || naEkranie;
      if (naEkranie) {
        const hit = document.elementFromPoint(cx, cy);
        if (hit && hit !== b && !b.contains(hit) && !hit.contains(b) && !o.contains(hit)) wynik.problemy.push(`${o.id}: „${nazwa}” zasłonięty przez ${hit.id || hit.className || hit.tagName}`);
      } else if (!przewijany(b)) wynik.problemy.push(`${o.id}: „${nazwa}” poza ekranem (${Math.round(cx)},${Math.round(cy)}) i nie da się przewinąć`);
    }
    if (r.top < -2 || r.bottom > VH + 2) {
      // The window itself sticks out: fine only if its contents scroll.
      if (!(o.scrollHeight > o.clientHeight + 2) && !o.querySelector('*') ) wynik.problemy.push(`${o.id}: okno wystaje poza ekran`);
    }
    wynik[o.id + ':wyjscie'] = wyjscie;
  }
  if (ui.dialogBox) {
    wynik.okna.push('dialog');
    const real = ui.dialogButtons.filter((b) => b.index >= 0);
    const zle = real.filter((b) => b.rect.visible && b.rect.getBounds().bottom > ui.view.height + 0.5);
    const widac = real.filter((b) => b.rect.visible && b.rect.getBounds().bottom <= ui.view.height + 0.5);
    if (zle.length) wynik.problemy.push(`dialog: ${zle.length} przycisk(i) pod dolną krawędzią`);
    if (!widac.length && !ui.scrollMax && !ui.pisanie) wynik.problemy.push('dialog: żaden przycisk nie jest widoczny');
    const box = ui.dialogBox.getBounds();
    if (box.bottom > ui.view.height + 1 && !ui.scrollMax) wynik.problemy.push(`dialog: okno kończy się na ${Math.round(box.bottom)} przy ekranie ${Math.round(ui.view.height)}`);
  }
  if (Math.abs(wynik.plotno[1] - VH) > 2 || Math.abs(wynik.plotno[0] - VW) > 2) {
    const obr = document.documentElement.classList.contains('exp-obrot');
    if (!obr || Math.abs(wynik.plotno[0] - VH) > 2 || Math.abs(wynik.plotno[1] - VW) > 2) wynik.problemy.push(`płótno gry ${wynik.plotno.join('×')} ≠ ekran ${wynik.ekran.join('×')}`);
  }
  return wynik;
};

const STAN_GRY = () => {
  const g = window.__game;
  const ui = g.scene.getScene('ui');
  return { petla: g.loop.running, pauza: g.scene.isPaused('game'), dialog: !!ui.dialogBox, sklep: !!ui.shop };
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const raport = [];
try {
  for (const [nazwaEkranu, start, potem, dotyk] of EKRANY) {
    const context = await browser.newContext({ viewport: start, hasTouch: dotyk, isMobile: dotyk, deviceScaleFactor: 2, locale: 'pl-PL' });
    await context.route('**/map/lublin.json', (r) => r.fulfill({ json: map }));
    await context.route('**/map/world.json', (r) => r.fulfill({ json: { lublin: [], towns: [], edges: [] } }));
    await context.route('**/*.supabase.co/**', (route) => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      let body = true;
      if (name === 'login') body = { token: 't', player: { name: 'Jam', idik: 'ANGELIKA', start_place: 'Lublin', start_x: 3000, start_y: 3000, map_scale: 1.92, save: { coins: 5000, story: { st: 'start', walked: 0 }, flagi: { samouczek: 1 } }, exp: 400, dead: false, died_at: null, age: 12, konto: true } };
      if (/game_settings|game_stwory/.test(name)) body = {};
      if (/game_content|school_quizzes|game_ports|kurier_wiesci|my_characters/.test(name)) body = [];
      if (name === 'server_now') body = new Date().toISOString();
      if (name === 'weather') body = { cell: 'test', at: new Date().toISOString(), h: [] };
      if (name === 'settings') body = { external: { google: false } };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    const bledy = [];
    page.on('pageerror', (e) => bledy.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA`);
    await page.waitForFunction(() => window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').firstViewReady?.(), null, { timeout: 240000 });
    await page.waitForFunction(() => !document.querySelector('.lm-on'), null, { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => { const l = document.getElementById('loading-map'); return !l || getComputedStyle(l).display === 'none' || +getComputedStyle(l).opacity === 0; }, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate(W_STRONIE);
    for (const [okno, kod] of Object.entries(OKNA)) {
      if (potem) {
        await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => {});
        await page.setViewportSize(start);
        await page.waitForTimeout(700);
      }
      let blad = null;
      try {
        await page.evaluate((k) => { const g = window.__game.scene.getScene('game'); const ui = window.__game.scene.getScene('ui'); void g; void ui; eval(k); }, kod);
      } catch (e) { blad = e.message.split('\n')[0]; }
      await page.waitForTimeout(900);
      if (potem) { await page.setViewportSize(potem); await page.waitForTimeout(2200); }
      const w = await page.evaluate(ZBADAJ);
      await page.screenshot({ path: `work/skan/${nazwaEkranu}-${okno}.png` });
      // Close it: Escape first, then what a player would press.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(700);
      let s = await page.evaluate(STAN_GRY);
      let zamknieteEscape = !s.dialog && !s.sklep && !(await page.evaluate(ZBADAJ)).okna.length;
      for (let i = 0; i < 4 && !zamknieteEscape; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        zamknieteEscape = !(await page.evaluate(ZBADAJ)).okna.length;
      }
      // Escape didn't do it: press the window's own way out, like a player (a tap at its spot on the screen).
      let zamknietePalcem = zamknieteEscape;
      for (let i = 0; i < 4 && !zamknietePalcem; i++) {
        const gdzie = await page.evaluate(() => {
          const vv = window.visualViewport; const VW = vv.width, VH = vv.height;
          const kand = [...document.querySelectorAll('body > [id]:not(#hud):not(#hud-tel):not(#hud-ster) button, body > [id]:not(#hud):not(#hud-tel):not(#hud-ster) [role=button]')].filter((b) => {
            const t = (b.getAttribute('aria-label') || b.title || b.textContent || '').trim();
            const r = b.getBoundingClientRect();
            return r.width > 2 && /zamknij|close|wyjd|✕|×|złóż|wstecz|anuluj|odejd|gram dalej|^ok$|nie teraz|później/i.test(t) && r.left + r.width / 2 >= 0 && r.left + r.width / 2 <= VW && r.top + r.height / 2 >= 0 && r.top + r.height / 2 <= VH;
          });
          let b = kand[kand.length - 1];
          if (!b) {
            // Off screen: scroll to it like a finger would (only inside something that scrolls).
            const ukryty = [...document.querySelectorAll('body > [id]:not(#hud):not(#hud-tel):not(#hud-ster) button')].filter((x) => /zamknij|close|wyjd|✕|×|anuluj|odejd|gram dalej|^ok$/i.test((x.getAttribute('aria-label') || x.title || x.textContent || '').trim())).pop();
            if (!ukryty) return null;
            ukryty.scrollIntoView({ block: 'center' });
            const r = ukryty.getBoundingClientRect();
            if (r.top < 0 || r.bottom > VH) return null;
            b = ukryty;
          }
          const r = b.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        if (!gdzie) {
          // A Phaser dialog: its last (way-out) button.
          const pd = await page.evaluate(() => { const ui = window.__game.scene.getScene('ui'); if (!ui.dialogBox) return null; const b = ui.dialogButtons.filter((q) => q.index >= 0 && q.rect.visible).pop(); if (!b) return null; const r = b.rect.getBounds(); const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left + r.centerX, y: c.top + r.centerY }; });
          if (!pd) break;
          if (dotyk) await page.touchscreen.tap(pd.x, pd.y); else await page.mouse.click(pd.x, pd.y);
        } else if (dotyk) await page.touchscreen.tap(gdzie.x, gdzie.y); else await page.mouse.click(gdzie.x, gdzie.y);
        await page.waitForTimeout(600);
        zamknietePalcem = !(await page.evaluate(ZBADAJ)).okna.length;
      }
      await page.waitForTimeout(2200); // UIScene's unstick needs 1.5 s
      s = await page.evaluate(STAN_GRY);
      const problemy = [...w.problemy];
      if (blad) problemy.push(`nie otworzyło się: ${blad}`);
      if (!w.okna.length && !blad) problemy.push('nic się nie pokazało');
      if (!zamknietePalcem) problemy.push('NIE DA SIĘ ZAMKNĄĆ (zostało: ' + (await page.evaluate(ZBADAJ)).okna.join(', ') + ')');
      else if (!zamknieteEscape) problemy.push('(drobne) Escape nie zamyka, przycisk tak');
      if (!s.petla || s.pauza) problemy.push(`po zamknięciu gra stoi (pętla ${s.petla ? 'działa' : 'śpi'}, pauza ${s.pauza})`);
      raport.push({ ekran: nazwaEkranu, okno, okna: w.okna.join(','), problemy });
      console.log(`${problemy.length ? '✗' : '✓'} ${nazwaEkranu} ${okno} [${w.okna.join(',')}] ${problemy.join(' | ')}`);
      // Clean up anything left so the next window starts from a playing game.
      await page.evaluate(() => {
        const g = window.__game; const ui = g.scene.getScene('ui');
        ui.closeDialog?.();
        for (const el of [...document.body.children]) if (el.id && /^(character|minimap|shop|gazeta|prompt|brag|powrot|music-settings|codecard|chest|quit-ask|journey|tablica)$/.test(el.id)) el.remove();
        for (const el of [...document.querySelectorAll('.m-screen')]) if (el.id !== 'loading-map') el.remove();
        if (!g.loop.running) g.loop.wake();
        if (g.scene.isPaused('game')) g.scene.resume('game');
      });
      await page.waitForTimeout(300);
    }
    if (bledy.length) console.log('  błędy strony:', [...new Set(bledy)].slice(0, 5));
    await context.close();
  }
} finally {
  await browser.close();
}
const zle = raport.filter((r) => r.problemy.length);
console.log(`\n${raport.length - zle.length}/${raport.length} bez problemów`);
