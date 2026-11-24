// Panel admina: zakładki Łup (stworki + miejsca), Przedmioty (wgranie obrazka, zapis) i Umiejętności.
// Serwer udawany (route). Uruchom po `vite build`: node scripts/tests/browser-admin-lup.mjs (PORT, domyślnie 4173 z vite preview).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = process.env.PORT ?? '4173';
const BASE = process.env.BASE ?? `http://localhost:${PORT}/admin.html`;
const out = 'work/admin-lup';
const baza = { przedmioty: [], pomysly: [] };
const zapisy = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const bledy = [];
page.on('pageerror', (e) => bledy.push(e.message));
await page.route('**/rest/v1/rpc/**', async (route) => {
  const fn = route.request().url().split('/rpc/')[1];
  const a = JSON.parse(route.request().postData() || '{}');
  const ok = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (fn === 'admin_overview') return ok({ players: [], missions: [], codes: [], deaths: 0 });
  if (fn === 'game_przedmioty') return ok(baza.przedmioty);
  if (fn === 'admin_przedmioty') return ok({ przedmioty: baza.przedmioty });
  if (fn === 'admin_przedmiot_zapisz') {
    zapisy.push(a);
    const i = baza.przedmioty.findIndex((p) => p.id === a.p_id);
    const prev = i >= 0 ? baza.przedmioty[i] : {};
    const w = { id: a.p_id, dane: a.p_dane, ikona: a.p_ikona ?? prev.ikona, ikona_hd: a.p_ikona_hd ?? prev.ikona_hd, aktywny: a.p_aktywny, tylko_test: a.p_tylko_test };
    if (i >= 0) baza.przedmioty[i] = w; else baza.przedmioty.push(w);
    return ok({ ok: true });
  }
  if (fn === 'admin_stwory') return ok({ stwory: {} });
  if (fn === 'admin_settings') return ok({ values: {}, gold: { alive: 0, coins: 0, chest: 0, diamonds: 0 } });
  if (fn === 'admin_umiej_pomysly') return ok({ pomysly: baza.pomysly });
  if (fn === 'admin_umiej_pomysl_zapisz') { baza.pomysly.push({ id: 1, nazwa: a.p_nazwa, bron: a.p_bron, opis: a.p_opis, status: a.p_status, updated_at: new Date().toISOString() }); return ok({ ok: true }); }
  return ok({});
});
const sprawdz = (w, opis) => { if (!w) throw new Error('NIE: ' + opis); console.log('ok –', opis); };
await page.goto(BASE);
await page.fill('input[type=password]', 'x');
await page.click('button[type=submit]');
await page.getByRole('button', { name: '🎒 Przedmioty' }).click();
await page.getByRole('button', { name: '＋ Nowy przedmiot' }).click();
await page.setInputFiles('input[type=file]', `${out}/miecz.png`);
await page.waitForSelector('text=Obrazek gotowy');
await page.locator('label.f:has-text("Nazwa (PL)") input').fill('Ostrze Burzy');
await page.locator('label.f:has-text("Nazwa (EN)") input').fill('Storm Blade');
await page.locator('label.f:has-text("Obrażenia – minimum") input').fill('12');
await page.locator('label.f:has-text("Obrażenia – maksimum") input').fill('18');
await page.locator('label.f:has-text("Umiejętność z przedmiotu") select').selectOption('zamach');
await page.screenshot({ path: `${out}/1-formularz.png`, fullPage: true });
await page.getByRole('button', { name: '💾 Zapisz przedmiot' }).click();
await page.waitForSelector('[data-wlasny="w_ostrze_burzy"]');
const z = zapisy[0];
sprawdz(z.p_id === 'w_ostrze_burzy', 'id z nazwy');
sprawdz(z.p_ikona.startsWith('data:image/png') && z.p_ikona.length < 120000, `mały obrazek PNG (${z.p_ikona.length} znaków)`);
sprawdz(/^data:image\/(webp|png)/.test(z.p_ikona_hd) && z.p_ikona_hd.length < 400000, `duży obrazek (${z.p_ikona_hd.length} znaków)`);
sprawdz(z.p_dane.obrazenia[0] === 12 && z.p_dane.obrazenia[1] === 18 && z.p_dane.umiejetnosc === 'zamach' && z.p_dane.rzadkosc === 'epicki', 'statystyki');
const wym = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return [i.width, i.height]; }, z.p_ikona);
sprawdz(wym[0] === 64 && wym[1] === 64, 'mały 64×64');
// JPG z białym tłem: tło znika
await page.getByRole('button', { name: '＋ Nowy przedmiot' }).click();
await page.locator('label.f:has(> span:text-is("Miejsce")) select').selectOption('dystans');
await page.locator('label.f:has(> span:text-is("Rodzaj")) select').selectOption('magia');
await page.setInputFiles('input[type=file]', `${out}/kula.jpg`);
await page.waitForSelector('text=Obrazek gotowy');
await page.locator('label.f:has-text("Nazwa (PL)") input').fill('Kula Mgły');
await page.getByRole('button', { name: '💾 Zapisz przedmiot' }).click();
await page.waitForSelector('[data-wlasny="w_kula_mgly"]');
const rog = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(1, 1, 1, 1).data[3]; }, zapisy[1].p_ikona);
sprawdz(rog === 0, 'białe tło JPG wycięte');
await page.screenshot({ path: `${out}/2-lista.png`, fullPage: true });
// Łup: własny przedmiot na liście, miejsca są
await page.getByRole('button', { name: '💰 Łup' }).click();
await page.waitForSelector('#lup-miejsca');
await page.locator('.card:has-text("Ukryta skrzynia") button:has-text("Dodaj przedmiot")').click();
const sel = page.locator('.card:has-text("Ukryta skrzynia") select').first();
await sel.selectOption('w_ostrze_burzy');
sprawdz((await sel.inputValue()) === 'w_ostrze_burzy', 'własny przedmiot do wyboru w łupie miejsca');
await page.locator('.card:has-text("Ukryta skrzynia")').screenshot({ path: `${out}/3-lup-miejsce.png` });
// Umiejętności
await page.getByRole('button', { name: '✨ Umiejętności' }).click();
await page.waitForSelector('text=Pomysły na nowe umiejętności');
sprawdz(await page.locator('td:has-text("Ostrze Burzy")').count() === 1, 'umiejętność pokazuje przedmiot, który ją daje');
await page.locator('input[placeholder="np. Łańcuch piorunów"]').first().fill('Łańcuch piorunów');
await page.getByRole('button', { name: '＋ Dodaj pomysł' }).click();
await page.waitForFunction(() => document.querySelectorAll('input[placeholder="np. Łańcuch piorunów"]').length === 2);
sprawdz(baza.pomysly[0]?.nazwa === 'Łańcuch piorunów', 'pomysł zapisany');
await page.screenshot({ path: `${out}/4-umiejetnosci.png`, fullPage: true });
sprawdz(!bledy.length, 'bez błędów strony ' + bledy.join(' | '));
await browser.close();
