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
const DURATION = 2200;
const key = (offset: number, opacity: number, scale: number, target: Point = { x: 0.5, y: 0.5 }): Keyframe => ({
  offset, opacity,
  transform: `translate(${(0.5 - target.x) * scale * 100}%, ${(0.5 - target.y) * scale * 100}%) scale(${scale})`,
});

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

  const clouds = document.createElement('div');
  clouds.className = 'lm-atlas-clouds';
  element.append(clouds);

  const marker = new Image();
  marker.alt = '';
  marker.className = 'lm-atlas-marker';
  marker.src = new URL('portrety/bohater_01.webp', document.baseURI).href;
  poland.sheet.append(marker);

  return {
    ready,
    hide: () => { element.hidden = true; },
    close: () => {
      for (const animation of element.getAnimations({ subtree: true })) animation.cancel();
      element.remove();
    },
    play(lat: number, lon: number, reduced: boolean, portrait?: () => Promise<HTMLCanvasElement | null>) {
      // Calibrated to the painted sheet, not to the game camera's projection.
      marker.style.left = `${66 + (lon - 22.5684) * 5.05}%`;
      marker.style.top = `${65 - (lat - 51.2465) * 13.4}%`;
      void portrait?.().then((canvas) => {
        if (canvas && marker.isConnected) marker.src = canvas.toDataURL();
      }).catch(() => {});
      if (reduced) {
        poland.sheet.style.opacity = '1';
        marker.style.opacity = '1';
        return Promise.resolve();
      }

      const animate = (node: HTMLElement, frames: Keyframe[]) =>
        node.animate(frames, { duration: DURATION, fill: 'forwards', easing: 'linear' });
      const europeOnWorld = { x: 0.51, y: 0.29 };
      const polandOnEurope = { x: 0.55, y: 0.54 };
      animate(world.sheet, [key(0, 1, 1), key(.15, 1, 1.06), key(.34, 1, 1.62, europeOnWorld), key(.49, 1, 2.1, europeOnWorld), key(1, 1, 2.1, europeOnWorld)]);
      animate(europe.sheet, [key(0, 0, 1), key(.25, 0, 1), key(.46, 1, 1.08), key(.62, 1, 1.35, polandOnEurope), key(.81, 1, 1.9, polandOnEurope), key(1, 1, 1.9, polandOnEurope)]);
      animate(poland.sheet, [key(0, 0, 1), key(.62, 0, 1), key(.82, 1, 1), key(1, 1, 1)]);
      animate(clouds, [
        { offset: 0, opacity: 0, transform: 'translateX(-45%)' },
        { offset: .34, opacity: .9, transform: 'translateX(0%)' },
        { offset: .53, opacity: 0, transform: 'translateX(45%)' },
        { offset: .61, opacity: 0, transform: 'translateX(-45%)' },
        { offset: .73, opacity: .9, transform: 'translateX(0%)' },
        { offset: .9, opacity: 0, transform: 'translateX(45%)' },
      ]);
      return animate(marker, [
        { offset: 0, opacity: 0 }, { offset: .81, opacity: 0 },
        { offset: .95, opacity: 1 }, { offset: 1, opacity: 1 },
      ]).finished.then(() => {}, () => {});
    },
  };
}
