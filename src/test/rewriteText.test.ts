// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, StandardFonts, PDFName, PDFDict } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { groupTextRuns, type RawTextItem } from '@/lib/pdfEdit/textRuns';
import { matchFont } from '@/lib/pdfEdit/fontMatch';
import { applyEdits, type EditReport, type Edit } from '@/lib/pdfEdit/applyEdits';
import { parseContentStream } from '@/lib/pdfEdit/contentStream';
import { parseToUnicode } from '@/lib/pdfEdit/fontInfo';

const require = createRequire(import.meta.url);
const dejavu = () => readFileSync(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
const loadUnicodeFont = async (w: 'regular' | 'bold') =>
  readFileSync(require.resolve(`dejavu-fonts-ttf/ttf/DejaVuSans${w === 'bold' ? '-Bold' : ''}.ttf`));

beforeAll(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
});

async function runsOf(bytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const c = await page.getTextContent();
  return groupTextRuns(c.items as RawTextItem[], c.styles);
}

type Run = Awaited<ReturnType<typeof runsOf>>[number];
const replace = (r: Run, text: string): Extract<Edit, { kind: 'replace' }> => ({
  kind: 'replace', page: 0, x: r.x, y: r.y, width: r.width, ascent: r.ascent, descent: r.descent,
  fontSize: r.fontSize, text, font: matchFont('Helvetica'), color: [0, 0, 0], background: [1, 1, 1],
});
const emptyReport = (): EditReport => ({ originalFont: 0, substituteFont: 0, covered: 0 });

const fontCount = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPage(0).node.Resources()!.lookup(PDFName.of('Font'), PDFDict).keys().length;
};

describe('content stream parser', () => {
  it('keeps byte ranges and handles strings, arrays, dicts and inline images', () => {
    const src = 'q 1 0 0 1 5 5 cm BT /F1 12 Tf (a \\(b\\) \\101) Tj [(x) -120 <4142>] TJ ET /P <</MCID 3>> BDC EMC BI /W 2 /H 1 ID \u0000EIÿ EI Q';
    const bytes = new Uint8Array([...src].map(c => c.charCodeAt(0)));
    const ops = parseContentStream(bytes);
    expect(ops.map(o => o.op)).toEqual(['q', 'cm', 'BT', 'Tf', 'Tj', 'TJ', 'ET', 'BDC', 'EMC', 'BI', 'Q']);
    const tj = ops[4];
    expect(new TextDecoder().decode((tj.args[0] as { v: Uint8Array }).v)).toBe('a (b) A');
    expect(src.slice(tj.start, tj.end)).toBe('(a \\(b\\) \\101) Tj');
  });

  it('parses ToUnicode bfchar and both bfrange forms', () => {
    const m = parseToUnicode('beginbfchar <0003> <0020> endbfchar beginbfrange <0010> <0012> <0041> <0020> <0021> [<20B9> <0078>] endbfrange');
    expect([m.get(3), m.get(0x10), m.get(0x12), m.get(0x20), m.get(0x21)]).toEqual([' ', 'A', 'C', '₹', 'x']);
  });
});

describe('true text replacement', () => {
  it('deletes the old line and redraws in the same standard font', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 300]);
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Invoice Date: 01 Sep 2026', { x: 50, y: 200, size: 12, font: helv });
    page.drawText('Keep me', { x: 50, y: 150, size: 12, font: helv });
    const original = await doc.save();
    const runs = await runsOf(original);
    const report = emptyReport();
    const out = await applyEdits(original, [replace(runs[0], 'Invoice Date: 02 Oct 2026')], { report });
    expect(report).toEqual({ originalFont: 1, substituteFont: 0, covered: 0 });
    const after = await runsOf(out);
    expect(after.map(r => r.text).sort()).toEqual(['Invoice Date: 02 Oct 2026', 'Keep me']);
    const r = after.find(x => x.text.startsWith('Invoice'))!;
    expect(r.x).toBeCloseTo(50, 2);
    expect(r.y).toBeCloseTo(200, 2);
    expect(await fontCount(out)).toBe(await fontCount(original)); // no new font embedded
  });

  it('reuses an embedded subset font for characters it contains, and substitutes otherwise', async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const page = doc.addPage([400, 300]);
    const f = await doc.embedFont(dejavu(), { subset: true });
    page.drawText('Hello World 2026', { x: 40, y: 220, size: 14, font: f });
    page.drawText('Second line', { x: 40, y: 180, size: 14, font: f });
    const original = await doc.save();
    const runs = await runsOf(original);

    const r1 = emptyReport();
    const out1 = await applyEdits(original, [replace(runs[0], 'World Hello 2062')], { report: r1, loadUnicodeFont });
    expect(r1.originalFont).toBe(1);
    expect((await runsOf(out1)).map(r => r.text).sort()).toEqual(['Second line', 'World Hello 2062']);
    expect(await fontCount(out1)).toBe(await fontCount(original));

    const r2 = emptyReport();
    const out2 = await applyEdits(original, [replace(runs[0], 'Quartz ₹9')], { report: r2, loadUnicodeFont });
    expect(r2.substituteFont).toBe(1);
    const texts = (await runsOf(out2)).map(r => r.text);
    expect(texts).toContain('Quartz ₹9');
    expect(texts.some(t => t.includes('Hello'))).toBe(false); // old text really gone
  });

  it('deletes a line outright when the new text is empty', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 300]);
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Secret account 1234', { x: 50, y: 200, size: 12, font: helv });
    page.drawText('Public line', { x: 50, y: 100, size: 12, font: helv });
    const original = await doc.save({ useObjectStreams: false });
    const out = await applyEdits(original, [replace((await runsOf(original))[0], '')]);
    expect((await runsOf(out)).map(r => r.text)).toEqual(['Public line']);
  });

  it('only removes the edited line, not other text on the same baseline', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 300]);
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Name', { x: 40, y: 200, size: 12, font: helv });
    page.drawText('Amit', { x: 250, y: 200, size: 12, font: helv });
    const original = await doc.save();
    const runs = await runsOf(original);
    const out = await applyEdits(original, [replace(runs.find(r => r.text === 'Amit')!, 'Ravi')]);
    expect((await runsOf(out)).map(r => r.text).sort()).toEqual(['Name', 'Ravi']);
  });

  it('falls back to covering when one operator draws more than the edited line', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 300]);
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Total due: 500', { x: 40, y: 200, size: 12, font: helv });
    const original = await doc.save();
    const run = (await runsOf(original))[0];
    // Pretend only "Total" was edited: part of a single Tj can't be cut out.
    const report = emptyReport();
    await applyEdits(original, [{ ...replace(run, 'Sum'), width: helv.widthOfTextAtSize('Total', 12) }], { report });
    expect(report.covered).toBe(1);
  });
});
