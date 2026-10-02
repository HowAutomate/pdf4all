import { StandardFonts } from 'pdf-lib';

export type FontFamily = 'sans' | 'serif' | 'mono';

export interface FontMatch {
  family: FontFamily;
  bold: boolean;
  italic: boolean;
}

/**
 * Guesses the look of a PDF font from its name, e.g. "ABCDEF+Calibri-Bold"
 * or "TimesNewRomanPS-ItalicMT". Embedded fonts are usually subsets that only
 * contain the glyphs already on the page, so new text has to be drawn in a
 * different font — this picks the closest of the standard ones.
 */
export function matchFont(name: string | undefined, cssFamily?: string): FontMatch {
  const n = (name ?? '').replace(/^[A-Z]{6}\+/, '');
  const bold = /bold|black|heavy|semibold|demibold|demi\b/i.test(n);
  const italic = /italic|oblique|-it\b|,it/i.test(n);
  let family: FontFamily = 'sans';
  if (/courier|mono|consol|menlo|typewriter/i.test(n) || cssFamily === 'monospace') family = 'mono';
  else if (/sans/i.test(n)) family = 'sans';
  else if (/times|serif|georgia|garamond|cambria|book|roman|minion|palatino|baskerville/i.test(n) || cssFamily === 'serif') family = 'serif';
  return { family, bold, italic };
}

export function standardFontFor({ family, bold, italic }: FontMatch): StandardFonts {
  if (family === 'serif') {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (family === 'mono') {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/** CSS font stack that looks like the standard PDF font, for the on-screen editor. */
export function cssFontFor({ family }: FontMatch): string {
  if (family === 'serif') return '"Times New Roman", Times, serif';
  if (family === 'mono') return '"Courier New", Courier, monospace';
  return 'Helvetica, Arial, sans-serif';
}
