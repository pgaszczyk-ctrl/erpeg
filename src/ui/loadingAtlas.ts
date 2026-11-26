import type { prepareAtlasRegion } from './loadingAtlasRegion';
import { punktNaMapieWczytywania } from '../content/mapaWczytywania';

type Point = { x: number; y: number };

// Simplified outline for choosing the painted Poland sheet. Coordinates near
// an unillustrated border can still use the worldwide regional map.
const POLAND = [
  [14.23, 53.93], [16.20, 54.32], [18.32, 54.85], [19.65, 54.46],
  [22.78, 54.35], [23.51, 53.95], [23.91, 52.72], [23.64, 52.06],
  [24.12, 50.89], [22.68, 49.57], [22.84, 49.00], [21.39, 49.45],
  [19.80, 49.19], [18.86, 49.52], [18.03, 50.04], [16.90, 50.44],
  [16.06, 50.66], [15.07, 50.99], [14.82, 51.40], [14.61, 52.25],
  [14.13, 52.82], [14.43, 53.38],
];

export function hasPaintedCountry(lat: number, lon: number) {
  let inside = false;
  for (let i = 0, j = POLAND.length - 1; i < POLAND.length; j = i++) {
    const [a, b] = POLAND[i], [c, d] = POLAND[j];
    if ((b > lat) !== (d > lat) && lon < a + (c - a) * (lat - b) / (d - b)) inside = !inside;
  }
  return inside;
}

const art = (name: string) => new URL(`loading36/atlas/${name}.webp`, document.baseURI).href;
const DURATION = 6600;
type Portrait = () => Promise<HTMLCanvasElement | null>;
type Region = ReturnType<typeof prepareAtlasRegion>;

const animate = (node: HTMLElement, frames: Keyframe[]) =>
  node.animate(frames, { duration: DURATION, fill: 'forwards', easing: 'linear' });
const done = (motion: Animation) => motion.finished.then(() => {}, () => {});
const cloudSweep = (start: number, middle: number, end: number): Keyframe[] => [
  { offset: start, opacity: 0, transform: 'translateX(-45%)' },
  { offset: middle, opacity: .96, transform: 'translateX(0%)' },
  { offset: end, opacity: 0, transform: 'translateX(45%)' },
];
const key = (offset: number, opacity: number, scale: number, target: Point = { x: 0.5, y: 0.5 }): Keyframe => {
  // Pan only inside the extra area revealed by scaling; even an edge-of-world
  // destination must leave all four viewport corners covered.
  const room = (scale - 1) / 2;
  const shift = (value: number) => Math.max(-room, Math.min(room, (.5 - value) * scale)) * 100;
  return { offset, opacity, transform: `translate(${shift(target.x)}%, ${shift(target.y)}%) scale(${scale})` };
};

export function prepareLoadingAtlas(host: HTMLElement) {
  const element = document.createElement('div');
  element.className = 'lm-atlas';
  element.setAttribute('aria-hidden', 'true');
  host.querySelector('.lm-plate')!.after(element);

  const sheets = ['world', 'europe', 'poland'].map((name) => {
    const img = new Image();
    img.alt = '';
    img.src = art(name);
    const sheet = document.createElement('div');
    sheet.className = 'lm-atlas-sheet';
    sheet.dataset.sheet = name;
    sheet.append(img);
    element.append(sheet);
    return { sheet, ready: img.decode().then(() => true, () => false) };
  });
  const [world, europe, poland] = sheets;
  void world.ready.then((ready) => {
    if (ready) element.classList.add('on');
  });
  const ready = Promise.all(sheets.map((layer) => layer.ready)).then((layers) => layers.every(Boolean));
  let terrainReady = false;
  let pacing = 0;
  function pace(clock: Animation) {
    let lastRate = 1;
    const tracks = element.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().duration === DURATION);
    const adjust = () => {
      const progress = Number(clock.currentTime ?? 0) / DURATION;
      const rate = terrainReady ? 1 : Math.max(.001, Math.min(1, (1 - progress) / .32));
      if (Math.abs(rate - lastRate) > .001) {
        for (const track of tracks) track.updatePlaybackRate(rate);
        lastRate = rate;
      }
      if (!terrainReady && progress < 1) pacing = requestAnimationFrame(adjust);
    };
    adjust();
    return done(clock);
  }

  let closeRegion: (() => void) | undefined;

  const clouds = document.createElement('div');
  clouds.className = 'lm-atlas-clouds';
  element.append(clouds);

  const marker = new Image();
  marker.alt = '';
  marker.className = 'lm-atlas-marker';
  marker.src = new URL('portrety/bohater_01.webp', document.baseURI).href;
  poland.sheet.append(marker);

  function setPortrait(portrait?: Portrait) {
    void portrait?.().then((canvas) => {
      if (canvas && marker.isConnected) marker.src = canvas.toDataURL();
    }).catch(() => {});
  }

  return {
    ready,
    worldReady: world.ready,
    terrainReady: () => { terrainReady = true; },
    hide: () => { element.hidden = true; },
    close: () => {
      cancelAnimationFrame(pacing);
      closeRegion?.();
      for (const animation of element.getAnimations({ subtree: true })) animation.cancel();
      element.remove();
    },
    play(lat: number, lon: number, reduced: boolean, portrait?: Portrait) {
      // Calibrated to the painted sheet, not to the game camera's projection.
      marker.style.left = `${66 + (lon - 22.5684) * 5.05}%`;
      marker.style.top = `${65 - (lat - 51.2465) * 13.4}%`;
      setPortrait(portrait);
      if (reduced) {
        poland.sheet.style.opacity = '1';
        marker.style.opacity = '1';
        return Promise.resolve();
      }

      const europeOnWorld = { x: 0.51, y: 0.29 };
      const polandOnEurope = { x: 0.55, y: 0.54 };
      animate(world.sheet, [key(0, 1, 1), key(.15, 1, 1.06), key(.34, 1, 1.32, europeOnWorld), key(.46, 1, 1.52, europeOnWorld), key(.49, 0, 1.55, europeOnWorld), key(1, 0, 1.55, europeOnWorld)]);
      animate(europe.sheet, [key(0, 0, 1), key(.25, 0, 1), key(.46, 1, 1.08), key(.62, 1, 1.35, polandOnEurope), key(.82, 1, 1.52, polandOnEurope), key(.84, 0, 1.52, polandOnEurope), key(1, 0, 1.52, polandOnEurope)]);
      animate(poland.sheet, [key(0, 0, 1), key(.62, 0, 1), key(.82, 1, 1.025), key(1, 1, 1.07)]);
      animate(clouds, [...cloudSweep(0, .34, .53), ...cloudSweep(.61, .73, .9)]);
      return pace(animate(marker, [
        { offset: 0, opacity: 0 }, { offset: .81, opacity: 0 },
        { offset: .95, opacity: 1 }, { offset: 1, opacity: 1 },
      ]));
    },
    playRegion(region: Region, lat: number, lon: number, reduced: boolean, portrait?: Portrait) {
      const canvas = document.createElement('canvas');
      canvas.className = 'lm-atlas-region';
      element.prepend(canvas);
      element.insertBefore(marker, clouds);
      setPortrait(portrait);
      const render = (progress: number) => region.render(canvas, marker, progress);
      let raf = 0;
      let progress = reduced ? 1 : 0;
      const observer = new ResizeObserver(() => render(progress));
      observer.observe(canvas);
      void region.artReady.then(() => {
        if (canvas.isConnected && (reduced || progress === 1)) render(progress);
      });
      closeRegion = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
      };

      if (reduced) {
        world.sheet.style.opacity = '0';
        marker.style.opacity = '1';
        render(1);
        return Promise.resolve();
      }
      const target = punktNaMapieWczytywania(lat, lon);
      animate(world.sheet, [key(0, 1, 1), key(.11, 1, 1.04), key(.35, 1, 1.65, target), key(.54, 0, 2.1, target), key(1, 0, 2.1, target)]);
      animate(clouds, cloudSweep(.16, .42, .68));
      const motion = animate(marker, [
        { offset: 0, opacity: 0 }, { offset: .72, opacity: 0 },
        { offset: .93, opacity: 1 }, { offset: 1, opacity: 1 },
      ]);
      const tick = () => {
        const elapsed = Number(motion.currentTime ?? 0) / DURATION;
        progress = Math.min(1, Math.max(0, (elapsed - .28) / .72));
        render(progress);
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return pace(motion);
    },
  };
}
