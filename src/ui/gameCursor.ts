import type { InteractionKind } from '../controls';

// Small code-native comic cursors: readable ink edge, warm brass, precise hotspot.
const svg = (body: string, x = 4, y = 3) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g stroke="#1e1a24" stroke-width="2" stroke-linejoin="round">${body}</g></svg>`)}") ${x} ${y}`;
const arrow = '<path d="M4 3L6 25L12 19L17 29L22 26L17 17L26 16Z" fill="#e6bd66"/><path d="M7 8L9 19L12 15L19 15Z" fill="#fff0bf" stroke="none"/>';
const cursors = {
  normal: `${svg(arrow)}, default`,
  talk: `${svg('<path d="M4 4H27V21H15L8 28V21H4Z" fill="#f9e5b3"/><path d="M9 10H22M9 15H18" fill="none" stroke-linecap="round"/>')}, pointer`,
  enter: `${svg('<path d="M14 3H28V29H14Z" fill="#b8853e"/><path d="M18 7H25V25H18Z" fill="#35323c"/><path d="M3 16H20M13 9L20 16L13 23" fill="none" stroke="#fff0bf" stroke-width="4"/><path d="M3 16H20M13 9L20 16L13 23" fill="none"/>', 3, 16)}, pointer`,
  use: `${svg(arrow + '<circle cx="23" cy="23" r="7" fill="#a8d5ae"/><path d="M23 19V27M19 23H27"/>')}, pointer`,
};

export function mountGameCursor(canvas: HTMLCanvasElement) {
  if (!document.getElementById('game-cursor-css')) {
    const style = document.createElement('style'); style.id = 'game-cursor-css';
    style.textContent = `@media (hover:hover) and (pointer:fine){#game canvas{cursor:${cursors.normal}}}`;
    document.head.append(style);
  }
  if (!canvas.dataset.cursorMounted) {
    canvas.dataset.cursorMounted = '1';
    canvas.addEventListener('mouseleave', () => updateGameCursor(canvas, null));
  }
}

export function updateGameCursor(canvas: HTMLCanvasElement, kind: InteractionKind | null) {
  const state = kind ?? 'normal';
  if (canvas.dataset.cursor === state) return;
  canvas.dataset.cursor = state;
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) canvas.style.cursor = cursors[state];
}
