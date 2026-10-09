import './style.css';
import Phaser from 'phaser';
import { CityMap, PX_PER_M } from '../map/CityMap';
import { MapRenderer } from '../map/MapRenderer';
import { przygotujRysunkiUpraw } from '../map/Podloze09';
import { worldMap } from '../map/world';
import { Pociagi } from '../map/Pociagi';
import { torStacji } from '../map/perony';
import { OSTROSC } from '../screen';
import { SKALA_POSTACI } from '../skala';
import { architekturaTest2Aktywna } from './mode';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const query = new URLSearchParams(location.search);
const locations = {
  station: { lat: 51.2317, lon: 22.5682, mapa: 'lublin' },
  homes: { lat: 51.2434, lon: 22.5344, mapa: 'lublin' },
  krakow: { lat: 50.0637, lon: 19.9348, mapa: 'world' },
};
const initial = locations.station;
const validNumber = (s: string | null, fallback: number, limit: number) => s !== null && s.trim() !== '' && Number.isFinite(+s) && Math.abs(+s) <= limit ? +s : fallback;
const lat = validNumber(query.get('lat'), initial.lat, 85);
const lon = validNumber(query.get('lon'), initial.lon, 180);
const mapa = query.get('mapa') === 'world' ? 'world' : 'lublin';
let zoom = Math.min(5, Math.max(1, validNumber(query.get('zoom'), 2, 10)));
const keys = new Set<string>();
let stick = { x: 0, y: 0 };
let drag: { id: number; x: number; y: number } | null = null;
let scene: LabScene | undefined;
const status = (message: string | null) => { $('lab-status').hidden = message === null; if (message !== null) $('lab-status').textContent = message; };
const navigate = (point: { lat: number; lon: number; mapa: string }, arch = query.get('arch') ?? '1') => {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries({ ...point, arch, zoom })) url.searchParams.set(key, String(value));
  location.href = url.href;
};
const refreshLinks = () => {
  const p = scene?.city && scene.player ? scene.city.toLatLon(scene.player.x, scene.player.y) : { lat, lon };
  for (const [id, arch] of [['new-look', '1'], ['old-look', '0']]) {
    const a = $<HTMLAnchorElement>(id), url = new URL(location.href);
    for (const [key, value] of Object.entries({ ...p, mapa, arch, zoom })) url.searchParams.set(key, String(value));
    a.href = url.href;
    a.classList.toggle('active', architekturaTest2Aktywna() === (arch === '1'));
  }
};
refreshLinks();
$('lat').setAttribute('value', String(lat)); $('lon').setAttribute('value', String(lon));
$('panel-toggle').onclick = () => {
  const open = $('lab-panel').hidden;
  $('lab-panel').hidden = !open;
  $('panel-toggle').setAttribute('aria-expanded', String(open));
};
document.querySelectorAll<HTMLButtonElement>('[data-location]').forEach(b => { b.onclick = () => navigate(locations[b.dataset.location as keyof typeof locations]); });
$('coordinates').onsubmit = e => {
  e.preventDefault();
  navigate({ lat: Number($<HTMLInputElement>('lat').value), lon: Number($<HTMLInputElement>('lon').value), mapa: 'world' });
};
for (const [id, d] of [['zoom-out', -1], ['zoom-in', 1]] as const) $(''+id).onclick = () => { zoom = Math.max(1, Math.min(5, zoom + d)); scene?.fit(); refreshLinks(); };
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement)?.matches('input')) return;
  if (/^(Arrow|Key[WASD])/.test(e.code)) { keys.add(e.code); e.preventDefault(); }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); stick = { x: 0, y: 0 }; });

class LabScene extends Phaser.Scene {
  city?: CityMap;
  mapView?: MapRenderer;
  player?: Phaser.GameObjects.Sprite;
  ready = false;
  frames: number[] = [];
  distanceM = 0;
  private lastFrame = 0;
  private lastEnsure = 0;
  private lastUi = 0;
  private busy = false;
  private loading = true;
  private direction = 'down';
  private trains?: Pociagi;
  private shownStations = new Set<string>();
  constructor() { super('test2'); }
  preload() { this.load.spritesheet('lab-hero', 'postacie/lista25_01.png', { frameWidth: 64, frameHeight: 64 }); }
  create() {
    scene = this;
    for (const [i, dir] of ['down', 'up', 'side'].entries()) this.anims.create({ key: `lab-${dir}`, frames: [{ key: 'lab-hero', frame: i * 3 + 1 }, { key: 'lab-hero', frame: i * 3 + 2 }], frameRate: 7, repeat: -1 });
    this.fit();
    this.scale.on('resize', () => this.fit());
    const canvas = this.game.canvas;
    canvas.addEventListener('pointerdown', e => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
      $('stick').hidden = false; $('stick').style.left = `${e.clientX}px`; $('stick').style.top = `${e.clientY}px`;
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const x = e.clientX - drag.x, y = e.clientY - drag.y, length = Math.hypot(x, y);
      const k = length > 35 ? 35 / length : 1;
      stick = { x: x * k / 35, y: y * k / 35 };
      $('stick').querySelector('i')!.style.transform = `translate(${x * k}px,${y * k}px)`;
    });
    const endDrag = () => { drag = null; stick = { x: 0, y: 0 }; $('stick').hidden = true; };
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    void this.loadMap();
  }
  fit() {
    // Keep the visible area small enough for the existing six-chunk phone budget.
    const minZoom = Math.max(1, Math.ceil(this.scale.height / OSTROSC / 490), Math.ceil(this.scale.width / OSTROSC / 980));
    zoom = Math.max(minZoom, zoom);
    this.cameras.main.setZoom(zoom * OSTROSC);
  }
  private async loadMap() {
    try {
      const city = mapa === 'world' ? worldMap(lat, lon) : await CityMap.load('map/lublin.json');
      const start = city.fromLatLon(lat, lon);
      const r = this.radius();
      await Promise.all([city.ensure(start.x, start.y, r), przygotujRysunkiUpraw()]);
      this.city = city;
      const p = city.freeNear(start.x, start.y);
      this.player = this.add.sprite(p.x, p.y, 'lab-hero', 0).setScale(SKALA_POSTACI === 2 / 3 ? 0.25 : 0.36 * SKALA_POSTACI).setOrigin(0.5, 56 / 64).setDepth(p.y);
      this.mapView = new MapRenderer(this, city);
      this.trains = new Pociagi(this, this.mapView);
      this.cameras.main.startFollow(this.player, true, 1, 1);
      this.cameras.main.centerOn(p.x, p.y);
      this.loading = false;
      Object.assign(window, { __test2: { scene: this, city, renderer: this.mapView, player: this.player, metrics: () => this.metrics(), ready: () => this.ready } });
    } catch (error) { status(`Nie udało się wczytać mapy: ${error instanceof Error ? error.message : error}. Odśwież stronę, aby spróbować ponownie.`); }
  }
  private radius() { return Math.max(400, Math.hypot(this.scale.width, this.scale.height) / (zoom * OSTROSC) / 2 + 150); }
  metrics() {
    const frames = [...this.frames].sort((a, b) => a - b);
    const duration = this.frames.reduce((a, b) => a + b, 0);
    return {
      variant: architekturaTest2Aktywna() ? 'new' : 'current', ready: this.ready,
      fps: duration ? 1000 * this.frames.length / duration : 0,
      frameP95: frames[Math.floor(frames.length * 0.95)] ?? 0,
      renderer: this.mapView?.diagnostics(),
      loaded: this.city ? { buildings: this.city.buildings.length, lines: this.city.lines.length, areas: this.city.areas.length } : null,
      distanceM: this.distanceM, textures: this.game.textures.getTextureKeys().length,
    };
  }
  update(now: number, delta: number) {
    if (this.loading || !this.city || !this.player || !this.mapView) return;
    const frame = performance.now();
    if (this.lastFrame && this.ready) { this.frames.push(frame - this.lastFrame); if (this.frames.length > 300) this.frames.shift(); }
    this.lastFrame = frame;
    const dt = Math.min(delta / 1000, 0.05);
    let dx = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA')) + stick.x;
    let dy = Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW')) + stick.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    const p = this.player, oldX = p.x, oldY = p.y;
    const speed = 90 * dt;
    if (this.city.isFree(p.x + dx * speed, p.y, 2, 2)) p.x += dx * speed;
    if (this.city.isFree(p.x, p.y + dy * speed, 2, 2)) p.y += dy * speed;
    this.distanceM += Math.hypot(p.x - oldX, p.y - oldY) / PX_PER_M;
    if (length > 0.1) {
      this.direction = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
      p.setFlipX(this.direction === 'side' && dx < 0); p.play(`lab-${this.direction}`, true);
    } else { p.stop(); p.setFrame(({ down: 0, up: 3, side: 6 })[this.direction as 'down' | 'up' | 'side']); }
    p.setDepth(p.y);
    if (now - this.lastEnsure > 350 && !this.busy) {
      this.lastEnsure = now; this.busy = true;
      void this.city.ensure(p.x, p.y, this.radius()).catch(() => status('Trwa ponawianie pobierania mapy…')).finally(() => { this.busy = false; });
    }
    this.mapView.update(this.cameras.main);
    this.mapView.updateTrees(now, dt, this.cameras.main, p.x, p.y);
    for (const station of this.city.places) {
      if (station.kind !== 'station' || this.shownStations.has(station.id) || Math.hypot(station.door.x - p.x, station.door.y - p.y) > this.radius()) continue;
      const rail = torStacji(this.city, station);
      if (rail !== undefined) { this.shownStations.add(station.id); if (rail) this.trains?.postaw(station, rail); }
    }
    try {
      if (!this.ready && this.mapView.firstViewReady(this.cameras.main)) { this.ready = true; status(null); }
    } catch (error) { status(error instanceof Error ? error.message : String(error)); }
    if (now - this.lastUi > 1000) {
      this.lastUi = now; refreshLinks();
      const m = this.metrics(), r = m.renderer;
      const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
      const mib = r ? (r.chunkRgbaBytes + r.buildingRgbaBytes) / 1048576 : 0;
      $('metrics').innerHTML = `<div><strong>${m.fps.toFixed(0)} FPS</strong><small>Ostatnie klatki spaceru</small></div><div><strong>${m.frameP95.toFixed(0)} ms</strong><small>Czas klatki · 95 percentyl</small></div><div><strong>${median(r?.computeMs ?? []).toFixed(0)} ms</strong><small>Rysowanie fragmentu · mediana</small></div><div><strong>${median(r?.readyMs ?? [])} ms</strong><small>Fragment · z oczekiwaniem w kolejce</small></div><div><strong>${mib.toFixed(1)} MiB</strong><small>Piksele podłoża i wysokich budynków</small></div><div><strong>${r?.allocatedChunks ?? 0} / ${r?.maxChunks ?? 0}</strong><small>Obrazy fragmentów w pamięci</small></div><div><strong>${m.loaded?.buildings ?? 0}</strong><small>Wczytane obrysy budynków</small></div><div><strong>${(m.distanceM).toFixed(0)} m</strong><small>Przebyta droga</small></div>`;
    }
  }
}

const container = $('lab-game');
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'lab-game', backgroundColor: '#203722', pixelArt: true,
  scale: { mode: Phaser.Scale.NONE, width: container.clientWidth * OSTROSC, height: container.clientHeight * OSTROSC, zoom: 1 / OSTROSC },
  input: { touch: false, keyboard: false }, audio: { noAudio: true }, scene: [LabScene],
});
window.addEventListener('resize', () => game.scale.resize(container.clientWidth * OSTROSC, container.clientHeight * OSTROSC));
Object.assign(window, { __game: game });
