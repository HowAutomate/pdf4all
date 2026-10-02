import { describe, it, expect } from 'vitest';
import { fitToKb } from '@/lib/fitToKb';

// A fake JPEG encoder: size grows with pixel count and (steeply) with quality.
const fake = (bytesAtFullQ1: number) => async (scale: number, q: number) =>
  Math.round(bytesAtFullQ1 * scale * scale * (0.08 + 0.92 * q ** 3));

describe('fitToKb', () => {
  it('keeps full size and lowers quality when that is enough', async () => {
    const r = await fitToKb(fake(120_000), 50 * 1024);
    expect(r.ok).toBe(true);
    expect(r.scale).toBe(1);
    expect(r.bytes).toBeLessThanOrEqual(50 * 1024);
    expect(r.quality).toBeGreaterThan(0.3);
  });

  it('shrinks the image when quality alone cannot fit the budget', async () => {
    const r = await fitToKb(fake(2_000_000), 20 * 1024);
    expect(r.ok).toBe(true);
    expect(r.scale).toBeLessThan(1);
    expect(r.bytes).toBeLessThanOrEqual(20 * 1024);
    expect(r.quality).toBeGreaterThanOrEqual(0.3);
  });

  it('uses as much of the budget as it can (no needless quality loss)', async () => {
    const r = await fitToKb(fake(2_000_000), 100 * 1024);
    expect(r.bytes).toBeGreaterThan(80 * 1024);
  });

  it('grows a tiny image to meet a minimum size', async () => {
    const r = await fitToKb(fake(8_000), 50 * 1024, 20 * 1024);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeGreaterThanOrEqual(20 * 1024);
    expect(r.bytes).toBeLessThanOrEqual(50 * 1024);
    expect(r.scale).toBeGreaterThan(1);
  });

  it('reports failure for an impossible budget instead of looping', async () => {
    const r = await fitToKb(async () => 5000, 1000);
    expect(r.ok).toBe(false);
  });
});
