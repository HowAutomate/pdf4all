import { PDFDocument, PDFFont, rgb, degrees, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { standardFontFor, type FontMatch } from './fontMatch';
import { readPageText, matchLine, buildRedraw, removeOps, type ShownText } from './rewriteText';

export type RGB = [number, number, number]; // each 0..1

/**
 * Every coordinate below is PDF user space (points, y up) — the UI converts
 * from screen space with pdf.js's viewport before calling applyEdits.
 * `rotation` is the page's /Rotate value: content drawn with that rotation
 * appears upright to the reader.
 */
export type Edit =
  | {
      /** Change an existing line: cover the old glyphs, draw new text on the same baseline. */
      kind: 'replace'; page: number;
      x: number; y: number; width: number; ascent: number; descent: number;
      fontSize: number; text: string; font: FontMatch; color: RGB; background: RGB;
    }
  | {
      kind: 'text'; page: number;
      /** One entry per line, each with its own baseline-start point. */
      lines: { text: string; x: number; y: number }[];
      fontSize: number; font: FontMatch; color: RGB; rotation: number;
    }
  | {
      /** White-out (opacity 1) or highlight (translucent). */
      kind: 'rect'; page: number;
      x: number; y: number; width: number; height: number; color: RGB; opacity: number;
    }
  | {
      /** x/y is the image's bottom-left corner as the reader sees it. */
      kind: 'image'; page: number;
      x: number; y: number; width: number; height: number;
      bytes: Uint8Array; format: 'png' | 'jpg'; rotation: number;
    };

export interface ApplyOptions {
  /**
   * Loads a Unicode TTF for text the standard PDF fonts can't encode
   * (₹, curly quotes in some cases, non-Latin letters). Only called if needed,
   * once per weight actually used.
   */
  loadUnicodeFont?: (weight: 'regular' | 'bold') => Promise<ArrayBuffer | Uint8Array>;
  /** Filled in with how each replaced line was handled. */
  report?: EditReport;
}

export interface EditReport {
  /** Old text deleted, new text written in the PDF's own font. */
  originalFont: number;
  /** Old text deleted, new text in a substitute font (a character wasn't in the original font). */
  substituteFont: number;
  /** Old text couldn't be isolated, so it was covered rather than deleted. */
  covered: number;
}

/** Extra cover around replaced text so anti-aliased edges of old glyphs don't peek out. */
const COVER_PAD = 0.6;

export async function applyEdits(
  original: ArrayBuffer | Uint8Array,
  edits: Edit[],
  opts: ApplyOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(original);
  const pages = doc.getPages();
  const fontCache = new Map<string, PDFFont>();
  const unicodeFonts = new Map<'regular' | 'bold', PDFFont>();

  const fontFor = async (match: FontMatch, text: string): Promise<PDFFont> => {
    const std = standardFontFor(match);
    let font = fontCache.get(std);
    if (!font) {
      font = await doc.embedFont(std);
      fontCache.set(std, font);
    }
    if (canEncode(font, text)) return font;
    if (!opts.loadUnicodeFont) throw new Error(`These characters can't be written with a standard PDF font: ${text}`);
    const weight = match.bold ? 'bold' : 'regular';
    let uni = unicodeFonts.get(weight);
    if (!uni) {
      doc.registerFontkit(fontkit);
      uni = await doc.embedFont(await opts.loadUnicodeFont(weight), { subset: true });
      unicodeFonts.set(weight, uni);
    }
    return uni;
  };

  const report: EditReport = opts.report ?? { originalFont: 0, substituteFont: 0, covered: 0 };

  // Pass 1 — true replacement. For each edited line, find the operators that
  // drew it, delete them from the page and redraw the new text with the same
  // font, size and position. Done for all lines of a page at once, before
  // anything else is drawn on it.
  const rewritten = new Set<Edit>();
  const byPage = new Map<number, Extract<Edit, { kind: 'replace' }>[]>();
  for (const e of edits) if (e.kind === 'replace') (byPage.get(e.page) ?? byPage.set(e.page, []).get(e.page)!).push(e);
  for (const [pageIndex, lineEdits] of byPage) {
    const page = pages[pageIndex];
    if (!page) continue;
    let pt;
    try { pt = readPageText(page); } catch { pt = null; }
    if (!pt) continue;
    const toRemove: ShownText[] = [];
    const redraws: (() => Promise<void>)[] = [];
    for (const e of lineEdits) {
      const ops = matchLine(pt, { x: e.x, y: e.y, width: e.width, fontSize: e.fontSize, text: e.text, color: e.color });
      if (!ops || ops.some(o => toRemove.includes(o))) continue;
      toRemove.push(...ops);
      rewritten.add(e);
      if (!e.text.trim()) { report.originalFont++; continue; }
      const own = buildRedraw(ops, e.text, e.color, doc.context);
      if (own) {
        redraws.push(async () => { page.pushOperators(...own); });
        report.originalFont++;
      } else {
        redraws.push(async () => {
          const font = await fontFor(e.font, e.text);
          page.drawText(e.text, { x: e.x, y: e.y, size: e.fontSize, font, color: rgb(...e.color) });
        });
        report.substituteFont++;
      }
    }
    if (toRemove.length) {
      removeOps(doc, page, pt, toRemove.map(s => s.op));
      for (const r of redraws) await r();
    }
  }

  // Pass 2 — everything else, in the order given (the UI passes on-screen
  // stacking order, so a white-out drawn after a highlight still hides it).
  for (const edit of edits) {
    const page: PDFPage | undefined = pages[edit.page];
    if (!page) throw new Error(`Page ${edit.page + 1} does not exist`);

    if (edit.kind === 'replace') {
      if (rewritten.has(edit)) continue;
      // Fallback: cover the old glyphs and draw the new text on top.
      report.covered++;
      page.drawRectangle({
        x: edit.x - COVER_PAD,
        y: edit.y - edit.descent - COVER_PAD,
        width: edit.width + COVER_PAD * 2,
        height: edit.ascent + edit.descent + COVER_PAD * 2,
        color: rgb(...edit.background),
      });
      if (edit.text.trim()) {
        const font = await fontFor(edit.font, edit.text);
        page.drawText(edit.text, { x: edit.x, y: edit.y, size: edit.fontSize, font, color: rgb(...edit.color) });
      }
    } else if (edit.kind === 'text') {
      for (const line of edit.lines) {
        if (!line.text) continue;
        const font = await fontFor(edit.font, line.text);
        page.drawText(line.text, {
          x: line.x, y: line.y, size: edit.fontSize, font,
          color: rgb(...edit.color), rotate: degrees(edit.rotation),
        });
      }
    } else if (edit.kind === 'rect') {
      page.drawRectangle({
        x: edit.x, y: edit.y, width: edit.width, height: edit.height,
        color: rgb(...edit.color), opacity: edit.opacity,
      });
    } else {
      const img = edit.format === 'png' ? await doc.embedPng(edit.bytes) : await doc.embedJpg(edit.bytes);
      page.drawImage(img, {
        x: edit.x, y: edit.y, width: edit.width, height: edit.height, rotate: degrees(edit.rotation),
      });
    }
  }

  return doc.save();
}

function canEncode(font: PDFFont, text: string): boolean {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
}
