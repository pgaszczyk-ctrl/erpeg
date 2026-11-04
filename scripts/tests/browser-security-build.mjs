// Check the real built pages through Vite preview; every external request is mocked.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173/';
mkdirSync('work/security', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox','--enable-unsafe-swiftshader'] });
try {
  for (const phone of [false, true]) {
    const ctx = await browser.newContext({ viewport: phone ? { width:390,height:844 } : { width:1280,height:720 }, isMobile:phone,hasTouch:phone });
    await ctx.route('**/*', route => {
      if (route.request().url().startsWith(base)) return route.continue();
      return route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify({external:{google:false}}) });
    });
    await ctx.addInitScript(() => { window.close=()=>{}; });
    const page=await ctx.newPage();
    const attack='<img src="data:,invalid" onerror="window.injected=true">';
    await page.goto(base+'?google=1#error_description='+encodeURIComponent(attack));
    await page.waitForFunction(()=>document.body.textContent.includes('data:,invalid'));
    assert.equal(await page.evaluate(()=>window.injected),undefined);
    assert.equal(await page.locator('img[onerror]').count(),0);
    assert.equal(new URL(page.url()).hash,'');
    await page.screenshot({path:`work/security/built-auth-${phone?'phone':'desktop'}.png`});
    await page.goto(base+'?google=1#access_token=DUMMY&refresh_token=DUMMY&type=recovery');
    await page.waitForSelector('input[autocomplete="new-password"]');
    assert.equal(new URL(page.url()).hash,'');
    await page.evaluate(()=>{localStorage.removeItem('erpeg-google');sessionStorage.setItem('erpeg-admin','SYNTHETIC');});
    await page.goto(base+'admin.html');
    await page.waitForSelector('input[autocomplete="current-password"]');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('erpeg-admin')),null);
    await page.goto(base+'?lang=pl');
    await page.waitForSelector('#menu',{timeout:60000});
    await page.screenshot({path:`work/security/built-menu-${phone?'phone':'desktop'}.png`});
    console.log(`PASS built ${phone?'phone':'desktop'}: XSS, recovery, admin storage, game menu`);
    await ctx.close();
  }
} finally { await browser.close(); }
