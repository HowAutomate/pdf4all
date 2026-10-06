/**
 * Mask geometry for the watermark eraser (no browser APIs, so it is testable).
 *
 * The inpainting model works on a 512 × 512 view. Feeding it a whole 4000 px
 * photo would shrink the image eight times and the filled-in areas would come
 * back blurry, so each separate painted area is filled on its own, using a
 * window of surrounding picture as context.
 */

export interface Box { x: number; y: number; w: number; h: number }

/** Grows the painted area by r pixels so the fill also covers soft edges. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  // Two separable passes (horizontal, vertical) of a square max-filter.
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -Infinity;
    for (let x = 0; x < w; x++) if (mask[y * w + x]) last = x; else if (x - last <= r) tmp[y * w + x] = 1;
    last = Infinity;
    for (let x = w - 1; x >= 0; x--) {
      if (mask[y * w + x]) { last = x; tmp[y * w + x] = 1; } else if (last - x <= r) tmp[y * w + x] = 1;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let last = -Infinity;
    for (let y = 0; y < h; y++) if (tmp[y * w + x]) { last = y; out[y * w + x] = 1; } else if (y - last <= r) out[y * w + x] = 1;
    last = Infinity;
    for (let y = h - 1; y >= 0; y--) if (tmp[y * w + x]) last = y; else if (last - y <= r) out[y * w + x] = 1;
  }
  return out;
}

/**
 * Bounding boxes of the separate painted areas. Strokes closer than
 * `gap` cells (of `cell` px) are treated as one area.
 */
export function maskRegions(mask: Uint8Array, w: number, h: number, cell = 8, gap = 2): Box[] {
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1;
  const seen = new Uint8Array(gw * gh);
  const boxes: Box[] = [];
  for (let i = 0; i < gw * gh; i++) {
    if (!grid[i] || seen[i]) continue;
    let x0 = gw, y0 = gh, x1 = -1, y1 = -1;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      const cx = c % gw, cy = (c / gw) | 0;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const n = ny * gw + nx;
        if (grid[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    const x = x0 * cell, y = y0 * cell;
    boxes.push({ x, y, w: Math.min(w, (x1 + 1) * cell) - x, h: Math.min(h, (y1 + 1) * cell) - y });
  }
  return boxes;
}

/**
 * The part of the picture handed to the model for one painted area: the area
 * plus generous surroundings (the model needs context to invent a believable
 * fill), clamped to the image.
 */
export function contextWindow(b: Box, w: number, h: number): Box {
  const pad = Math.max(64, Math.round(Math.max(b.w, b.h) * 0.6));
  const x0 = Math.max(0, b.x - pad), y0 = Math.max(0, b.y - pad);
  const x1 = Math.min(w, b.x + b.w + pad), y1 = Math.min(h, b.y + b.h + pad);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
