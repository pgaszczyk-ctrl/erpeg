import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { preview } from "vite";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
await mkdir("work/combat3d", { recursive: true });
const server = await preview({
  preview: { host: "127.0.0.1", port: 4178, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE,
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});
try {
  for (const mobile of [false, true]) {
    const tag = mobile ? "phone" : "desktop",
      errors = [],
      network = [];
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 860 },
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: 1,
    });
    await context.route("https://fonts.googleapis.com/**", (r) =>
      r.fulfill({ status: 200, body: "" }),
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => network.push(r.url()));
    await page.goto("http://127.0.0.1:4178/combat3d.html?qa=1");
    await page.waitForSelector("#start:not([hidden])", { timeout: 60000 });
    await page.click("#start");
    const snap = () => page.evaluate(() => window.__combat3d.snapshot());
    const fixture = (name) =>
      page.evaluate((n) => window.__combat3d.fixture(n), name);
    const gameWait = async (seconds) => {
      const t = (await snap()).time;
      await page.waitForFunction(
        (target) => window.__combat3d.snapshot().time >= target,
        t + seconds,
        { timeout: 20000 },
      );
    };
    const attack = async () => {
      if (mobile) {
        const b = await page.locator("#attack-stick").boundingBox();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      } else await page.keyboard.press("Space");
    };
    await gameWait(0.4);
    assert((await snap()).map.buildings > 100);
    await page.screenshot({ path: `work/combat3d/${tag}-city.png` });
    await fixture("target");
    await attack();
    await gameWait(0.6);
    assert.equal((await snap()).enemies[0].hp, 84, "melee hits exactly once");
    await page.click("#sweep");
    await gameWait(0.7);
    assert.equal((await snap()).enemies[0].hp, 60, "sweep hits once");
    await page.keyboard.press("KeyQ");
    await gameWait(0.3);
    assert.equal(
      (await snap()).enemies[0].hp,
      60,
      "sweep cooldown cannot be bypassed",
    );
    console.log(`PASS ${tag}: melee, sweep, cooldown`);
    await page.click('[data-weapon="magic"]');
    await fixture("target");
    await gameWait(0.5);
    await attack();
    await gameWait(0.8);
    assert.equal(
      (await snap()).enemies[0].hp,
      82,
      "aimed magic projectile hits",
    );
    console.log(`PASS ${tag}: magic and assisted aim`);
    await fixture("hurt");
    await page.click("#heal");
    await gameWait(0.15);
    assert.equal(
      Math.round((await snap()).player.hp),
      63,
      "potion heals immediately",
    );
    await page.keyboard.press("KeyH");
    await gameWait(0.2);
    assert.equal(
      Math.round((await snap()).player.hp),
      63,
      "potion cooldown works",
    );
    await page.click("#pause");
    const t = (await snap()).time;
    await page.waitForTimeout(350);
    assert.equal((await snap()).time, t, "pause freezes simulation");
    await page.click("#pause");
    await gameWait(0.2);
    console.log(`PASS ${tag}: healing and pause`);
    await fixture("empty");
    const before = (await snap()).player;
    if (mobile) {
      const b = await page.locator("#move-stick").boundingBox(),
        cdp = await context.newCDPSession(page),
        x = b.x + b.width / 2,
        y = b.y + b.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + 32, y, id: 1 }],
      });
      await gameWait(0.5);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      const after = (await snap()).player;
      assert(
        Math.hypot(after.x - before.x, after.z - before.z) > 0.1,
        "touch stick moves",
      );
      await gameWait(0.3);
      const stopped = (await snap()).player;
      assert(
        Math.hypot(stopped.x - after.x, stopped.z - after.z) < 0.01,
        "release stops movement",
      );
      await fixture("target");
      const hp = (await snap()).enemies[0].hp;
      const a = await page.locator("#attack-stick").boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: a.x + 40, y: a.y + 40, id: 2 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      await gameWait(0.6);
      assert.equal(
        (await snap()).enemies[0].hp,
        hp,
        "touch cancellation does not attack",
      );
    } else {
      await page.keyboard.down("KeyD");
      await gameWait(0.5);
      await page.keyboard.up("KeyD");
      const after = (await snap()).player;
      assert(
        Math.hypot(after.x - before.x, after.z - before.z) > 0.1,
        "keyboard moves",
      );
    }
    console.log(`PASS ${tag}: movement and input cleanup`);
    await fixture("death");
    await gameWait(1.3);
    const restored = await snap();
    assert(
      Math.hypot(
        restored.player.x - restored.home.x,
        restored.player.z - restored.home.z,
      ) < 0.1,
      "death returns to refuge",
    );
    assert.equal(restored.player.coins, 0);
    assert(restored.player.hp > 0);
    await page.click('[data-weapon="magic"]');
    const saved = (await snap()).player;
    await page.reload();
    await page.waitForSelector("#start:not([hidden])");
    assert.equal((await snap()).weapon, "magic");
    assert.equal((await snap()).player.coins, saved.coins);
    await page.click("#start");
    assert(
      !network.some((url) => url.includes("supabase")),
      "laboratory never touches real player server",
    );
    assert.deepEqual(errors, []);
    await fixture("duel");
    await gameWait(0.5);
    await page.screenshot({ path: `work/combat3d/${tag}-combat.png` });
    console.log(
      `PASS ${tag}: death, local save, no live backend, no page errors`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
