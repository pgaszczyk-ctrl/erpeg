// Runs without game assets or a browser; exercises the real capture and flight code.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = p => stripTypeScriptTypes(readFileSync(p, 'utf8'), { mode: 'transform' });
const panorama = source('src/artillery/panorama.ts').replace(/^import .*$/mg, '').replace('export async function', 'async function');
const flight = source('src/artillery/flight.ts').replace(/^import .*$/mg, '').replaceAll('export ', '');
for (const [W, H] of [[1280, 800], [390, 844]]) {
  for (let d = 0; d < 8; d++) {
    const angle = d * Math.PI / 4;
    const drawn = [];
    const canvas = () => ({ width: W, height: H, getContext: () => new Proxy({
      drawImage: (...args) => drawn.push(args),
      createLinearGradient: () => ({ addColorStop() {} }),
    }, { get: (obj, key) => key in obj ? obj[key] : () => {} }) });
    let lastFog, restored = false, captures = 0, fail = false;
    const view = { x: 100, y: 200, width: W / 4, height: H / 4, clone() { return { ...this }; } };
    const cam = { worldView: view, scrollX: 100, scrollY: 200, useBounds: true, preRender() {}, stopFollow() {},
      centerOn(x, y) { this.scrollX = x - view.width / 2; this.scrollY = y - view.height / 2; },
      setScroll(x, y) { this.scrollX = x; this.scrollY = y; } };
    const scene = { cameras: { main: cam }, game: { canvas: { width: W, height: H },
      events: { once: (_, done) => queueMicrotask(done) } } };
    const ctx = vm.createContext({ document: { createElement: canvas }, performance, setTimeout, Math,
      gameShot: async () => { captures++; return fail ? null : canvas(); } });
    vm.runInContext(panorama, ctx);
    const net = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    const calls = [];
    const result = await ctx.landingPanorama(scene, net, angle, async (...a) => calls.push(a), () => true,
      () => { restored = true; }, v => { lastFog = v; });
    assert.equal(captures, 4);
    assert(restored && lastFog && cam.useBounds);
    assert.equal(cam.scrollX, 100); assert.equal(cam.scrollY, 200);
    assert(Math.max(result.shot.width, result.shot.height) <= 2048);
    assert(Math.abs(calls[0][0] - (net.x - .3 * view.width * Math.cos(angle))) < 1e-8);
    assert(Math.abs(calls[0][1] - (net.y - .3 * view.height * Math.sin(angle))) < 1e-8);
    fail = true; restored = false;
    await assert.rejects(ctx.landingPanorama(scene, net, angle, async () => {}, () => true,
      () => { restored = true; }, v => { lastFog = v; }), /capture/);
    assert(restored && lastFog && cam.useBounds, 'failed captures restore camera and fog');

    let clock = 0, next;
    const paragraph = { textContent: '', classList: { add() {}, remove() {} } };
    const rootCanvas = canvas();
    const root = { clientWidth: W, clientHeight: H, setAttribute() {},
      querySelector: s => s === 'canvas' ? rootCanvas : paragraph, querySelectorAll: () => [], remove() {} };
    const doc = { activeElement: null, body: { append() {} }, createElement: name => name === 'div' ? root : canvas() };
    const window = { innerWidth: W, innerHeight: H, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
    const env = vm.createContext({ document: doc, window, performance: { now: () => clock },
      matchMedia: () => ({ matches: false }), Image: class {}, tx: pl => pl, resetKeys() {}, resetTouch() {},
      audio: () => null, requestAnimationFrame: cb => { next = cb; return 1; }, cancelAnimationFrame() {},
      clearTimeout, setTimeout, Math });
    vm.runInContext(flight, env);
    const overlay = env.flight(undefined, undefined, { shot: null, fx: .5, fy: .5, px: 4, kat: angle, cel: 'Test' });
    clock = 2600; next(clock);
    const done = overlay.land({ ...result, fx: .5, fy: .5, px: 4, cel: 'Test' });
    for (let elapsed = 750; elapsed <= 3000; elapsed += 50) {
      drawn.length = 0; clock = 2600 + elapsed; next(clock);
      const rect = drawn.find(args => args[0] === result.shot);
      assert(rect, 'destination terrain is drawn');
      const [, x, y, w, h] = rect;
      assert(x <= 1e-7 && y <= 1e-7 && x + w >= W - 1e-7 && y + h >= H - 1e-7,
        'no exposed picture edges after clouds part: ' + [W, H, d, elapsed, x, y, w, h]);
    }
    await done;
    overlay.close();
  }
}
console.log('Panorama capture, failure restoration and 752 landing frames passed (desktop/phone, eight directions).');
