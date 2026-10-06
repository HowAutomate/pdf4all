import { describe, it, expect } from 'vitest';
import { contextWindow, dilate, maskRegions } from '@/lib/inpaintRegions';

const W = 200, H = 100;
function paint(boxes: [number, number, number, number][]) {
  const m = new Uint8Array(W * H);
  for (const [x, y, w, h] of boxes) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m[j * W + i] = 1;
  return m;
}
const count = (m: Uint8Array) => m.reduce((n, v) => n + v, 0);

describe('watermark eraser mask geometry', () => {
  it('grows a painted area by exactly r pixels (square)', () => {
    const d = dilate(paint([[50, 50, 1, 1]]), W, H, 3);
    expect(count(d)).toBe(49);
    expect(d[47 * W + 47]).toBe(1);
    expect(d[46 * W + 50]).toBe(0);
    expect(count(dilate(paint([[0, 0, 2, 2]]), W, H, 2))).toBe(16); // clipped at the corner
  });

  it('splits far-apart strokes into separate areas and merges near ones', () => {
    const r = maskRegions(paint([[10, 10, 20, 5], [34, 10, 20, 5], [150, 70, 10, 10]]), W, H);
    expect(r).toHaveLength(2);
    const [a, b] = [...r].sort((p, q) => p.x - q.x);
    expect(a.x).toBeLessThanOrEqual(10);
    expect(a.x + a.w).toBeGreaterThanOrEqual(54);
    expect(b.x).toBeLessThanOrEqual(150);
    expect(b.y + b.h).toBeGreaterThanOrEqual(80);
    expect(maskRegions(new Uint8Array(W * H), W, H)).toEqual([]);
  });

  it('gives the model surrounding context, clamped to the image', () => {
    const win = contextWindow({ x: 150, y: 70, w: 10, h: 10 }, W, H);
    expect(win).toEqual({ x: 86, y: 6, w: 114, h: 94 });
    const big = contextWindow({ x: 0, y: 0, w: W, h: H }, W, H);
    expect(big).toEqual({ x: 0, y: 0, w: W, h: H });
  });
});
