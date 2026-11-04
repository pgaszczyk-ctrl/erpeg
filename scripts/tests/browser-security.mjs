// Isolated regression: actual auth functions, synthetic storage, no remote traffic.
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = readFileSync('src/google.ts', 'utf8');
const callback = source.slice(source.indexOf('export function catchGoogleReturn()'), source.indexOf('\nconst PAGE ='))
  .replace('export function catchGoogleReturn(): boolean', 'function catchGoogleReturn()');
const logout = source.slice(source.indexOf('export function googleSignOut()'), source.indexOf('/** Is Google sign-in'))
  .replace('export function googleSignOut()', 'function googleSignOut()');
mkdirSync('work/security', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox'] });
try {
  for (const phone of [false, true]) {
    const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 720 }, isMobile: phone, hasTouch: phone });
    await context.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
    const page = await context.newPage();
    const attack = '<img src="data:,invalid" onerror="window.injected=true">';
    await page.goto('http://security.local/test/?google=1#error_description=' + encodeURIComponent(attack));
    await page.evaluate(code => {
      const KEY = 'erpeg-google';
      const sciezkaGry = () => location.pathname;
      window.close = () => {};
      eval(code + ';catchGoogleReturn();');
    }, callback);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await page.locator('img').count(), 0);
    assert((await page.locator('body').innerText()).includes(attack));
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(new URL(page.url()).search, '');
    await page.screenshot({ path: `work/security/auth-${phone ? 'phone' : 'desktop'}.png` });
    await page.goto('http://security.local/test/?google=1#access_token=DUMMY&refresh_token=DUMMY&type=recovery');
    const recovery = await page.evaluate(code => {
      const KEY = 'erpeg-google';
      const sciezkaGry = () => location.pathname;
      const store = s => { window.saved = s; };
      const emailOf = () => 'synthetic@example.invalid';
      const newPasswordPage = t => { window.recovery = t; };
      eval(code + ';catchGoogleReturn();');
      return { recovery: window.recovery, token: window.saved.access_token, hash: location.hash };
    }, callback);
    assert.deepEqual(recovery, { recovery: 'DUMMY', token: 'DUMMY', hash: '' });
    const signedOut = await page.evaluate(code => {
      const AUTH = 'https://auth.invalid/auth/v1';
      const RPC = { headers: { apikey: 'PUBLIC_DUMMY' } };
      const read = () => ({ access_token: 'DUMMY' });
      const store = value => { window.cleared = value === null; };
      window.fetch = async (url, options) => { window.request = { url, method: options.method, authorization: options.headers.Authorization }; return new Response('{}'); };
      eval(code + ';googleSignOut();');
      return { cleared: window.cleared, request: window.request };
    }, logout);
    assert.deepEqual(signedOut, { cleared: true, request: { url: 'https://auth.invalid/auth/v1/logout?scope=local', method: 'POST', authorization: 'Bearer DUMMY' } });
    await context.close();
    console.log(`PASS ${phone ? 'phone' : 'desktop'}: OAuth XSS, URL cleanup, recovery, remote logout`);
  }
} finally { await browser.close(); }
