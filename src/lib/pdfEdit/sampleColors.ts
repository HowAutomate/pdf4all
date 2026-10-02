import type { RGB } from './applyEdits';

export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Reads the rendered page around a line of text to find:
 * - background: the most common colour just outside the text box, so the
 *   cover patch blends into tinted table cells and coloured headers too;
 * - text: the pixel inside the box that differs most from the background,
 *   i.e. the ink colour of the glyphs.
 * `rect` is in canvas pixels. Falls back to white/black when unsure.
 */
export function sampleColors(img: PixelData, rect: { x: number; y: number; w: number; h: number }): { background: RGB; text: RGB } {
  const px = (x: number, y: number): [number, number, number] | null => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
    const i = (Math.floor(y) * img.width + Math.floor(x)) * 4;
    // Treat transparent pixels (unpainted page) as white paper.
    if (img.data[i + 3] < 8) return [255, 255, 255];
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };

  const x0 = Math.floor(rect.x) - 2, y0 = Math.floor(rect.y) - 2;
  const x1 = Math.ceil(rect.x + rect.w) + 2, y1 = Math.ceil(rect.y + rect.h) + 2;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const add = (p: [number, number, number] | null) => {
    if (!p) return;
    const key = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++; bucket.r += p[0]; bucket.g += p[1]; bucket.b += p[2];
    buckets.set(key, bucket);
  };
  for (let x = x0; x <= x1; x++) { add(px(x, y0)); add(px(x, y1)); }
  for (let y = y0; y <= y1; y++) { add(px(x0, y)); add(px(x1, y)); }

  let bg: [number, number, number] = [255, 255, 255];
  let best = 0;
  for (const b of buckets.values()) {
    if (b.n > best) { best = b.n; bg = [b.r / b.n, b.g / b.n, b.b / b.n]; }
  }

  let ink: [number, number, number] = [0, 0, 0];
  let maxDist = 0;
  for (let y = Math.max(0, Math.floor(rect.y)); y < Math.min(img.height, Math.ceil(rect.y + rect.h)); y++) {
    for (let x = Math.max(0, Math.floor(rect.x)); x < Math.min(img.width, Math.ceil(rect.x + rect.w)); x++) {
      const p = px(x, y)!;
      const d = Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]);
      if (d > maxDist) { maxDist = d; ink = p; }
    }
  }
  // Barely-visible "ink" means we didn't actually hit a glyph — assume black.
  if (maxDist < 60) ink = [0, 0, 0];

  const to01 = (c: number[]): RGB => [c[0] / 255, c[1] / 255, c[2] / 255];
  return { background: to01(bg), text: to01(ink) };
}

export const rgbToCss = ([r, g, b]: RGB) => `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [0, 0, 0];
}

/**
 * Grows a text box vertically to cover the glyphs actually painted there.
 * Font metrics often understate descenders (g, j, p, y), which then peek out
 * below a cover patch. Starting at the box edge, rows are added while they
 * contain ink, stopping at the first clean row so neighbouring lines are
 * never swallowed. All values are canvas pixels.
 */
export function measureInkBand(
  img: PixelData,
  rect: { x: number; y: number; w: number; h: number },
  bg: RGB,
  maxGrow: number,
): { top: number; bottom: number } {
  const bg255 = bg.map(c => c * 255);
  const x0 = Math.max(0, Math.floor(rect.x)), x1 = Math.min(img.width - 1, Math.ceil(rect.x + rect.w));
  const rowHasInk = (y: number) => {
    if (y < 0 || y >= img.height) return false;
    for (let x = x0; x <= x1; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] < 8) continue;
      if (Math.hypot(img.data[i] - bg255[0], img.data[i + 1] - bg255[1], img.data[i + 2] - bg255[2]) > 80) return true;
    }
    return false;
  };
  let top = Math.floor(rect.y), bottom = Math.ceil(rect.y + rect.h);
  for (let k = 0; k < maxGrow && rowHasInk(top - 1); k++) top--;
  for (let k = 0; k < maxGrow && rowHasInk(bottom); k++) bottom++;
  return { top, bottom };
}
