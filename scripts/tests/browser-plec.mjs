// Gender choice at character creation (owner, 22 Nov 2026). Real built menu, reached directly and through the legacy QR link; the server is mocked
// and create_character is answered with an error, so no character is made – the test only reads the sent look.
// Usage: npm run build, then node scripts/tests/browser-plec.mjs (TELEFON=1 = phone viewport).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PORT = Number(process.env.PORT || 4191);
const server = await preview({ preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
await mkdir('work/plec', { recursive: true });
const telefon = process.env.TELEFON === '1';
try {
  for (const [nazwa, url] of [['menu', '/?lang=pl#nowa'], ['qr', '/?lang=pl&d=ShgD6aib8']]) {
    const context = await browser.newContext({ viewport: telefon ? { width: 390, height: 844 } : { width: 1280, height: 800 }, locale: 'pl-PL', hasTouch: telefon });
    const wyslane = [];
    await context.route('**/*.supabase.co/**', (route) => {
      const u = new URL(route.request().url());
      if (u.pathname.endsWith('/create_character')) {
        wyslane.push(route.request().postDataJSON());
        return route.fulfill({ status: 400, json: { message: 'test: bez tworzenia' } });
      }
      if (u.pathname.includes('/auth/')) return route.fulfill({ json: { external: { google: false } } });
      return route.fulfill({ json: u.pathname.endsWith('game_content') ? [] : null });
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${url}`);
    const box = page.locator('#menu .m-plec');
    await box.waitFor({ timeout: 120000 });
    const imie = page.locator('#menu input').first();
    const wyslij = page.getByRole('button', { name: 'Stwórz postać', exact: true });
    // Nothing picked: refused with a message, nothing sent.
    await wyslij.click();
    await page.getByText('Wybierz płeć postaci.').waitFor();
    assert.equal(wyslane.length, 0, 'sent without a gender');
    // Woman: the untouched ready-made name becomes a woman's name.
    const kobieta = box.getByRole('radio', { name: /Kobieta/ });
    await kobieta.evaluate((button) => {
      const random = Math.random;
      try {
        Math.random = () => 0;
        button.click();
      } finally {
        Math.random = random;
      }
    });
    assert.equal(await imie.inputValue(), 'Dobrawa Budowniczka');
    assert.equal(await box.getByRole('radio', { name: /Kobieta/ }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByText('Wybierz płeć postaci.').count(), 0, 'message left after choosing');
    await page.screenshot({ path: `work/plec/${nazwa}-${telefon ? 'telefon' : 'komputer'}.png` });
    await wyslij.click();
    await page.getByText('test: bez tworzenia').waitFor();
    let look = wyslane.at(-1).p_look;
    assert.equal(look.modul.p, 'k'); assert.equal(look.guard3d, 'k');
    // Man; a typed name stays as typed.
    await imie.fill('Testowy');
    await box.getByRole('radio', { name: /Mężczyzna/ }).click();
    assert.equal(await imie.inputValue(), 'Testowy');
    await wyslij.click();
    await page.waitForFunction((n) => n, null, { timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(500);
    look = wyslane.at(-1).p_look;
    assert.equal(look.modul.p, 'm'); assert.equal(look.guard3d, 'm');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal scroll');
    console.log(`${nazwa} ${telefon ? 'telefon' : 'komputer'}: wybór płci wymagany, kobieta/mężczyzna zapisani w wyglądzie, imię dopasowane – OK`);
    await context.close();
  }
} finally { await browser.close(); await server.httpServer.close(); }
