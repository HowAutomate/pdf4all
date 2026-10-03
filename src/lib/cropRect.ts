/** Crop rectangle in image pixels. */
export interface Rect { x: number; y: number; w: number; h: number }
export type Handle = 'nw' | 'ne' | 'sw' | 'se';

export const MIN_SIZE = 8;

/** Largest rectangle of the given aspect (w/h) centred in a W×H image; whole image if aspect is null. */
export function initialRect(W: number, H: number, aspect: number | null, coverage = 1): Rect {
  if (!aspect) {
    const w = W * coverage, h = H * coverage;
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }
  let w = W * coverage, h = w / aspect;
  if (h > H * coverage) { h = H * coverage; w = h * aspect; }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

/** Moves a rectangle, keeping it inside the image. */
export function moveRect(r: Rect, dx: number, dy: number, W: number, H: number): Rect {
  return { ...r, x: Math.min(Math.max(0, r.x + dx), W - r.w), y: Math.min(Math.max(0, r.y + dy), H - r.h) };
}

/**
 * Drags one corner while the opposite corner stays put. With an aspect
 * ratio, the larger of the two movements decides the size so the corner
 * follows the pointer naturally. The result never leaves the image.
 */
export function resizeRect(r: Rect, handle: Handle, dx: number, dy: number, aspect: number | null, W: number, H: number): Rect {
  const west = handle === 'nw' || handle === 'sw';
  const north = handle === 'nw' || handle === 'ne';
  // Fixed (anchor) corner and the room available towards the dragged side.
  const ax = west ? r.x + r.w : r.x;
  const ay = north ? r.y + r.h : r.y;
  const maxW = west ? ax : W - ax;
  const maxH = north ? ay : H - ay;
  let w = Math.min(maxW, Math.max(MIN_SIZE, r.w + (west ? -dx : dx)));
  let h = Math.min(maxH, Math.max(MIN_SIZE, r.h + (north ? -dy : dy)));
  if (aspect) {
    // Follow whichever axis moved further (relative to the shape), then fit.
    if (Math.abs(dx) / aspect >= Math.abs(dy)) h = w / aspect; else w = h * aspect;
    if (w > maxW) { w = maxW; h = w / aspect; }
    if (h > maxH) { h = maxH; w = h * aspect; }
    if (w < MIN_SIZE) { w = MIN_SIZE; h = w / aspect; }
    if (h < MIN_SIZE) { h = MIN_SIZE; w = h * aspect; }
  }
  return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
}

/** Rounds to whole pixels and keeps the result inside the image. */
export function toPixels(r: Rect, W: number, H: number): Rect {
  const x = Math.max(0, Math.min(W - 1, Math.round(r.x)));
  const y = Math.max(0, Math.min(H - 1, Math.round(r.y)));
  return { x, y, w: Math.max(1, Math.min(W - x, Math.round(r.w))), h: Math.max(1, Math.min(H - y, Math.round(r.h))) };
}
