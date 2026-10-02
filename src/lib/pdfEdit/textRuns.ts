/**
 * Turns pdf.js text items into editable "runs" — a stretch of text on one
 * baseline in one font, roughly what a person would call a line or phrase.
 *
 * pdf.js reports text in whatever pieces the PDF was written in: sometimes a
 * whole line, often a word or a single glyph run at a time. Editing those raw
 * pieces would mean clicking word by word, so neighbours that share a font,
 * size and baseline are merged.
 *
 * All coordinates here are PDF user space (points, y pointing up), which is
 * also what pdf-lib draws in — so a run can be covered and redrawn exactly.
 */

export interface RawTextItem {
  str: string;
  /** [a, b, c, d, e, f] — e/f is the baseline origin in user space. */
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
}

export interface FontStyle {
  ascent?: number | null;
  descent?: number | null;
  fontFamily?: string;
}

export interface TextRun {
  id: string;
  text: string;
  /** Left edge of the first glyph, user space. */
  x: number;
  /** Baseline, user space. */
  y: number;
  width: number;
  fontSize: number;
  /** pdf.js internal font id (look it up in page.commonObjs for the real name). */
  fontName: string;
  /** Glyph box above/below the baseline, as positive distances in points. */
  ascent: number;
  descent: number;
}

const DEFAULT_ASCENT = 0.8;
const DEFAULT_DESCENT = 0.2;

/** Font metrics can be missing, null or NaN for some embedded fonts. */
const metric = (v: number | null | undefined, fallback: number) => {
  const n = Math.abs(Number(v));
  return Number.isFinite(n) && n > 0 && n < 3 ? n : fallback;
};

export function groupTextRuns(
  items: RawTextItem[],
  styles: Record<string, FontStyle>,
  idPrefix = 'r',
): TextRun[] {
  const runs: TextRun[] = [];
  let cur: TextRun | null = null;
  // A whitespace-only item seen since the last glyph: it may be a normal word
  // space or a wide tab-like gap, so it never extends the run's width itself.
  let pendingSpace = false;

  for (const item of items) {
    if (typeof item.str !== 'string' || item.str === '') {
      if (item.hasEOL) cur = null;
      continue;
    }
    const [a, b, c, d, e, f] = item.transform;
    // Only upright, unmirrored horizontal text is editable; rotated or
    // skewed text would need its own maths and is rare in practice.
    if (Math.abs(b) > 1e-3 || Math.abs(c) > 1e-3 || a <= 0 || d <= 0) {
      cur = null;
      continue;
    }
    const size = Math.max(a, d);
    const style = styles[item.fontName] ?? {};
    const blank = item.str.trim() === '';

    if (cur) {
      const sameLine = Math.abs(f - cur.y) < size * 0.2;
      const gap = e - (cur.x + cur.width);
      const sameSize = Math.abs(cur.fontSize - size) < 0.5;
      // PDF writers (Chrome especially) often split one typeface into several
      // embedded subsets, so "06" can arrive as "0" in one font and "6" in
      // another. Glyphs that touch at the same size are treated as one run.
      const touching = Math.abs(gap) < size * 0.15 && !pendingSpace;
      const sameFamily = (styles[cur.fontName]?.fontFamily ?? '') === (style.fontFamily ?? '');
      const sameFont = sameSize && (cur.fontName === item.fontName || (touching && sameFamily));
      if (blank && sameLine) {
        pendingSpace = true;
        if (item.hasEOL) cur = null;
        continue;
      }
      // An explicit space item allows a wider gap (letter-spaced headings), but
      // never a tab-stop-sized one, which separates columns.
      const maxGap = size * (pendingSpace ? 1.2 : 0.6);
      if (!blank && sameLine && sameFont && gap > -size * 0.3 && gap < maxGap) {
        // pdf.js already emits space items where the PDF's spacing implies a
        // word break, so only add one ourselves for a clearly word-sized gap —
        // otherwise letter-spaced headings come out as "S Y S T E M".
        const needsSpace = (pendingSpace || gap > size * 0.5) && !cur.text.endsWith(' ') && !item.str.startsWith(' ');
        cur.text += (needsSpace ? ' ' : '') + item.str;
        cur.width = e + item.width - cur.x;
        pendingSpace = false;
        if (item.hasEOL) cur = null;
        continue;
      }
    }

    pendingSpace = false;
    if (blank) { cur = null; continue; }

    cur = {
      id: `${idPrefix}${runs.length}`,
      text: item.str,
      x: e,
      y: f,
      width: item.width,
      fontSize: size,
      fontName: item.fontName,
      ascent: metric(style.ascent, DEFAULT_ASCENT) * size,
      descent: metric(style.descent, DEFAULT_DESCENT) * size,
    };
    runs.push(cur);
    if (item.hasEOL) cur = null;
  }

  for (const r of runs) r.text = r.text.replace(/\s+$/, '');
  // Zero-width runs are invisible text (e.g. hidden OCR layers misreported) — not clickable.
  return runs.filter(r => r.text !== '' && r.width > 0.5);
}
