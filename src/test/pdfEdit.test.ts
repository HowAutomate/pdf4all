// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { groupTextRuns, type RawTextItem } from '@/lib/pdfEdit/textRuns';
import { matchFont, standardFontFor } from '@/lib/pdfEdit/fontMatch';
import { applyEdits } from '@/lib/pdfEdit/applyEdits';

const require = createRequire(import.meta.url);

beforeAll(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
});

const loadUnicodeFont = async (weight: 'regular' | 'bold') =>
  readFileSync(require.resolve(`dejavu-fonts-ttf/ttf/DejaVuSans${weight === 'bold' ? '-Bold' : ''}.ttf`));

async function makePdf(rotation = 0) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.setRotation(degrees(rotation));
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('Invoice Date: 01 Sep 2026', { x: 50, y: 200, size: 12, font: helv });
  page.drawText('TOTAL DUE', { x: 50, y: 150, size: 16, font: bold });
  return doc.save();
}

async function textOf(bytes: Uint8Array, pageNo = 1) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
  const page = await pdf.getPage(pageNo);
  const content = await page.getTextContent();
  return { page, content, runs: groupTextRuns(content.items as RawTextItem[], content.styles) };
}

describe('groupTextRuns', () => {
  const item = (str: string, x: number, y = 100, w = str.length * 6, font = 'f1'): RawTextItem =>
    ({ str, transform: [12, 0, 0, 12, x, y], width: w, height: 12, fontName: font });

  it('merges word-by-word pieces on one baseline into a line', () => {
    const runs = groupTextRuns([item('Hello', 10), item('world', 10 + 30 + 7)], {});
    expect(runs.map(r => r.text)).toEqual(['Hello world']);
    expect(runs[0].width).toBeCloseTo(7 + 30 + 30, 5);
  });

  it('keeps different lines, fonts and far-apart columns separate', () => {
    const runs = groupTextRuns([
      item('Name', 10), item('Amit', 200), item('Bold', 10, 80, 24, 'f2'), item('Next', 10, 60),
    ], {});
    expect(runs.map(r => r.text)).toEqual(['Name', 'Amit', 'Bold', 'Next']);
  });

  it('does not let a wide tab-like space stretch a run over the next column', () => {
    const runs = groupTextRuns([
      item('HOWAUTOMATE', 71, 100, 73), item(' ', 144, 100, 113), item('Systems', 229, 100, 41),
    ], {});
    expect(runs.map(r => r.text)).toEqual(['HOWAUTOMATE', 'Systems']);
    expect(runs[0].width).toBeCloseTo(73);
  });

  it('joins words split by a separate normal space item', () => {
    const runs = groupTextRuns([item('No:', 10, 100, 16), item(' ', 26, 100, 4), item('INV-7', 30, 100, 30)], {});
    expect(runs.map(r => r.text)).toEqual(['No: INV-7']);
    expect(runs[0].width).toBeCloseTo(50);
  });

  it('joins letter-spaced words separated by space items', () => {
    const runs = groupTextRuns([item('SYSTEM', 10, 100, 40), item(' ', 50, 100, 5), item('CATALOG', 59, 100, 45)], {});
    expect(runs.map(r => r.text)).toEqual(['SYSTEM CATALOG']);
  });

  it('falls back to default metrics when a font reports NaN/null', () => {
    const [run] = groupTextRuns([item('Hi', 0)], { f1: { ascent: NaN, descent: null } });
    expect(run.ascent).toBeCloseTo(9.6);
    expect(run.descent).toBeCloseTo(2.4);
  });

  it('does not space out letter-spaced glyphs', () => {
    const letters = 'SYSTEM'.split('').map((ch, i) => item(ch, 10 + i * 9, 100, 7));
    expect(groupTextRuns(letters, {}).map(r => r.text)).toEqual(['SYSTEM']);
  });

  it('joins touching glyphs split across font subsets ("0" + "6" → "06")', () => {
    const runs = groupTextRuns([item('0', 231.75, 100, 10.8, 'f7'), item('6', 242.55, 100, 10.6, 'f6')], {});
    expect(runs.map(r => r.text)).toEqual(['06']);
  });

  it('skips rotated text and whitespace-only items', () => {
    const rotated: RawTextItem = { str: 'Side', transform: [0, 12, -12, 0, 10, 10], width: 20, height: 12, fontName: 'f1' };
    expect(groupTextRuns([rotated, item('   ', 50)], {})).toEqual([]);
  });

  it('uses font ascent/descent from styles', () => {
    const [run] = groupTextRuns([item('Hi', 0)], { f1: { ascent: 0.9, descent: -0.25 } });
    expect(run.ascent).toBeCloseTo(10.8);
    expect(run.descent).toBeCloseTo(3);
  });
});

describe('matchFont', () => {
  it('reads family and weight from subset font names', () => {
    expect(matchFont('ABCDEF+Calibri-Bold')).toEqual({ family: 'sans', bold: true, italic: false });
    expect(matchFont('TimesNewRomanPS-ItalicMT')).toEqual({ family: 'serif', bold: false, italic: true });
    expect(matchFont('CourierNewPSMT')).toEqual({ family: 'mono', bold: false, italic: false });
    expect(matchFont('NotoSans-Regular')).toEqual({ family: 'sans', bold: false, italic: false });
    expect(standardFontFor(matchFont('Arial-BoldMT'))).toBe(StandardFonts.HelveticaBold);
  });
});

describe('applyEdits (round trip through pdf.js)', () => {
  it('finds the original lines as runs', async () => {
    const { runs } = await textOf(await makePdf());
    expect(runs.map(r => r.text)).toEqual(['Invoice Date: 01 Sep 2026', 'TOTAL DUE']);
    expect(runs[0].x).toBeCloseTo(50, 1);
    expect(runs[0].y).toBeCloseTo(200, 1);
    expect(runs[0].fontSize).toBeCloseTo(12, 3);
  });

  it('replaces a line on the same baseline, with a ₹ that needs the Unicode font', async () => {
    const original = await makePdf();
    const { runs } = await textOf(original);
    const r = runs[0];
    const edited = await applyEdits(original, [{
      kind: 'replace', page: 0, x: r.x, y: r.y, width: r.width, ascent: r.ascent, descent: r.descent,
      fontSize: r.fontSize, text: 'Invoice Date: 02 Oct 2026 · ₹1,180', font: matchFont('Helvetica'),
      color: [0, 0, 0], background: [1, 1, 1],
    }], { loadUnicodeFont });
    const after = await textOf(edited);
    const replaced = after.runs.find(x => x.text.includes('02 Oct 2026'));
    expect(replaced?.text).toContain('₹1,180');
    expect(replaced?.y).toBeCloseTo(200, 1);
    expect(replaced?.x).toBeCloseTo(50, 1);
    // The untouched line is still there.
    expect(after.runs.some(x => x.text === 'TOTAL DUE')).toBe(true);
  });

  it('keeps bold when a bold line needs the Unicode font', async () => {
    const original = await makePdf();
    const { runs } = await textOf(original);
    const r = runs[1]; // "TOTAL DUE", Helvetica-Bold
    const weights: string[] = [];
    const edited = await applyEdits(original, [{
      kind: 'replace', page: 0, x: r.x, y: r.y, width: r.width, ascent: r.ascent, descent: r.descent,
      fontSize: r.fontSize, text: 'TOTAL ₹1,180', font: matchFont('Helvetica-Bold'), color: [0, 0, 0], background: [1, 1, 1],
    }], { loadUnicodeFont: async w => { weights.push(w); return loadUnicodeFont(w); } });
    expect(weights).toEqual(['bold']);
    expect((await textOf(edited)).runs.some(x => x.text === 'TOTAL ₹1,180')).toBe(true);
  });

  it('refuses unencodable text when no Unicode font is supplied', async () => {
    await expect(applyEdits(await makePdf(), [{
      kind: 'text', page: 0, lines: [{ text: '₹5', x: 10, y: 10 }], fontSize: 12,
      font: matchFont('Helvetica'), color: [0, 0, 0], rotation: 0,
    }])).rejects.toThrow(/standard PDF font/);
  });

  it('draws added text upright on a rotated page', async () => {
    const original = await makePdf(90);
    const pdf = await pdfjs.getDocument({ data: original.slice() }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    expect(viewport.width).toBeCloseTo(300); // rotated: 300 wide, 400 tall
    // Baseline start 40px from the left, 60px from the top, as the reader sees it.
    const [x, y] = viewport.convertToPdfPoint(40, 60);
    const edited = await applyEdits(original, [{
      kind: 'text', page: 0, lines: [{ text: 'Approved', x, y }], fontSize: 14,
      font: matchFont('Helvetica'), color: [0, 0, 0], rotation: 90,
    }]);
    const after = await pdfjs.getDocument({ data: edited.slice() }).promise;
    const p = await after.getPage(1);
    const vp = p.getViewport({ scale: 1 });
    const content = await p.getTextContent();
    const item = (content.items as RawTextItem[]).find(i => i.str === 'Approved')!;
    const m = pdfjs.Util.transform(vp.transform, item.transform);
    // Upright in screen space: x axis points right, no rotation component.
    expect(m[0]).toBeGreaterThan(0);
    expect(Math.abs(m[1])).toBeLessThan(1e-6);
    expect(m[4]).toBeCloseTo(40, 3);
    expect(m[5]).toBeCloseTo(60, 3);
  });
});

describe('sampleColors', () => {
  it('finds a tinted background and the ink colour', async () => {
    const { sampleColors } = await import('@/lib/pdfEdit/sampleColors');
    const width = 40, height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) data.set([230, 240, 255, 255], i * 4); // light blue cell
    for (let x = 12; x < 20; x++) for (let y = 8; y < 12; y++) data.set([200, 30, 30, 255], (y * width + x) * 4); // red glyph
    const { background, text } = sampleColors({ data, width, height }, { x: 10, y: 6, w: 14, h: 8 });
    expect(background.map(c => Math.round(c * 255))).toEqual([230, 240, 255]);
    expect(text.map(c => Math.round(c * 255))).toEqual([200, 30, 30]);
  });
});
