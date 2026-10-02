/**
 * Finds the JPEG settings that bring an image under a byte budget while
 * keeping it as sharp as possible — the core of "resize image to 20 KB".
 *
 * Strategy: at full size, binary-search the highest quality that fits. If
 * even the lowest acceptable quality is too big, shrink the dimensions and
 * search again. If the result is below a required minimum (some forms reject
 * files that are too small), grow the dimensions instead.
 *
 * `encode(scale, quality)` must return the encoded size in bytes for the
 * image scaled by `scale` (1 = target dimensions) at JPEG `quality` (0–1).
 */
export type Encoder = (scale: number, quality: number) => Promise<number>;

export interface FitResult {
  scale: number;
  quality: number;
  bytes: number;
  /** False when no setting could meet the budget (e.g. a 1 KB target). */
  ok: boolean;
}

const Q_MIN = 0.3;  // below this JPEG artefacts make faces/signatures illegible
const Q_MAX = 0.95;
const Q_FLOOR = 0.05; // last resort before shrinking further

async function bestQuality(encode: Encoder, scale: number, maxBytes: number, qLow: number) {
  if ((await encode(scale, qLow)) > maxBytes) return null;
  let lo = qLow, hi = Q_MAX;
  const top = await encode(scale, hi);
  if (top <= maxBytes) return { quality: hi, bytes: top };
  let best = { quality: lo, bytes: await encode(scale, lo) };
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const b = await encode(scale, mid);
    if (b <= maxBytes) { best = { quality: mid, bytes: b }; lo = mid; } else hi = mid;
  }
  return best;
}

export async function fitToKb(encode: Encoder, maxBytes: number, minBytes = 0, maxScale = 1): Promise<FitResult> {
  let scale = maxScale;

  // 1. Shrink until a decent quality fits.
  for (let round = 0; round < 12; round++) {
    const r = await bestQuality(encode, scale, maxBytes, Q_MIN);
    if (r) {
      // 2. Too small for the form's minimum? Grow (up to 2× the requested size).
      if (r.bytes < minBytes) return grow(encode, scale, maxBytes, minBytes, r);
      return { scale, quality: r.quality, bytes: r.bytes, ok: true };
    }
    const at = await encode(scale, Q_MIN);
    scale *= Math.max(0.5, Math.min(0.95, Math.sqrt(maxBytes / at) * 0.95));
    if (scale < 0.02) break;
  }
  // 3. Last resort: very low quality at a small size.
  const r = await bestQuality(encode, scale, maxBytes, Q_FLOOR);
  if (r) return { scale, quality: r.quality, bytes: r.bytes, ok: r.bytes >= minBytes };
  return { scale, quality: Q_FLOOR, bytes: await encode(scale, Q_FLOOR), ok: false };
}

async function grow(encode: Encoder, scale: number, maxBytes: number, minBytes: number, start: { quality: number; bytes: number }): Promise<FitResult> {
  let best: FitResult = { scale, quality: start.quality, bytes: start.bytes, ok: false };
  let s = scale;
  for (let round = 0; round < 8 && s < 2; round++) {
    s = Math.min(2, s * Math.max(1.05, Math.sqrt(minBytes / best.bytes) * 1.05));
    const r = await bestQuality(encode, s, maxBytes, Q_MIN);
    if (!r) break;
    best = { scale: s, quality: r.quality, bytes: r.bytes, ok: r.bytes >= minBytes };
    if (best.ok) return best;
  }
  return best;
}
