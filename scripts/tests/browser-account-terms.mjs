// Real built account window; all authentication requests are intercepted, no real users are created.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await preview({ preview: { host: '127.0.0.1', port: 4188, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
await mkdir('work/account-terms', { recursive: true });
try {
  for (const [name, width, height] of [['desktop', 1280, 800], ['phone', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pl-PL', reducedMotion: 'reduce' });
    const requests = { signup: 0, recover: 0, token: 0, settings: 0 };
    await context.route('**/*.supabase.co/**', route => {
      const endpoint = new URL(route.request().url()).pathname.split('/').pop();
      if (endpoint in requests) requests[endpoint]++;
      if (endpoint === 'token') return route.fulfill({ status: 400, json: { msg: 'Invalid login credentials' } });
      if (endpoint === 'settings') return route.fulfill({ json: { external: { google: false } } });
      return route.fulfill({ json: {} });
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4188/?lang=pl#konto');
    const root = page.locator('#account');
    await root.waitFor({ timeout: 120000 });
    const email = root.locator('input[name=email]'), password = root.locator('input[name=password]');
    await email.fill('fixture@example.com'); await password.fill('test-password-123');
    await root.getByRole('button', { name: 'Zaloguj', exact: true }).click();
    await root.getByText('Zły e-mail albo hasło.').waitFor();
    assert.equal(requests.token, 1);
    await root.getByRole('button', { name: 'Nie pamiętam hasła' }).click();
    await root.getByText(/Jeśli to konto istnieje/).waitFor();
    assert.equal(requests.recover, 1);
    const signup = root.getByRole('button', { name: 'Załóż konto', exact: true });
    assert.equal(await root.locator('input[type=checkbox], select, fieldset').count(), 0);
    const notice = root.locator('.account-terms');
    assert.equal(await notice.innerText(), 'Zakładając konto, akceptujesz regulamin gry.');
    const layout = await notice.evaluate(e => ({ size: parseFloat(getComputedStyle(e).fontSize), height: e.getBoundingClientRect().height }));
    assert(layout.size <= 12 && layout.height <= 20, JSON.stringify(layout));
    await page.screenshot({ path: `work/account-terms/${name}-registration.png`, fullPage: true });
    const [terms] = await Promise.all([context.waitForEvent('page'), root.getByRole('link', { name: 'regulamin gry', exact: true }).first().click()]);
    await terms.waitForLoadState();
    assert.match(terms.url(), /\/regulamin.html$/);
    await terms.getByRole('heading', { name: 'Regulamin gry Exp-lore', exact: true }).waitFor();
    assert.match(await terms.locator('main').innerText(), /Paweł Gąszczyk/);
    assert.match(await terms.locator('main').innerText(), /Gra jest bezpłatna/);
    assert(await terms.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await terms.screenshot({ path: `work/account-terms/${name}-terms.png`, fullPage: true });
    await terms.close();
    assert.equal(await email.inputValue(), 'fixture@example.com');
    await signup.click(); await root.getByText(/Wysłaliśmy e-mail z linkiem/).waitFor();
    assert.equal(requests.signup, 1); // One click, no extra registration steps.
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const google = root.getByRole('button', { name: /Zaloguj przez Google/ });
    await google.click(); await root.getByText('Logowanie przez Google nie jest jeszcze włączone na serwerze gry.').waitFor();
    assert.equal(requests.settings, 1);
    await context.close();
    console.log(`${name}: single-click registration, unchanged login/reset/Google, single-line terms notice and layout PASS`);
  }
} finally { await browser.close(); await server.httpServer.close(); }
