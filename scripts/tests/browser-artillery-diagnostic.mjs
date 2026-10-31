import { createRequire } from "node:module";
import { preview } from "vite";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const server = await preview({
    preview: { host: "127.0.0.1", port: 4190, strictPort: true },
  }),
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE,
    args: ["--no-sandbox"],
  });
await mkdir("work/artillery", { recursive: true });
const n = JSON.parse(await readFile("public/artillery/lublin.json"));
n.diagnostics = JSON.parse(
  gunzipSync(await readFile("public/artillery/lublin-diagnostics.json.gz")),
);
const points = [...n.stops, ...n.diagnostics.uncovered];
try {
  for (const [name, width, height] of [
    ["desktop", 1280, 800],
    ["phone", 390, 844],
  ]) {
    const page = await browser.newPage({
        viewport: { width, height },
        locale: "pl-PL",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4190/artillery.html");
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "LUBLIN",
      null,
      { timeout: 60000 },
    );
    assert(
      (await page.locator("#stats").innerText()).includes(
        String(n.stops.length),
      ),
    );
    await page.screenshot({ path: `work/artillery/${name}-diagnostic.png` });
    await page.locator("#plus").click();
    await page.locator("#minus").click();
    await page.locator("#fit").click();
    await page.locator("#rejects").check();
    await page.locator("#rejects").uncheck();
    const box = await page.locator("canvas").boundingBox(),
      x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y)),
      w = Math.max(...points.map((p) => p.x)) - x,
      h = Math.max(...points.map((p) => p.y)) - y,
      scale = Math.min((box.width - 60) / w, (box.height - 60) / h),
      ox = box.width / 2 - (x + w / 2) * scale,
      oy = box.height / 2 - (y + h / 2) * scale;
    for (const stop of n.stops.slice(0, 2))
      await page.mouse.click(
        box.x + stop.x * scale + ox,
        box.y + stop.y * scale + oy,
      );
    assert((await page.locator("#selection").innerText()).length > 0);
    await page.route("**/artillery/warszawa*", (r) =>
      r.fulfill({ status: 404, body: "fixture missing" }),
    );
    await page.locator("#city").selectOption("warszawa");
    await page.waitForFunction(() =>
      document
        .querySelector("#status")
        .textContent.includes("Walidacja nie została wykonana"),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS diagnostic",
      name,
      "real Lublin snapshot, pan/zoom controls, selection, no fabricated Warsaw validation",
    );
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
