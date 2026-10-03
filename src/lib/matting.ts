/**
 * Pre/post-processing for MODNet portrait matting (Apache-2.0, via
 * Xenova/modnet). Pure functions so they run in tests as well as the browser.
 *
 * The model takes a [1, 3, H, W] float tensor — the image resized so its
 * shorter side is 512 px, both sides multiples of 32, values scaled to
 * [-1, 1] — and returns a [1, 1, H, W] matte: 0 = background, 1 = person.
 */

export const REF_SIZE = 512;

/** Model input size for an image of w × h. */
export function modelSize(w: number, h: number): [number, number] {
  const scale = REF_SIZE / Math.min(w, h);
  const fit = (v: number) => Math.max(32, Math.round((v * scale) / 32) * 32);
  return [fit(w), fit(h)];
}

/** RGBA pixels (already resized to the model size) → normalised CHW tensor data. */
export function toTensor(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Float32Array {
  const n = w * h;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    out[i] = rgba[i * 4] / 127.5 - 1;
    out[n + i] = rgba[i * 4 + 1] / 127.5 - 1;
    out[2 * n + i] = rgba[i * 4 + 2] / 127.5 - 1;
  }
  return out;
}

/** Bilinear upscale of the matte to the original size, as 0–255 alpha. */
export function matteToAlpha(matte: Float32Array, mw: number, mh: number, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  const sx = mw / w, sy = mh / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(mh - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(mh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(mw - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(mw - 1, x0 + 1), tx = fx - x0;
      const a = matte[y0 * mw + x0] * (1 - tx) + matte[y0 * mw + x1] * tx;
      const b = matte[y1 * mw + x0] * (1 - tx) + matte[y1 * mw + x1] * tx;
      out[y * w + x] = Math.round((a * (1 - ty) + b * ty) * 255);
    }
  }
  return out;
}

/**
 * Cleans the matte: values near 0/1 snap to fully transparent/opaque so the
 * background doesn't leave a faint haze and the person has no see-through
 * patches, while the soft edge (hair) in between is kept.
 */
export function refineAlpha(alpha: Uint8ClampedArray, low = 18, high = 235): Uint8ClampedArray {
  const out = new Uint8ClampedArray(alpha.length);
  const span = high - low;
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    out[i] = a <= low ? 0 : a >= high ? 255 : Math.round(((a - low) / span) * 255);
  }
  return out;
}

/** Bounding box of the subject (alpha above threshold), or null if empty. */
export function subjectBox(alpha: Uint8ClampedArray, w: number, h: number, threshold = 128) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] >= threshold) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
