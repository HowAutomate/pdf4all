// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, PDFName, PDFRawStream, PDFNumber, StandardFonts } from 'pdf-lib';
import pako from 'pako';
import UPNG from '@pdf-lib/upng';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { recompressImages, unpredictPng, saveSmall, type Reencoder, type ImageSource } from '@/lib/pdfCompress/images';

const require = createRequire(import.meta.url);
beforeAll(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
});

function noisyRgba(w: number, h: number) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = (i * 7 + Math.random() * 60) & 255;
    px[i * 4 + 1] = (i * 3 + Math.random() * 60) & 255;
    px[i * 4 + 2] = (Math.random() * 255) | 0;
    px[i * 4 + 3] = 255;
  }
  return px;
}

async function pdfWithImage() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const png = UPNG.encode([noisyRgba(500, 400).buffer], 500, 400, 0);
  const img = await doc.embedPng(new Uint8Array(png));
  page.drawImage(img, { x: 20, y: 120, width: 300, height: 240 });
  page.drawText('Invoice total 1,180', { x: 20, y: 60, size: 14, font: await doc.embedFont(StandardFonts.Helvetica) });
  return doc.save();
}

// Pretends to be a JPEG encoder: returns a small blob and records what it saw.
const fakeEncoder = (bytes: number, seen: ImageSource[] = []): Reencoder => async (src, maxSide) => {
  seen.push(src);
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  return { bytes: new Uint8Array(bytes).fill(7), width: Math.round(src.width * s), height: Math.round(src.height * s) };
};

describe('unpredictPng', () => {
  it('reverses Sub, Up, Average and Paeth row filters', () => {
    const w = 3, colors = 1;
    const rows = [[10, 20, 30], [11, 22, 33], [5, 5, 5], [200, 100, 50], [1, 2, 3]];
    const filtered: number[] = [];
    rows.forEach((row, r) => {
      const type = r; // 0 None, 1 Sub, 2 Up, 3 Average, 4 Paeth
      filtered.push(type);
      row.forEach((x, i) => {
        const a = i ? row[i - 1] : 0, b = r ? rows[r - 1][i] : 0, c = r && i ? rows[r - 1][i - 1] : 0;
        let pred = 0;
        if (type === 1) pred = a; else if (type === 2) pred = b; else if (type === 3) pred = (a + b) >> 1;
        else if (type === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        filtered.push((x - pred) & 255);
      });
    });
    expect(Array.from(unpredictPng(new Uint8Array(filtered), w, colors))).toEqual(rows.flat());
  });
});

describe('recompressImages', () => {
  it('replaces images with smaller JPEGs, keeps text, and shrinks the file', async () => {
    const original = await pdfWithImage();
    const doc = await PDFDocument.load(original);
    const seen: ImageSource[] = [];
    const report = await recompressImages(doc, { quality: 0.6, maxSide: 250 }, fakeEncoder(3000, seen));
    expect(report).toMatchObject({ found: 1, recompressed: 1, skipped: 0 });
    expect(seen[0]).toMatchObject({ kind: 'raw', width: 500, height: 400, channels: 3 });
    const out = await saveSmall(doc);
    expect(out.length).toBeLessThan(original.length / 3);

    const reloaded = await PDFDocument.load(out);
    const xobjs = reloaded.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'));
    const img = [...(xobjs as any).entries()].map(([, v]: any) => reloaded.context.lookup(v)).find((s: any) => s instanceof PDFRawStream) as PDFRawStream;
    expect(img.dict.get(PDFName.of('Filter'))).toEqual(PDFName.of('DCTDecode'));
    expect((img.dict.get(PDFName.of('Width')) as PDFNumber).asNumber()).toBe(250);
    expect((img.dict.get(PDFName.of('Height')) as PDFNumber).asNumber()).toBe(200);

    const pdf = await pdfjs.getDocument({ data: out.slice(), verbosity: 0 }).promise;
    const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i: any) => i.str).join('');
    expect(text).toContain('Invoice total 1,180');
  });

  it('keeps the original image when re-encoding would not save at least 10%', async () => {
    const doc = await PDFDocument.load(await pdfWithImage());
    const report = await recompressImages(doc, { quality: 0.9, maxSide: 4000 }, fakeEncoder(10_000_000));
    expect(report).toMatchObject({ found: 1, recompressed: 0, skipped: 1 });
  });

  it('decodes Flate images stored with a PNG predictor', async () => {
    const w = 80, h = 80;
    const pixels = noisyRgba(w, h);
    const rgb = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) rgb.set(pixels.subarray(i * 4, i * 4 + 3), i * 3);
    // PNG "Up" filter on every row, then deflate — as many PDF producers write it.
    const rowLen = w * 3, filtered = new Uint8Array(h * (rowLen + 1));
    for (let r = 0; r < h; r++) {
      filtered[r * (rowLen + 1)] = 2;
      for (let i = 0; i < rowLen; i++) filtered[r * (rowLen + 1) + 1 + i] = (rgb[r * rowLen + i] - (r ? rgb[(r - 1) * rowLen + i] : 0)) & 255;
    }
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    const stream = doc.context.stream(pako.deflate(filtered), {
      Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceRGB', BitsPerComponent: 8,
      Filter: 'FlateDecode', DecodeParms: { Predictor: 15, Colors: 3, Columns: w },
    });
    const ref = doc.context.register(stream);
    page.node.setXObject(PDFName.of('Im1'), ref);
    const seen: ImageSource[] = [];
    await recompressImages(doc, { quality: 0.6, maxSide: 2000 }, fakeEncoder(100, seen));
    expect(seen).toHaveLength(1);
    expect(Array.from((seen[0] as { data: Uint8Array }).data)).toEqual(Array.from(rgb));
  });
});
