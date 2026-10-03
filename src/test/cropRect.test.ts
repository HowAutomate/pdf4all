import { describe, it, expect } from 'vitest';
import { initialRect, moveRect, resizeRect, toPixels } from '@/lib/cropRect';

const W = 1000, H = 600;
const inside = (r: { x: number; y: number; w: number; h: number }) =>
  r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= W + 1e-9 && r.y + r.h <= H + 1e-9;

describe('crop rectangle', () => {
  it('starts with the largest centred box of the chosen shape', () => {
    expect(initialRect(W, H, 1)).toEqual({ x: 200, y: 0, w: 600, h: 600 });
    expect(initialRect(W, H, null)).toEqual({ x: 0, y: 0, w: 1000, h: 600 });
    const r = initialRect(W, H, 16 / 9);
    expect(r.w / r.h).toBeCloseTo(16 / 9, 9);
    expect(inside(r)).toBe(true);
  });

  it('moves but never leaves the image', () => {
    const r = moveRect({ x: 100, y: 100, w: 200, h: 200 }, 5000, -5000, W, H);
    expect(r).toEqual({ x: 800, y: 0, w: 200, h: 200 });
  });

  it('drags a corner with the opposite corner fixed (free shape)', () => {
    const r = resizeRect({ x: 100, y: 100, w: 200, h: 200 }, 'se', 50, 20, null, W, H);
    expect(r).toEqual({ x: 100, y: 100, w: 250, h: 220 });
    const nw = resizeRect({ x: 100, y: 100, w: 200, h: 200 }, 'nw', -30, -40, null, W, H);
    expect(nw).toEqual({ x: 70, y: 60, w: 230, h: 240 });
  });

  it('keeps the shape locked and inside the image', () => {
    const start = { x: 400, y: 100, w: 300, h: 300 };
    for (const [handle, dx, dy] of [['se', 900, 50], ['nw', -900, -900], ['ne', 400, -20], ['sw', -20, 700]] as const) {
      const r = resizeRect(start, handle, dx, dy, 1, W, H);
      expect(r.w).toBeCloseTo(r.h, 9);
      expect(inside(r)).toBe(true);
    }
  });

  it('never shrinks below the minimum size', () => {
    const r = resizeRect({ x: 100, y: 100, w: 50, h: 50 }, 'se', -500, -500, null, W, H);
    expect(r.w).toBe(8);
    expect(r.h).toBe(8);
  });

  it('rounds to whole pixels inside the image', () => {
    expect(toPixels({ x: 10.4, y: -0.3, w: 999.9, h: 20.6 }, W, H)).toEqual({ x: 10, y: 0, w: 990, h: 21 });
  });
});
