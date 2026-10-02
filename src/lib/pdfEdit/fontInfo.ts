import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream, type PDFObject } from 'pdf-lib';
import { Font as StdFont, Encodings, FontNames } from '@pdf-lib/standard-fonts';

/**
 * What the editor needs to know about a font used on a page: how to turn the
 * bytes in a text operator into character codes, how wide each glyph is (to
 * work out where text ends), and — to reuse the font for new text — which
 * character code draws a given Unicode character.
 */
export interface FontInfo {
  /** Two-byte codes (Type0 / Identity-H) or one-byte (simple fonts). */
  twoByte: boolean;
  /** Glyph advance in 1/1000 em. */
  width(code: number): number;
  codes(bytes: Uint8Array): number[];
  /**
   * Encodes text with this font, or returns null if any character isn't
   * available — subset fonts only carry the glyphs the document used.
   */
  encode(text: string): Uint8Array | null;
  /** Code of the space glyph, if the font has one. */
  spaceCode: number | null;
}

const STANDARD: Record<string, FontNames> = {
  Helvetica: FontNames.Helvetica, 'Helvetica-Bold': FontNames.HelveticaBold,
  'Helvetica-Oblique': FontNames.HelveticaOblique, 'Helvetica-BoldOblique': FontNames.HelveticaBoldOblique,
  'Times-Roman': FontNames.TimesRoman, 'Times-Bold': FontNames.TimesRomanBold,
  'Times-Italic': FontNames.TimesRomanItalic, 'Times-BoldItalic': FontNames.TimesRomanBoldItalic,
  Courier: FontNames.Courier, 'Courier-Bold': FontNames.CourierBold,
  'Courier-Oblique': FontNames.CourierOblique, 'Courier-BoldOblique': FontNames.CourierBoldOblique,
  Arial: FontNames.Helvetica, 'Arial,Bold': FontNames.HelveticaBold, ArialMT: FontNames.Helvetica,
  'Arial-BoldMT': FontNames.HelveticaBold, TimesNewRoman: FontNames.TimesRoman, 'TimesNewRomanPSMT': FontNames.TimesRoman,
};

const deref = <T extends PDFObject>(o: PDFObject | undefined, lookup: (r: PDFRef) => PDFObject | undefined): T | undefined =>
  (o instanceof PDFRef ? lookup(o) : o) as T | undefined;

function streamBytes(s: PDFStream): Uint8Array {
  if (s instanceof PDFRawStream) return decodePDFRawStream(s).decode();
  return s.getContents();
}

/** ToUnicode CMap: code → string. Handles bfchar and bfrange (both forms). */
export function parseToUnicode(text: string): Map<number, string> {
  const map = new Map<number, string>();
  const hex = (h: string) => parseInt(h, 16);
  const utf16 = (h: string) => {
    let s = '';
    for (let k = 0; k + 4 <= h.length; k += 4) s += String.fromCharCode(parseInt(h.slice(k, k + 4), 16));
    if (h.length === 2) s = String.fromCharCode(parseInt(h, 16));
    return s;
  };
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(hex(m[1]), utf16(m[2]));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/g)) {
      const lo = hex(m[1]), hi = hex(m[2]);
      if (hi - lo > 0xffff) continue;
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9a-fA-F]*)>/g)].map(x => utf16(x[1]));
        items.forEach((s, k) => map.set(lo + k, s));
      } else {
        const base = m[3].slice(1, -1);
        // The last UTF-16 unit increments across the range.
        const head = base.slice(0, -4), tail = parseInt(base.slice(-4), 16);
        for (let c = lo; c <= hi; c++) map.set(c, utf16(head + (tail + c - lo).toString(16).padStart(4, '0')));
      }
    }
  }
  return map;
}

export function loadFontInfo(fontDict: PDFDict, lookup: (r: PDFRef) => PDFObject | undefined): FontInfo | null {
  const name = (k: string) => (deref<PDFName>(fontDict.get(PDFName.of(k)), lookup))?.decodeText?.() ?? undefined;
  const subtype = name('Subtype');
  const baseFont = (name('BaseFont') ?? '').replace(/^[A-Z]{6}\+/, '');

  let toUnicode: Map<number, string> | undefined;
  const tu = deref<PDFStream>(fontDict.get(PDFName.of('ToUnicode')), lookup);
  if (tu instanceof PDFStream) {
    try { toUnicode = parseToUnicode(new TextDecoder('latin1').decode(streamBytes(tu))); } catch { /* unreadable CMap */ }
  }
  const fromUnicode = new Map<string, number>();
  toUnicode?.forEach((s, code) => { if (s && !fromUnicode.has(s)) fromUnicode.set(s, code); });

  if (subtype === 'Type0') {
    if (name('Encoding') !== 'Identity-H') return null;
    const desc = deref<PDFArray>(fontDict.get(PDFName.of('DescendantFonts')), lookup);
    const cid = desc && deref<PDFDict>(desc.get(0), lookup);
    if (!(cid instanceof PDFDict)) return null;
    const dwObj = deref<PDFNumber>(cid.get(PDFName.of('DW')), lookup);
    const dw = dwObj instanceof PDFNumber ? dwObj.asNumber() : 1000;
    const widths = new Map<number, number>();
    const w = deref<PDFArray>(cid.get(PDFName.of('W')), lookup);
    if (w instanceof PDFArray) {
      const arr = w.asArray().map(o => deref<PDFObject>(o, lookup));
      for (let k = 0; k < arr.length;) {
        const first = (arr[k] as PDFNumber).asNumber();
        const next = arr[k + 1];
        if (next instanceof PDFArray) {
          next.asArray().forEach((v, j) => widths.set(first + j, (deref<PDFNumber>(v, lookup) as PDFNumber).asNumber()));
          k += 2;
        } else {
          const last = (next as PDFNumber).asNumber();
          const v = (arr[k + 2] as PDFNumber).asNumber();
          for (let c = first; c <= last; c++) widths.set(c, v);
          k += 3;
        }
      }
    }
    if (!toUnicode) return null; // can't map new text to glyphs without it
    return {
      twoByte: true,
      width: code => widths.get(code) ?? dw,
      codes: bytes => { const out: number[] = []; for (let k = 0; k + 1 < bytes.length; k += 2) out.push((bytes[k] << 8) | bytes[k + 1]); return out; },
      encode: text => {
        const out: number[] = [];
        for (const ch of text) {
          const code = fromUnicode.get(ch);
          if (code === undefined) return null;
          out.push(code >> 8, code & 0xff);
        }
        return new Uint8Array(out);
      },
      spaceCode: fromUnicode.get(' ') ?? null,
    };
  }

  const isType3 = subtype === 'Type3';
  if (subtype !== 'Type1' && subtype !== 'TrueType' && subtype !== 'MMType1' && !isType3) return null;

  const widthsArr = deref<PDFArray>(fontDict.get(PDFName.of('Widths')), lookup);
  const firstCharObj = deref<PDFNumber>(fontDict.get(PDFName.of('FirstChar')), lookup);
  let width: (code: number) => number;
  let encodeChar: (ch: string) => number | undefined;
  const std = STANDARD[baseFont];
  const encodingName = name('Encoding');

  // Type3 widths are in glyph space, scaled to text space by /FontMatrix
  // (commonly 0.001, but Chrome and others use other scales).
  let widthScale = 1;
  if (isType3) {
    const fm = deref<PDFArray>(fontDict.get(PDFName.of('FontMatrix')), lookup);
    const a = fm instanceof PDFArray ? (deref<PDFNumber>(fm.get(0), lookup) as PDFNumber)?.asNumber?.() : undefined;
    if (!a) return null;
    widthScale = a * 1000;
  }

  if (widthsArr instanceof PDFArray && firstCharObj instanceof PDFNumber) {
    const first = firstCharObj.asNumber();
    const ws = widthsArr.asArray().map(o => (deref<PDFNumber>(o, lookup) as PDFNumber)?.asNumber?.() ?? 0);
    width = code => (ws[code - first] ?? 0) * widthScale;
  } else if (isType3) {
    return null;
  } else if (std) {
    const afm = StdFont.load(std);
    const nameOf = new Map<number, string>();
    for (const cp of Encodings.WinAnsi.supportedCodePoints) {
      const { code, name: gName } = Encodings.WinAnsi.encodeUnicodeCodePoint(cp);
      nameOf.set(code, gName);
    }
    width = code => Number(afm.getWidthOfGlyph(nameOf.get(code) ?? '')) || 0;
  } else return null;

  if (toUnicode) {
    encodeChar = ch => fromUnicode.get(ch);
  } else if (std && (!encodingName || encodingName === 'WinAnsiEncoding') && !fontDict.get(PDFName.of('FontDescriptor'))) {
    // A non-embedded standard font has every WinAnsi glyph, so any WinAnsi text works.
    encodeChar = ch => {
      const cp = ch.codePointAt(0)!;
      return Encodings.WinAnsi.canEncodeUnicodeCodePoint(cp) ? Encodings.WinAnsi.encodeUnicodeCodePoint(cp).code : undefined;
    };
  } else {
    encodeChar = () => undefined; // unknown encoding: never reuse this font
  }

  return {
    twoByte: false,
    width,
    codes: bytes => Array.from(bytes),
    encode: text => {
      const out: number[] = [];
      for (const ch of text) {
        const code = encodeChar(ch);
        if (code === undefined || code > 255) return null;
        out.push(code);
      }
      return new Uint8Array(out);
    },
    spaceCode: encodeChar(' ') ?? null,
  };
}
