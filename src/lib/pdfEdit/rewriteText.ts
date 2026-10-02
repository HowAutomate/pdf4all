import {
  PDFDict, PDFName, PDFArray, PDFStream, PDFRawStream, PDFRef, PDFHexString, PDFDocument, PDFPage,
  decodePDFRawStream, pushGraphicsState, popGraphicsState, concatTransformationMatrix, beginText, endText,
  setFontAndSize, setCharacterSpacing, setWordSpacing, setCharacterSqueeze, setTextRise, setTextMatrix,
  setFillingRgbColor, showText, PDFOperator, PDFOperatorNames, type PDFContext, type PDFObject,
} from 'pdf-lib';
import { parseContentStream, type ContentOp, type Operand } from './contentStream';
import { loadFontInfo, type FontInfo } from './fontInfo';
import type { RGB } from './applyEdits';

/* A PDF matrix [a b c d e f]; points are row vectors: p' = p × M. */
type M = [number, number, number, number, number, number];
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (m1: M, m2: M): M => [
  m1[0] * m2[0] + m1[1] * m2[2], m1[0] * m2[1] + m1[1] * m2[3],
  m1[2] * m2[0] + m1[3] * m2[2], m1[2] * m2[1] + m1[3] * m2[3],
  m1[4] * m2[0] + m1[5] * m2[2] + m2[4], m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
];
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** One text-showing operator (Tj, TJ, ', ") with where it starts and ends on the page. */
export interface ShownText {
  op: ContentOp;
  fontKey: string;
  font: FontInfo | null;
  size: number;
  tc: number; tw: number; th: number; rise: number;
  /** Text matrix and CTM in effect when the first glyph is drawn. */
  tm: M; ctm: M;
  fill: RGB | null;
  /** Baseline start / end in user space, and whether the text is upright. */
  x0: number; y0: number; x1: number;
  /** Start/end of the visible glyphs, ignoring leading/trailing spaces. */
  ink0: number; ink1: number;
  upright: boolean;
  /** Font size as it appears on the page (after scaling). */
  visualSize: number;
}

export interface PageText {
  bytes: Uint8Array;
  shown: ShownText[];
  fontDicts: Map<string, PDFDict>;
}

function contentBytes(page: PDFPage): Uint8Array | null {
  const ctx = page.doc.context;
  const contents = page.node.Contents();
  const streams: PDFStream[] = [];
  if (contents instanceof PDFStream) streams.push(contents);
  else if (contents instanceof PDFArray) {
    for (const o of contents.asArray()) {
      const s = o instanceof PDFRef ? ctx.lookup(o) : o;
      if (s instanceof PDFStream) streams.push(s);
    }
  }
  if (!streams.length) return null;
  const parts = streams.map(s => (s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents()));
  // Streams are concatenated with a separator, as the spec says they behave.
  const total = parts.reduce((n, p) => n + p.length + 1, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; out[o++] = 0x0a; }
  return out;
}

const num = (a: Operand | undefined) => (a && a.t === 'num' ? a.v : 0);

/** Walks a page's content and records every piece of text it shows. */
export function readPageText(page: PDFPage): PageText | null {
  const bytes = contentBytes(page);
  if (!bytes) return null;
  const ops = parseContentStream(bytes);
  const ctx = page.doc.context;
  const lookup = (r: PDFRef) => ctx.lookup(r) as PDFObject | undefined;

  const fontDicts = new Map<string, PDFDict>();
  const fontCache = new Map<string, FontInfo | null>();
  const res = page.node.Resources();
  const fonts = res?.lookup(PDFName.of('Font'));
  if (fonts instanceof PDFDict) {
    for (const [k, v] of fonts.entries()) {
      const d = v instanceof PDFRef ? ctx.lookup(v) : v;
      if (d instanceof PDFDict) fontDicts.set(k.decodeText(), d);
    }
  }
  const fontFor = (key: string) => {
    if (!fontCache.has(key)) {
      const d = fontDicts.get(key);
      let info: FontInfo | null = null;
      try { info = d ? loadFontInfo(d, lookup) : null; } catch { info = null; }
      fontCache.set(key, info);
    }
    return fontCache.get(key)!;
  };

  interface GS { ctm: M; fill: RGB | null; fontKey: string; size: number; tc: number; tw: number; th: number; tl: number; rise: number; cs: string }
  let gs: GS = { ctm: I, fill: [0, 0, 0], fontKey: '', size: 0, tc: 0, tw: 0, th: 1, tl: 0, rise: 0, cs: 'DeviceGray' };
  const stack: GS[] = [];
  let tm: M = I, tlm: M = I;
  const shown: ShownText[] = [];

  const show = (op: ContentOp, parts: Operand[]) => {
    const font = fontFor(gs.fontKey);
    const startTm = tm;
    // Text-space offsets (from the op's start) of the first and last visible glyph.
    let pos = 0, inkStart = NaN, inkEnd = NaN;
    for (const p of parts) {
      if (p.t === 'str') {
        if (!font) { record(op, font, startTm, NaN, NaN, NaN); return; }
        for (const code of font.codes(p.v)) {
          const w = font.width(code) / 1000;
          const adv = (w * gs.size + gs.tc + (!font.twoByte && code === 32 ? gs.tw : 0)) * gs.th;
          if (code !== font.spaceCode && !(font.spaceCode === null && code === 32)) {
            if (Number.isNaN(inkStart)) inkStart = pos;
            inkEnd = pos + w * gs.size * gs.th;
          }
          pos += adv;
        }
      } else if (p.t === 'num') {
        pos += (-p.v / 1000) * gs.size * gs.th;
      }
    }
    tm = mul([1, 0, 0, 1, pos, 0], tm);
    record(op, font, startTm, pos, inkStart, inkEnd);
  };

  const record = (op: ContentOp, font: FontInfo | null, startTm: M, end: number, inkStart: number, inkEnd: number) => {
    const full = mul(startTm, gs.ctm);
    const at = (tx: number) => apply(full, tx, gs.rise)[0];
    const [x0, y0] = apply(full, 0, gs.rise);
    const x1 = Number.isNaN(end) ? NaN : at(end);
    const upright = Math.abs(full[1]) < 1e-6 && Math.abs(full[2]) < 1e-6 && full[0] > 0 && full[3] > 0;
    // An op that shows only spaces has no ink; give it an empty span at its start.
    const ink0 = Number.isNaN(inkStart) ? (Number.isNaN(end) ? NaN : x0) : at(inkStart);
    const ink1 = Number.isNaN(inkEnd) ? ink0 : at(inkEnd);
    shown.push({
      op, fontKey: gs.fontKey, font, size: gs.size, tc: gs.tc, tw: gs.tw, th: gs.th, rise: gs.rise,
      tm: startTm, ctm: gs.ctm, fill: gs.fill, x0, y0, x1, ink0, ink1, upright, visualSize: gs.size * Math.abs(full[3]),
    });
  };

  for (const o of ops) {
    const a = o.args;
    switch (o.op) {
      case 'q': stack.push({ ...gs }); break;
      case 'Q': gs = stack.pop() ?? gs; break;
      case 'cm': gs.ctm = mul([num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4]), num(a[5])], gs.ctm); break;
      case 'BT': tm = I; tlm = I; break;
      case 'Tf': gs.fontKey = a[0]?.t === 'name' ? a[0].v : ''; gs.size = num(a[1]); break;
      case 'Tc': gs.tc = num(a[0]); break;
      case 'Tw': gs.tw = num(a[0]); break;
      case 'Tz': gs.th = num(a[0]) / 100; break;
      case 'TL': gs.tl = num(a[0]); break;
      case 'Ts': gs.rise = num(a[0]); break;
      case 'Td': tlm = mul([1, 0, 0, 1, num(a[0]), num(a[1])], tlm); tm = tlm; break;
      case 'TD': gs.tl = -num(a[1]); tlm = mul([1, 0, 0, 1, num(a[0]), num(a[1])], tlm); tm = tlm; break;
      case 'Tm': tlm = [num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4]), num(a[5])]; tm = tlm; break;
      case 'T*': tlm = mul([1, 0, 0, 1, 0, -gs.tl], tlm); tm = tlm; break;
      case 'Tj': show(o, a.slice(0, 1)); break;
      case "'": tlm = mul([1, 0, 0, 1, 0, -gs.tl], tlm); tm = tlm; show(o, a.slice(0, 1)); break;
      case '"': gs.tw = num(a[0]); gs.tc = num(a[1]); tlm = mul([1, 0, 0, 1, 0, -gs.tl], tlm); tm = tlm; show(o, a.slice(2, 3)); break;
      case 'TJ': show(o, a[0]?.t === 'arr' ? a[0].v : []); break;
      case 'g': gs.fill = [num(a[0]), num(a[0]), num(a[0])]; gs.cs = 'DeviceGray'; break;
      case 'rg': gs.fill = [num(a[0]), num(a[1]), num(a[2])]; gs.cs = 'DeviceRGB'; break;
      case 'k': {
        const [c, m, y, k] = [num(a[0]), num(a[1]), num(a[2]), num(a[3])];
        gs.fill = [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)]; gs.cs = 'DeviceCMYK'; break;
      }
      case 'cs': gs.cs = a[0]?.t === 'name' ? a[0].v : ''; gs.fill = gs.cs === 'DeviceGray' || gs.cs === 'DeviceRGB' ? [0, 0, 0] : null; break;
      case 'sc': case 'scn': {
        const nums = a.filter(x => x.t === 'num').map(x => (x as { v: number }).v);
        if (gs.cs === 'DeviceRGB' && nums.length === 3) gs.fill = [nums[0], nums[1], nums[2]];
        else if (gs.cs === 'DeviceGray' && nums.length === 1) gs.fill = [nums[0], nums[0], nums[0]];
        else gs.fill = null;
        break;
      }
    }
  }
  return { bytes, shown, fontDicts };
}

export interface LineEdit {
  /** Run geometry from pdf.js, user space. */
  x: number; y: number; width: number; fontSize: number;
  text: string;
  /** Sampled from the rendering — used when the PDF's own colour isn't known. */
  color: RGB;
}

export interface LinePlan {
  edit: LineEdit;
  ops: ShownText[];
}

/**
 * Finds the operators that drew exactly this line. Returns null when that
 * can't be done safely — e.g. one operator also draws text outside the line,
 * or part of the line was drawn somewhere we can't see (a form XObject) —
 * so the caller can fall back to covering the old text instead.
 */
export function matchLine(pt: PageText, e: LineEdit): ShownText[] | null {
  const tol = Math.max(1, e.fontSize * 0.15);
  const left = e.x - tol, right = e.x + e.width + tol;
  const sameLine = pt.shown.filter(s => Number.isFinite(s.y0) && Math.abs(s.y0 - e.y) < e.fontSize * 0.3);
  const inside: ShownText[] = [];
  for (const s of sameLine) {
    if (!s.upright || !Number.isFinite(s.x1)) {
      if (s.x0 > left && s.x0 < right) return null;
      continue;
    }
    // Judge by visible glyphs: a trailing space may extend past the line's end.
    const lo = Math.min(s.ink0, s.ink1), hi = Math.max(s.ink0, s.ink1);
    if (hi <= e.x + 0.01 || lo >= e.x + e.width - 0.01) {
      // Whitespace-only op inside the line (e.g. a separate space) — remove it too.
      if (hi - lo < 0.01 && lo >= left && lo <= right) inside.push(s);
      continue;
    }
    if (lo >= left && hi <= right) { inside.push(s); continue; }
    // Overlaps the line but also extends beyond it — can't cut it partially.
    if (Math.min(hi, right) - Math.max(lo, left) > tol) return null;
  }
  if (!inside.length) return null;
  // The matched operators must account for (nearly) the whole line.
  const covered = inside.reduce((n, s) => n + Math.min(Math.abs(s.x1 - s.x0), Math.abs(s.ink1 - s.ink0) + e.fontSize), 0);
  if (covered < e.width * 0.85) return null;
  return inside.sort((p, q) => p.x0 - q.x0);
}

/**
 * Builds operators that draw `text` with the same fonts, size, spacing and
 * position as the original line. Each character uses the first of the line's
 * fonts that contains it. Returns null if some character is in none of them.
 */
export function buildRedraw(ops: ShownText[], text: string, fallbackColor: RGB, ctx: PDFContext): PDFOperator[] | null {
  const first = ops[0];
  const fonts = ops.filter((s, i) => s.font && ops.findIndex(o => o.fontKey === s.fontKey) === i);
  // A null key marks a space the fonts can't draw: it becomes a positioning gap.
  const segments: { key: string | null; bytes: number[]; size: number }[] = [];
  for (const ch of text) {
    let placed = false;
    if (ch === ' ' && !fonts.some(f => f.font!.spaceCode !== null)) {
      segments.push({ key: null, bytes: [], size: first.size });
      continue;
    }
    for (const f of fonts) {
      const enc = f.font!.encode(ch);
      if (!enc) continue;
      const last = segments[segments.length - 1];
      if (last && last.key === f.fontKey) last.bytes.push(...enc);
      else segments.push({ key: f.fontKey, bytes: Array.from(enc), size: f.size });
      placed = true;
      break;
    }
    if (!placed) return null;
  }
  const fill = first.fill ?? fallbackColor;
  const out: PDFOperator[] = [
    pushGraphicsState(),
    concatTransformationMatrix(...first.ctm),
    beginText(),
    setCharacterSpacing(first.tc),
    setWordSpacing(first.tw),
    setCharacterSqueeze(first.th * 100),
    setTextRise(first.rise),
    setFillingRgbColor(fill[0], fill[1], fill[2]),
    setTextMatrix(...first.tm),
  ];
  let currentKey: string | null = null;
  for (const seg of segments) {
    if (seg.key === null) {
      // Quarter-em gap, the typical width of a space.
      out.push(PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [ctx.obj([-250])]));
      continue;
    }
    if (seg.key !== currentKey) { out.push(setFontAndSize(PDFName.of(seg.key), seg.size)); currentKey = seg.key; }
    out.push(showText(PDFHexString.of(seg.bytes.map(b => b.toString(16).padStart(2, '0')).join(''))));
  }
  out.push(endText(), popGraphicsState());
  return out;
}

/**
 * Removes the given operators from the page and replaces its content with
 * the result (one stream). Every other byte of the page is kept as-is.
 */
export function removeOps(doc: PDFDocument, page: PDFPage, pt: PageText, ops: ContentOp[]) {
  const ranges = ops.map(o => [o.start, o.end] as const).sort((p, q) => p[0] - q[0]);
  const parts: Uint8Array[] = [];
  let pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue; // same operator listed twice
    parts.push(pt.bytes.subarray(pos, s), new Uint8Array([0x20]));
    pos = e;
  }
  parts.push(pt.bytes.subarray(pos));
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  const ctx = doc.context;
  const ref = ctx.register(ctx.flateStream(out));
  // Wrapped in q … Q so anything drawn afterwards starts from a clean
  // graphics state even if the original content left one changed.
  page.node.set(PDFName.of('Contents'), ctx.obj([
    ctx.getPushGraphicsStateContentStream(), ref, ctx.getPopGraphicsStateContentStream(),
  ]));
}
