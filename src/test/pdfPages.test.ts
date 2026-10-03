// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { organize, addPageNumbers, addWatermark, formatNumber } from '@/lib/pdfPages';

const require = createRequire(import.meta.url);
beforeAll(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
});

async function makePdf(rotations: number[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  rotations.forEach((r, i) => {
    const page = doc.addPage([400, 600]);
    page.setRotation(degrees(r));
    page.drawText(`Body ${i + 1}`, { x: 50, y: 300, size: 12, font });
  });
  return doc.save();
}

/** Text items with their position in the page as displayed (y down) and whether upright. */
async function shown(bytes: Uint8Array, pageNo: number) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const page = await pdf.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const items = (await page.getTextContent()).items as { str: string; transform: number[] }[];
  return {
    vp,
    items: items.filter(i => i.str.trim()).map(i => {
      const m = pdfjs.Util.transform(vp.transform, i.transform);
      return { str: i.str, x: m[4], y: m[5], upright: m[0] > 0 && Math.abs(m[1]) < 1e-6 };
    }),
  };
}

describe('organize', () => {
  it('reorders, deletes and rotates pages', async () => {
    const out = await organize(await makePdf([0, 0, 0]), [{ src: 2, rotate: 90 }, { src: 0, rotate: 0 }]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect((await shown(out, 1)).items[0].str).toBe('Body 3');
    expect((await shown(out, 2)).items[0].str).toBe('Body 1');
  });

  it('adds to an existing rotation and wraps at 360', async () => {
    const out = await organize(await makePdf([270]), [{ src: 0, rotate: 180 }]);
    expect((await PDFDocument.load(out)).getPage(0).getRotation().angle).toBe(90);
  });
});

describe('page numbers', () => {
  it('formats numbers', () => {
    expect(formatNumber('page-n-of-total', 3, 9)).toBe('Page 3 of 9');
    expect(formatNumber('n-slash-total', 3, 9)).toBe('3 / 9');
  });

  for (const rot of [0, 90, 180, 270]) {
    it(`puts the number bottom-right and upright on a page rotated ${rot}°`, async () => {
      const out = await addPageNumbers(await makePdf([rot]), { position: 'bottom-right', format: 'n', start: 7, skipFirst: false, fontSize: 12, margin: 30 });
      const { vp, items } = await shown(out, 1);
      const num = items.find(i => i.str === '7')!;
      expect(num.upright).toBe(true);
      expect(num.x).toBeGreaterThan(vp.width - 60);
      expect(num.y).toBeGreaterThan(vp.height - 40); // baseline near the bottom edge
    });
  }

  it('can skip the cover page and count totals correctly', async () => {
    const out = await addPageNumbers(await makePdf([0, 0, 0]), { position: 'bottom-center', format: 'page-n-of-total', start: 1, skipFirst: true, fontSize: 10, margin: 20 });
    expect((await shown(out, 1)).items.map(i => i.str)).toEqual(['Body 1']);
    expect((await shown(out, 2)).items.map(i => i.str)).toContain('Page 1 of 2');
    expect((await shown(out, 3)).items.map(i => i.str)).toContain('Page 2 of 2');
  });
});

describe('watermark', () => {
  it('puts a centred mark on every page, including rotated ones', async () => {
    const out = await addWatermark(await makePdf([0, 90]), { text: 'CONFIDENTIAL', fontSize: 40, opacity: 0.2, angle: 0, color: [1, 0, 0], layout: 'center', bold: true });
    for (const n of [1, 2]) {
      const { vp, items } = await shown(out, n);
      const m = items.find(i => i.str === 'CONFIDENTIAL')!;
      expect(m.upright).toBe(true);
      expect(m.x).toBeGreaterThan(vp.width * 0.05);
      expect(m.x).toBeLessThan(vp.width * 0.5);
      expect(Math.abs(m.y - vp.height / 2)).toBeLessThan(30); // roughly vertically centred
    }
  });

  it('tiles many marks', async () => {
    const out = await addWatermark(await makePdf([0]), { text: 'DRAFT', fontSize: 24, opacity: 0.15, angle: 45, color: [0.5, 0.5, 0.5], layout: 'tile', bold: false });
    expect((await shown(out, 1)).items.filter(i => i.str === 'DRAFT').length).toBeGreaterThan(4);
  });
});
