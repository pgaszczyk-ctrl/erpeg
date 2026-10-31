// Built game with isolated map/RPC fixtures. Does not access real accounts or wallet data.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { preview } from "vite";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const server = await preview({
  preview: { host: "127.0.0.1", port: 4189, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  chromiumSandbox: false,
});
const ring = [0, 0, 5760, 0, 0, 5760, -5760, 0],
  lat0 = (51.25 * Math.PI) / 180;
const mLon = 111412.84 * Math.cos(lat0),
  mLat = 111132.954 - 559.822 * Math.cos(2 * lat0);
const map = {
  unitsPerM: 1.92,
  w: 3000,
  h: 3000,
  bounds: { minLat: 51.2, maxLat: 51.3, minLon: 22.4, maxLon: 22.5 },
  boundary: [ring],
  areas: [["paved", ring]],
  lines: [["minor", 0, [0, 2880, 5760, 0], "Test road"]],
  buildings: [],
  pois: [],
  towns: [["Lublin", 2880, 2880]],
};
const stops = [
  { id: "a", x: 1500, y: 1515.625, name: "West", anchor: "a" },
  { id: "b", x: 2600, y: 1515.625, name: "East", anchor: "b" },
];
const registry = {
  id: "lublin",
  version: 1,
  origin: { lon: 22.4, lat: 51.3 },
  projection: { mLon, mLat },
  stops,
  edges: [["a", "b"]],
  rules: { price: 5 },
  diagnostics: {
    rejected: [],
    uncovered: [],
    missing: [],
    covered: 2,
    demands: 2,
    maxWalkM: 1750,
    diameter: 1,
    meanHops: 1,
  },
};
const at = (id) => ({
  m: "lublin",
  x: id === "a" ? 2880 : 4992,
  y: 2910,
  s: 1.92,
});
await mkdir("work/artillery", { recursive: true });
const results = [];
try {
  for (const [tag, width, height, mobile] of [
    ["desktop", 1280, 800, false],
    ["phone", 844, 390, true],
    ["upright", 390, 844, true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: mobile ? "reduce" : "no-preference",
      locale: "pl-PL",
    });
    let save = {
        coins: 100,
        story: { st: "koniec", walked: 99 },
        flagi: { samouczek: 1 },
        equip: { bron: "zelazny" },
        skills: { miecz: 0, luk: 0, magia: 0 },
      },
      discovered = ["b"],
      receipts = new Map(),
      failBegin = true,
      chargeCount = 0,
      settleCount = 0;
    const requests = [];
    await context.route("**/map/lublin.json", (r) => r.fulfill({ json: map }));
    await context.route("**/map/world.json", (r) =>
      r.fulfill({ json: { lublin: [], towns: [], edges: [] } }),
    );
    await context.route("**/artillery/index.json", (r) =>
      r.fulfill({ json: [{ id: "lublin", bounds: [22.3, 51.1, 22.8, 51.4] }] }),
    );
    await context.route("**/artillery/lublin.json", (r) =>
      r.fulfill({ json: registry }),
    );
    await context.route("**/*.supabase.co/**", async (r) => {
      const fn = new URL(r.request().url()).pathname.split("/").pop(),
        data = r.request().postDataJSON();
      requests.push(fn);
      let body = null;
      if (fn === "login")
        body = {
          token: "fixture",
          player: {
            name: "Jam",
            idik: "ANGELIKA",
            start_place: "Lublin",
            start_x: 2880,
            start_y: 2880,
            map_scale: 1.92,
            exp: 0,
            dead: false,
            age: 12,
            konto: true,
            save,
          },
        };
      if (fn === "save_game") {
        save = data.p_save;
        body = true;
      }
      if (["heartbeat", "logout", "log_error"].includes(fn)) body = true;
      if (
        [
          "game_content",
          "school_quizzes",
          "game_ports",
          "kurier_wiesci",
          "my_characters",
          "game_stwory",
        ].includes(fn)
      )
        body = [];
      if (fn === "game_settings") body = {};
      if (fn === "server_now") body = new Date().toISOString();
      if (fn === "ma_state")
        body = {
          enabled: true,
          version: 1,
          price: 5,
          discovered,
          pending:
            [...receipts.values()].find((r) => r.state === "pending") ?? null,
        };
      if (fn === "ma_discover") {
        if (!discovered.includes(data.p_stop)) discovered.push(data.p_stop);
        body = true;
      }
      if (fn === "ma_begin") {
        let receipt = receipts.get(data.p_nonce);
        if (!receipt) {
          chargeCount++;
          receipt = {
            nonce: data.p_nonce,
            origin: data.p_from,
            destination: data.p_to,
            state: "pending",
            price: 5,
            coins_after: save.coins - 5,
            origin_at: at(data.p_from),
            destination_at: at(data.p_to),
            hero: save.artilleryHero,
          };
          receipts.set(data.p_nonce, receipt);
          save = {
            ...save,
            coins: receipt.coins_after,
            tu: receipt.destination_at,
          };
        }
        // Simulate server committing the charge while its response is lost.
        if (failBegin) {
          failBegin = false;
          return r.abort("connectionreset");
        }
        body = receipt;
      }
      if (fn === "ma_settle") {
        const receipt = receipts.get(data.p_nonce);
        if (receipt.state === "pending") {
          settleCount++;
          receipt.state = data.p_cancel ? "cancelled" : "done";
          if (data.p_cancel)
            save = {
              ...save,
              coins: receipt.coins_after + 5,
              tu: receipt.origin_at,
            };
        }
        body = receipt;
      }
      return r.fulfill({ json: body });
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    const start =
      "http://127.0.0.1:4189/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1#postac=Jam&kod=ANGELIKA";
    console.log(tag, "starting");
    await page.goto(start);
    await page.waitForFunction(
      () =>
        window.__game?.scene.isActive("game") &&
        document.getElementById("loading-map")?.hidden !== false,
      null,
      { timeout: 120000 },
    );
    await page.evaluate(() => {
      const s = window.__game.scene.getScene("game");
      s.noHurtUntil = Infinity;
      s.protectUntil = Infinity;
      window.__session.immortal = true;
      for (const e of s.enemies) e.destroy();
      s.enemies = [];
      s.lingerUntil = 0;
      s.witam = false;
      s.player.extra = 2;
      s.player.extraUntil = Date.now() + 300000;
      s.player.boost = 0.3;
      s.player.boostUntil = Date.now() + 300000;
    });
    await page.waitForFunction(
      () => window.__game.scene.getScene("game").artillery?.art.size > 0,
      null,
      { timeout: 20000 },
    );
    await page.waitForFunction(() =>
      window.__game.scene
        .getScene("game")
        .artillery?.state.discovered.includes("a"),
    );
    await page.waitForFunction(()=>window.__game.scene.getScene('game').ludzik3d?.widoczny,null,{timeout:30000});
    const rig=await page.evaluate(()=>{const l=window.__game.scene.getScene('game').ludzik3d,j=l.g.model.getObjectByName('upperL'),before=j.quaternion.toArray(),frames=l.flightPortrait();return{frames:frames.length,different:new Set(frames).size,before,after:j.quaternion.toArray()};});assert.equal(rig.frames,6);assert(rig.different>1);assert.deepEqual(rig.before,rig.after,'preview wave poses restore the live rig');
    const identity = await page.evaluate(() => ({
      look: JSON.stringify(window.__session.look),
      equip: JSON.stringify(window.__gear.equip),
    }));
    assert(discovered.includes("a"), "approach discovers and writes to server");
    assert(requests.includes("ma_discover"));
    // In-combat panel cannot expose a launch button.
    await page.evaluate(() => {
      const s = window.__game.scene.getScene("game");
      s.inCombat = () => true;
      s.artillery.open(s.artillery.registry.stops[0]);
    });
    assert(await page.locator("#artillery-panel button").first().isDisabled());
    await page.locator("#artillery-panel button").last().click();
    await page.evaluate(() => {
      const s = window.__game.scene.getScene("game");
      s.inCombat = () => false;
    });
    if (mobile) await page.locator(".hs-akcja").click();
    else await page.keyboard.press("KeyE");
    await page.locator("#artillery-panel").waitFor();
    await page.screenshot({ path: `work/artillery/${tag}-panel.png` });
    const launch = page.locator("#artillery-panel button").first();
    assert(await launch.isEnabled());
    await launch.click();
    await page
      .getByRole("button", { name: "Ponów tę samą podróż" })
      .waitFor({ timeout: 30000 });
    assert.equal(chargeCount, 1);
    await page.screenshot({ path: `work/artillery/${tag}-lost-response.png` });
    await page.getByRole("button", { name: "Ponów tę samą podróż" }).click();
    await page.waitForFunction(
      () =>
        !document.getElementById("artillery-flight") &&
        Math.abs(window.__game.scene.getScene("game").player.x - 4992) < 10,
      null,
      { timeout: 60000 },
    );
    assert.equal(chargeCount, 1, "retry reuses nonce, no second fee");
    assert.deepEqual(
      await page.evaluate(() => ({
        look: JSON.stringify(window.__session.look),
        equip: JSON.stringify(window.__gear.equip),
      })),
      identity,
      "travel preserves appearance, gender and equipment",
    );
    assert.equal(
      await page.evaluate(
        () => window.__game.scene.getScene("game").player.extra,
      ),
      2,
    );
    assert.equal(
      await page.evaluate(
        () => window.__game.scene.getScene("game").player.boost,
      ),
      0.3,
    );
    assert.equal(settleCount, 1);
    assert.equal(await page.evaluate(() => window.__session.coins), 95);
    assert.equal(
      await page.evaluate(
        () => window.__game.scene.getScene("game").travelling,
      ),
      false,
    );
    assert(await page.locator(".hs-akcja").isVisible());
    await page.screenshot({ path: `work/artillery/${tag}-arrived.png` });
    // A refresh after a committed start is recovered without another begin request or another charge.
    const nonce = "00000000-0000-4000-8000-000000000001";
    receipts.set(nonce, {
      nonce,
      origin: "b",
      destination: "a",
      state: "pending",
      price: 5,
      coins_after: 90,
      origin_at: at("b"),
      destination_at: at("a"),
      hero: [...receipts.values()][0].hero,
    });
    save = { ...save, coins: 90, tu: at("a") };
    const before = chargeCount;
    console.log(tag, "reload recovery");
    await page.evaluate((url) => history.replaceState(null, "", url), start);
    await page.reload({ timeout: 30000, waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        window.__game?.scene.isActive("game") &&
        document.getElementById("loading-map")?.hidden !== false,
      null,
      { timeout: 120000 },
    );
    await page.waitForFunction(
      () => !window.__game.scene.getScene("game").travelling,
    );
    assert.equal(chargeCount, before);
    assert.equal(
      await page.evaluate(
        () => window.__game.scene.getScene("game").player.extra,
      ),
      2,
      "refresh restores timed effects from the receipt",
    );
    assert.equal(receipts.get(nonce).state, "done");
    assert(
      Math.abs(
        (await page.evaluate(
          () => window.__game.scene.getScene("game").player.x,
        )) - 2880,
      ) < 10,
    );
    // Failure while loading the destination returns to the original cannon and refunds exactly once.
    await page.evaluate(() => {
      const s = window.__game.scene.getScene("game");
      s.witam = false;
      s.lingerUntil = 0;
      s.inCombat = () => false;
      s.noHurtUntil = Infinity;
      const ensure = s.city.ensure.bind(s.city);
      s.city.ensure = async (...args) => {
        if (Math.abs(args[0] - 4992) < 10 && !window.__failedDestination) {
          window.__failedDestination = true;
          throw Error("Fixture destination loading failure");
        }
        return ensure(...args);
      };
    });
    if (mobile) await page.locator(".hs-akcja").click();
    else await page.keyboard.press("KeyE");
    await page.locator("#artillery-panel button").first().click();
    await page.getByRole("button", { name: "Wróć do armaty" }).waitFor();
    await page.getByRole("button", { name: "Wróć do armaty" }).click();
    await page.waitForFunction(
      () => !document.getElementById("artillery-flight"),
    );
    assert.equal(
      await page.evaluate(() => window.__session.coins),
      90,
      "failed destination refunds its charge",
    );
    assert.equal(save.coins, 90);
    assert(
      Math.abs(
        (await page.evaluate(
          () => window.__game.scene.getScene("game").player.x,
        )) - 2880,
      ) < 10,
    );
    console.log(tag, "recovered");
    assert.deepEqual(errors, []);
    results.push({
      tag,
      chargeCount,
      settleCount,
      discoveries: discovered,
      errors,
    });
    console.log("PASS", tag, JSON.stringify(results.at(-1)));
    await context.close();
  }
  await writeFile(
    "work/artillery/browser-results.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
