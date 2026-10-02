import { PDFDocument, PDFFont, rgb, degrees, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { standardFontFor, type FontMatch } from './fontMatch';

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

  // Applied in the order given — the UI passes them in on-screen stacking
  // order, so a white-out drawn after a highlight still hides it.
  for (const edit of edits) {
    const page: PDFPage | undefined = pages[edit.page];
    if (!page) throw new Error(`Page ${edit.page + 1} does not exist`);

    if (edit.kind === 'replace') {
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
