/** Page sizes in PDF points (1/72 inch). */
export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
} as const;

export type PageSize = keyof typeof PAGE_SIZES | 'fit';
export type Orientation = 'auto' | 'portrait' | 'landscape';

export interface Placement {
  pageW: number; pageH: number;
  /** Image box on the page, PDF coordinates (origin bottom-left). */
  x: number; y: number; w: number; h: number;
}

/**
 * Where an image goes on its page: scaled to fit inside the margins without
 * distortion and centred. "fit" makes the page the image's own shape
 * (at 96 px per inch, the usual screen resolution) plus margins.
 * "auto" orientation turns the page to match the image.
 */
export function placeImage(imgW: number, imgH: number, size: PageSize, orientation: Orientation, margin: number): Placement {
  if (size === 'fit') {
    const w = (imgW * 72) / 96, h = (imgH * 72) / 96;
    return { pageW: w + 2 * margin, pageH: h + 2 * margin, x: margin, y: margin, w, h };
  }
  let [pw, ph] = PAGE_SIZES[size] as readonly [number, number];
  const landscape = orientation === 'landscape' || (orientation === 'auto' && imgW > imgH);
  if (landscape) [pw, ph] = [ph, pw];
  const boxW = Math.max(1, pw - 2 * margin), boxH = Math.max(1, ph - 2 * margin);
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale, h = imgH * scale;
  return { pageW: pw, pageH: ph, x: (pw - w) / 2, y: (ph - h) / 2, w, h };
}

