import { cleanHumanSheet } from '../spriteCleanup';

const sheets = new Map<string, Promise<string>>();

/** Use the same pupil/fragment preparation in the picker as in the world. */
export function heroPreviewUrl(file: string): Promise<string> {
  const url = `postacie/${file}.png`;
  if (!sheets.has(file)) sheets.set(file, new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height);
      cleanHumanSheet(pixels, file); ctx.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject; image.src = url;
  }).catch(() => url));
  return sheets.get(file)!;
}

export function heroPreviewBackground(element: HTMLElement, file: string) {
  void heroPreviewUrl(file).then(url => { if (element.isConnected) element.style.backgroundImage = `url(${url})`; });
}
