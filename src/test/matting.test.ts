import { describe, it, expect } from 'vitest';
import { modelSize, toTensor, matteToAlpha, refineAlpha, subjectBox } from '@/lib/matting';
import { layoutSheet, pickFace, headFromFace, cropForHead, adjustCrop, SPECS, mmToPx } from '@/lib/passport';

describe('matting helpers', () => {
  it('sizes the model input: shorter side 512, multiples of 32', () => {
    expect(modelSize(1280, 1600)).toEqual([512, 640]);
    expect(modelSize(4000, 3000)).toEqual([672, 512]);
    const [w, h] = modelSize(333, 777);
    expect(w % 32).toBe(0);
    expect(h % 32).toBe(0);
  });

  it('normalises RGB to [-1, 1] in channel-first order', () => {
    // Two pixels: (0, 255, 255) and (255, 0, 0) → planes R, G, B.
    const t = toTensor(new Uint8Array([0, 255, 255, 255, 255, 0, 0, 255]), 2, 1);
    expect(Array.from(t)).toEqual([-1, 1, 1, -1, 1, -1]);
  });

  it('upscales the matte smoothly and keeps solid regions solid', () => {
    const a = matteToAlpha(new Float32Array([0, 1, 0, 1]), 2, 2, 8, 8);
    expect(a[0]).toBe(0);
    expect(a[7]).toBe(255);
    expect(a[3]).toBeGreaterThan(0);
    expect(a[3]).toBeLessThan(255);
  });

  it('snaps near-0/near-1 values but keeps soft edges', () => {
    expect(Array.from(refineAlpha(new Uint8ClampedArray([5, 18, 126, 240, 250])))).toEqual([0, 0, 127, 255, 255]);
  });

  it('finds the subject box', () => {
    const alpha = new Uint8ClampedArray(10 * 10);
    for (let y = 2; y < 7; y++) for (let x = 3; x < 6; x++) alpha[y * 10 + x] = 255;
    expect(subjectBox(alpha, 10, 10)).toEqual({ x: 3, y: 2, w: 3, h: 5 });
    expect(subjectBox(new Uint8ClampedArray(4), 2, 2)).toBeNull();
  });
});

describe('passport helpers', () => {
  it('fits 8 passport photos on 4x6 inch paper and 30 on A4', () => {
    const w = mmToPx(35), h = mmToPx(45);
    expect([w, h]).toEqual([413, 531]);
    expect(layoutSheet(1800, 1200, w, h).cells).toHaveLength(8);
    expect(layoutSheet(2481, 3507, w, h).cells).toHaveLength(30);
  });

  it('picks the largest confident face', () => {
    const scores = new Float32Array([0.9, 0.1, 0.2, 0.8, 0.1, 0.95]);
    const boxes = new Float32Array([0, 0, 1, 1, 0.1, 0.1, 0.2, 0.2, 0.4, 0.3, 0.7, 0.8]);
    const f = pickFace(scores, boxes, 100, 100)!;
    expect([f.x1, f.y1, f.x2, f.y2].map(v => Math.round(v))).toEqual([40, 30, 70, 80]);
    expect(pickFace(new Float32Array([0.9, 0.1]), new Float32Array([0, 0, 1, 1]), 10, 10)).toBeNull();
  });

  it('takes the crown from hair above the face and frames to the spec', () => {
    const w = 100, h = 140, alpha = new Uint8ClampedArray(w * h);
    for (let y = 20; y < 140; y++) for (let x = 30; x < 70; x++) alpha[y * w + x] = 255; // head+body from y=20
    const head = headFromFace(alpha, w, h, { x1: 35, y1: 40, x2: 65, y2: 80 });
    expect(head.top).toBe(20);
    expect(head.cx).toBe(50);
    const spec = SPECS[0];
    const crop = cropForHead(head, spec);
    expect(crop.w / crop.h).toBeCloseTo(35 / 45, 6);
    expect(head.height / crop.h).toBeCloseTo(spec.headFraction, 6);
    const z = adjustCrop(crop, 2, 0, 0);
    expect(z.w).toBeCloseTo(crop.w / 2, 6);
    expect(z.x + z.w / 2).toBeCloseTo(crop.x + crop.w / 2, 6);
  });
});
