// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, PDFArray, PDFDict, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { addWatermark } from '@/lib/pdfPages';
import { findWatermarks, removeWatermarks } from '@/lib/pdfWatermark';

const require = createRequire(import.meta.url);
beforeAll(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
});

async function textOf(bytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const items = (await (await pdf.getPage(p)).getTextContent()).items as { str: string }[];
    out.push(items.map(i => i.str).join(' '));
  }
  return out;
}

/** 3 pages of body text, each with a header line and a small logo image. */
async function report(withLogo = false) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // 2×2 PNG
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAwMDAwMDAAAANAAH/1Q2kAAAAAElFTkSuQmCC'), c => c.charCodeAt(0));
  const logo = withLogo ? await doc.embedPng(png) : null;
  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText('Acme Pvt Ltd - Quarterly report', { x: 40, y: 560, size: 10, font });
    page.drawText(`Revenue for section ${i} grew steadily`, { x: 40, y: 300, size: 12, font });
    if (logo) page.drawImage(logo, { x: 330, y: 550, width: 30, height: 30 });
  }
  return doc.save();
}

describe('PDF watermark remover', () => {
  it('finds and removes a watermark added by our own Watermark PDF tool, keeping the real text', async () => {
    for (const layout of ['center', 'tile'] as const) {
      const marked = await addWatermark(await report(), { text: 'CONFIDENTIAL', fontSize: 48, opacity: 0.25, angle: 45, color: [0.5, 0.5, 0.5], layout, bold: true });
      const found = await findWatermarks(marked);
      const wm = found.find(c => c.label === 'Text "CONFIDENTIAL"')!;
      expect(wm).toBeTruthy();
      expect(wm.likely).toBe(true);
      expect(wm.pages).toEqual([1, 2, 3]);
      expect(wm.rotated && wm.transparent).toBe(true);
      // Body text is never offered; the repeated header is offered but not pre-selected.
      expect(found.some(c => c.label.includes('Revenue'))).toBe(false);
      const header = found.find(c => c.label.includes('Quarterly report'));
      expect(header?.likely ?? false).toBe(false);

      const { bytes, pages } = await removeWatermarks(marked, [wm.id]);
      expect(pages).toBe(3);
      const text = await textOf(bytes);
      text.forEach((t, i) => {
        expect(t).not.toContain('CONFIDENTIAL');
        expect(t).toContain(`Revenue for section ${i + 1} grew steadily`);
        expect(t).toContain('Quarterly report');
      });
    }
  });

  it('offers a logo repeated on every page without pre-selecting it, and removes it on request', async () => {
    const pdf = await report(true);
    const found = await findWatermarks(pdf);
    const img = found.find(c => c.kind === 'image')!;
    expect(img.label).toBe('Image 2 × 2 px');
    expect(img.likely).toBe(false);
    const { bytes } = await removeWatermarks(pdf, [img.id]);
    const again = await findWatermarks(bytes);
    expect(again.some(c => c.kind === 'image')).toBe(false);
    expect((await textOf(bytes))[0]).toContain('Revenue for section 1');
  });

  it('removes content tagged as a watermark (Acrobat style), including vector shapes', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 600]);
    page.drawText('Invoice body text', { x: 40, y: 300, size: 12, font, color: rgb(0, 0, 0) });
    const fonts = page.node.Resources()!.lookup(PDFName.of('Font'), PDFDict);
    const fname = fonts.keys()[0].decodeText();
    const wm = `/Artifact <</Type /Pagination /Subtype /Watermark>> BDC q 0.8 g 100 100 200 50 re f BT /${fname} 40 Tf 1 0 0 1 120 400 Tm (SAMPLE) Tj ET Q EMC`;
    const ctx = doc.context;
    const extra = ctx.register(ctx.stream(wm));
    const original = page.node.get(PDFName.of('Contents'))!;
    const list = original instanceof PDFArray ? original.asArray() : [original];
    page.node.set(PDFName.of('Contents'), ctx.obj([...list, extra]));
    const pdf = await doc.save();
    expect((await textOf(pdf))[0]).toContain('SAMPLE'); // set-up sanity check

    const found = await findWatermarks(pdf);
    const tagged = found.find(c => c.kind === 'tagged')!;
    expect(tagged.likely).toBe(true);
    expect(found.some(c => c.label.includes('SAMPLE'))).toBe(false); // part of the tagged group, not separate
    const { bytes } = await removeWatermarks(pdf, [tagged.id]);
    const [t] = await textOf(bytes);
    expect(t).not.toContain('SAMPLE');
    expect(t).toContain('Invoice body text');
    // The rectangle is no longer painted: its "f" became "n".
    const out = await PDFDocument.load(bytes);
    const stream = out.getPages()[0].node.Contents() as PDFRawStream;
    const txt = new TextDecoder().decode(decodePDFRawStream(stream).decode());
    expect(txt).toMatch(/re\s+n/);
    expect(txt).not.toMatch(/re\s+f/);
  });

  it('removes watermark annotations', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 600]);
    const ctx = doc.context;
    const annot = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Watermark', Rect: [0, 0, 100, 100] }));
    const link = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10] }));
    page.node.set(PDFName.of('Annots'), ctx.obj([link, annot]));
    const pdf = await doc.save();
    const found = await findWatermarks(pdf);
    expect(found.map(c => c.id)).toEqual(['annot']);
    const { bytes, removed } = await removeWatermarks(pdf, ['annot']);
    expect(removed).toBe(1);
    const out = await PDFDocument.load(bytes);
    const annots = out.getPages()[0].node.lookup(PDFName.of('Annots'), PDFArray);
    expect(annots.size()).toBe(1); // the link stays
  });

  it('offers nothing on a clean document', async () => {
    expect(await findWatermarks(await (async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      doc.addPage([400, 600]).drawText('Just a letter', { x: 40, y: 300, size: 12, font });
      return doc.save();
    })())).toEqual([]);
  });
});
