// @vitest-environment node
import { describe, it, expect } from 'vitest';
import jpeg from 'jpeg-js';
import { padJpeg } from '@/lib/jpegPad';

function smallJpeg() {
  const w = 140, h = 60, data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const v = (i % w) > 30 && (i % w) < 110 && ((i / w) | 0) % 9 < 3 ? 20 : 250; data.set([v, v, v, 255], i * 4); }
  return new Uint8Array(jpeg.encode({ data, width: w, height: h }, 95).data);
}

describe('padJpeg', () => {
  it('reaches the target size exactly and keeps the image identical', () => {
    const src = smallJpeg();
    expect(src.length).toBeLessThan(10 * 1024);
    const out = padJpeg(src, 12 * 1024);
    expect(out.length).toBe(12 * 1024);
    expect([out[0], out[1], out[2], out[3]]).toEqual([0xff, 0xd8, 0xff, 0xfe]);
    const a = jpeg.decode(src, { useTArray: true }), b = jpeg.decode(out, { useTArray: true });
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    expect(Buffer.from(b.data).equals(Buffer.from(a.data))).toBe(true);
  });

  it('handles targets larger than one comment segment', () => {
    const out = padJpeg(smallJpeg(), 150 * 1024);
    expect(out.length).toBe(150 * 1024);
    expect(jpeg.decode(out, { useTArray: true }).width).toBe(140);
  });

  it('leaves files that are already big enough unchanged, and rejects non-JPEGs', () => {
    const src = smallJpeg();
    expect(padJpeg(src, 100)).toBe(src);
    expect(() => padJpeg(new Uint8Array([1, 2, 3, 4]), 999)).toThrow();
  });
});
