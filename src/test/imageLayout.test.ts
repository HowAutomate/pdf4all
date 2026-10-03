import { describe, it, expect } from 'vitest';
import { placeImage } from '@/lib/imageLayout';

describe('placeImage', () => {
  it('fits a portrait photo on A4 portrait, centred, without distortion', () => {
    const p = placeImage(3000, 4000, 'a4', 'auto', 36);
    expect([p.pageW, p.pageH]).toEqual([595.28, 841.89]);
    expect(p.w / p.h).toBeCloseTo(3000 / 4000, 6);
    expect(p.w).toBeLessThanOrEqual(595.28 - 72 + 1e-9);
    expect(p.h).toBeLessThanOrEqual(841.89 - 72 + 1e-9);
    expect(p.x).toBeCloseTo((595.28 - p.w) / 2, 6);
    expect(p.y).toBeCloseTo((841.89 - p.h) / 2, 6);
  });

  it('turns the page for a landscape photo in auto mode', () => {
    const p = placeImage(4000, 3000, 'a4', 'auto', 0);
    expect(p.pageW).toBeGreaterThan(p.pageH);
    expect(p.h).toBeCloseTo(595.28, 6); // a 4:3 photo is limited by the page height
    expect(p.w / p.h).toBeCloseTo(4 / 3, 6);
  });

  it('respects a forced orientation', () => {
    expect(placeImage(4000, 3000, 'letter', 'portrait', 0).pageW).toBe(612);
    expect(placeImage(1000, 3000, 'letter', 'landscape', 0).pageW).toBe(792);
  });

  it('makes a page the image’s own size in "fit" mode', () => {
    const p = placeImage(960, 480, 'fit', 'auto', 10);
    expect([p.w, p.h]).toEqual([720, 360]); // 96 px per inch
    expect([p.pageW, p.pageH]).toEqual([740, 380]);
    expect([p.x, p.y]).toEqual([10, 10]);
  });
});
