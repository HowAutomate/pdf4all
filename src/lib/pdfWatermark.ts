import {
  PDFDocument, PDFDict, PDFName, PDFArray, PDFStream, PDFRawStream, PDFRef, PDFNumber, PDFPage,
  decodePDFRawStream, type PDFObject,
} from 'pdf-lib';
import { parseContentStream, type ContentOp, type Operand } from './pdfEdit/contentStream';
import { parseToUnicode } from './pdfEdit/fontInfo';

/**
 * Finds and removes watermarks that live in a PDF as their own objects:
 *  - text stamped over every page ("CONFIDENTIAL", "DRAFT", a company name…),
 *    usually rotated and/or semi-transparent,
 *  - a logo or stamp image/form repeated on every page,
 *  - content tagged as a watermark (Acrobat's "Add Watermark" does this),
 *  - watermark annotations.
 *
 * Only painting instructions are cut out of the page; every other byte —
 * the real text, fonts, images and layout — stays exactly as it was. A
 * watermark that is part of a scanned image can't be separated this way.
 */

export type WatermarkKind = 'text' | 'image' | 'tagged' | 'annotation';

export interface WatermarkCandidate {
  id: string;
  kind: WatermarkKind;
  /** Human-readable description, e.g. 'Text "CONFIDENTIAL"'. */
  label: string;
  /** Pages (1-based) it appears on. */
  pages: number[];
  /** How many times it is drawn in total. */
  count: number;
  rotated: boolean;
  transparent: boolean;
  /** Strong signs of a watermark; pre-selected in the UI. */
  likely: boolean;
}

/* ---------- small helpers ---------- */

type M = [number, number, number, number, number, number];
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const num = (a: Operand | undefined) => (a && a.t === 'num' ? a.v : 0);
const nameOf = (a: Operand | undefined) => (a && a.t === 'name' ? a.v : '');

const SHOW = new Set(['Tj', 'TJ', "'", '"']);
const PAINT_PATH = new Set(['f', 'F', 'f*', 'S', 's', 'B', 'B*', 'b', 'b*']);

function streamBytes(s: PDFStream): Uint8Array {
  return s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents();
}

function pageContent(page: PDFPage): Uint8Array | null {
  const ctx = page.doc.context;
  const c = page.node.Contents();
  const streams: PDFStream[] = [];
  if (c instanceof PDFStream) streams.push(c);
  else if (c instanceof PDFArray) {
    for (const o of c.asArray()) {
      const s = o instanceof PDFRef ? ctx.lookup(o) : o;
      if (s instanceof PDFStream) streams.push(s);
    }
  }
  if (!streams.length) return null;
  const parts = streams.map(streamBytes);
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length + 1, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; out[o++] = 0x0a; }
  return out;
}

const latin1 = (b: Uint8Array) => Array.from(b, c => String.fromCharCode(c)).join('');
const hasWatermarkTag = (bytes: Uint8Array) => latin1(bytes).includes('/Watermark');

function pieceSays(piece: PDFDict, lookup: (o: PDFObject | undefined) => PDFObject | undefined): boolean {
  const ct = lookup(piece.get(PDFName.of('ADBE_CompoundType')));
  if (!(ct instanceof PDFDict)) return false;
  return lookup(ct.get(PDFName.of('Private')))?.toString() === '/Watermark';
}

function sub(res: PDFDict | undefined, key: string, lookup: (o: PDFObject | undefined) => PDFObject | undefined): PDFDict | undefined {
  const d = lookup(res?.get(PDFName.of(key)));
  return d instanceof PDFDict ? d : undefined;
}

/** Decodes shown text for labels: ToUnicode when present, else one byte per char. */
function makeDecoder(fontDict: PDFDict | undefined, lookup: (o: PDFObject | undefined) => PDFObject | undefined) {
  if (!fontDict) return (b: Uint8Array) => latin1(b);
  const twoByte = fontDict.get(PDFName.of('Subtype'))?.toString() === '/Type0';
  const tu = lookup(fontDict.get(PDFName.of('ToUnicode')));
  const map = tu instanceof PDFStream ? parseToUnicode(latin1(streamBytes(tu))) : null;
  return (b: Uint8Array) => {
    let s = '';
    for (let i = 0; i < b.length; i += twoByte ? 2 : 1) {
      const code = twoByte ? (b[i] << 8) | (b[i + 1] ?? 0) : b[i];
      s += map?.get(code) ?? (twoByte ? '' : String.fromCharCode(code));
    }
    return s;
  };
}

/* ---------- page walk ---------- */

/** One drawable thing on a page, and the byte ranges that paint it. */
interface Element {
  key: string;
  kind: WatermarkKind;
  label: string;
  rotated: boolean;
  transparent: boolean;
  tagged: boolean;
  /** Painting operators to cut (paths are replaced with "n", not cut). */
  cut: ContentOp[];
  /** Path-painting operators to neutralise. */
  neutralise: ContentOp[];
}

interface PageScan {
  bytes: Uint8Array | null;
  elements: Element[];
  annots: number[]; // indexes into /Annots that are watermark annotations
}

function scanPage(page: PDFPage): PageScan {
  const ctx = page.doc.context;
  const lookup = (o: PDFObject | undefined) => (o instanceof PDFRef ? ctx.lookup(o) : o);
  const res = page.node.Resources();
  const fonts = sub(res, 'Font', lookup);
  const xobjects = sub(res, 'XObject', lookup);
  const extg = sub(res, 'ExtGState', lookup);
  const props = sub(res, 'Properties', lookup);

  const annots: number[] = [];
  const annotArr = lookup(page.node.get(PDFName.of('Annots')));
  if (annotArr instanceof PDFArray) {
    annotArr.asArray().forEach((a, i) => {
      const d = lookup(a);
      if (d instanceof PDFDict && d.get(PDFName.of('Subtype'))?.toString() === '/Watermark') annots.push(i);
    });
  }

  const bytes = pageContent(page);
  if (!bytes) return { bytes, elements: [], annots };
  const ops = parseContentStream(bytes);

  const decoders = new Map<string, (b: Uint8Array) => string>();
  const decoderFor = (key: string) => {
    if (!decoders.has(key)) {
      const d = lookup(fonts?.get(PDFName.of(key)));
      decoders.set(key, makeDecoder(d instanceof PDFDict ? d : undefined, lookup));
    }
    return decoders.get(key)!;
  };

  interface GS { ctm: M; alpha: number; font: string }
  let gs: GS = { ctm: I, alpha: 1, font: '' };
  const stack: GS[] = [];
  let tm: M = I;
  const elements: Element[] = [];

  // Text is grouped by BT … ET block: a watermark is normally one block.
  let block: { text: string; ops: ContentOp[]; rotated: boolean; transparent: boolean; size: number } | null = null;
  // Marked content tagged as a watermark: everything painted inside is one element.
  const marks: boolean[] = [];
  let tagged: Element | null = null;
  let taggedDepth = -1;

  const rotatedNow = (m: M) => Math.abs(m[1]) > 1e-3 || Math.abs(m[2]) > 1e-3;

  for (const o of ops) {
    const a = o.args;
    switch (o.op) {
      case 'q': stack.push({ ...gs }); break;
      case 'Q': gs = stack.pop() ?? gs; break;
      case 'cm': gs.ctm = mul([num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4]), num(a[5])], gs.ctm); break;
      case 'gs': {
        const d = lookup(extg?.get(PDFName.of(nameOf(a[0]))));
        if (d instanceof PDFDict) {
          const ca = lookup(d.get(PDFName.of('ca')));
          const CA = lookup(d.get(PDFName.of('CA')));
          const v = ca instanceof PDFNumber ? ca.asNumber() : CA instanceof PDFNumber ? CA.asNumber() : null;
          if (v !== null) gs.alpha = v;
        }
        break;
      }
      case 'BDC': case 'BMC': {
        let isWm = false;
        if (o.op === 'BDC') {
          const p = a[1];
          if (p?.t === 'dict') isWm = hasWatermarkTag(bytes.subarray(o.start, o.end));
          else if (p?.t === 'name') {
            const d = lookup(props?.get(PDFName.of(p.v)));
            isWm = d instanceof PDFDict && d.get(PDFName.of('Subtype'))?.toString() === '/Watermark';
          }
        }
        marks.push(isWm);
        if (isWm && !tagged) {
          tagged = { key: 'tagged', kind: 'tagged', label: 'Tagged watermark', rotated: false, transparent: false, tagged: true, cut: [], neutralise: [] };
          taggedDepth = marks.length;
        }
        break;
      }
      case 'EMC':
        if (tagged && marks.length === taggedDepth) { elements.push(tagged); tagged = null; taggedDepth = -1; }
        marks.pop();
        break;
      case 'BT': tm = I; block = { text: '', ops: [], rotated: false, transparent: false, size: 0 }; break;
      case 'Tf': gs.font = nameOf(a[0]); if (block) block.size = Math.max(block.size, num(a[1])); break;
      case 'Tm': tm = [num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4]), num(a[5])]; break;
      case 'ET':
        if (block && block.ops.length && !tagged) {
          const text = block.text.replace(/\s+/g, ' ').trim();
          if (text) {
            elements.push({
              key: `text:${text}`, kind: 'text', label: `Text "${text.length > 60 ? text.slice(0, 57) + '…' : text}"`,
              rotated: block.rotated, transparent: block.transparent, tagged: false, cut: block.ops, neutralise: [],
            });
          }
        }
        block = null;
        break;
      case 'Do': {
        const xname = nameOf(a[0]);
        const raw = xobjects?.get(PDFName.of(xname));
        const x = lookup(raw);
        if (!(x instanceof PDFStream)) break;
        const isImage = x.dict.get(PDFName.of('Subtype'))?.toString() === '/Image';
        // Acrobat's watermarks are form XObjects tagged inside, or carrying
        // /PieceInfo << /ADBE_CompoundType << /Private /Watermark >> >>.
        const piece = lookup(x.dict.get(PDFName.of('PieceInfo')));
        const wm = !isImage && (hasWatermarkTag(streamBytes(x)) || (piece instanceof PDFDict && pieceSays(piece, lookup)));
        if (tagged) { tagged.cut.push(o); break; }
        const id = raw instanceof PDFRef ? `${raw.objectNumber}` : xname;
        let label: string;
        if (isImage) {
          const w = lookup(x.dict.get(PDFName.of('Width'))), h = lookup(x.dict.get(PDFName.of('Height')));
          label = `Image ${w instanceof PDFNumber ? w.asNumber() : '?'} × ${h instanceof PDFNumber ? h.asNumber() : '?'} px`;
        } else label = wm ? 'Watermark layer' : 'Graphic / stamp';
        elements.push({
          key: `${isImage ? 'img' : 'form'}:${id}`, kind: wm ? 'tagged' : 'image', label,
          rotated: rotatedNow(gs.ctm), transparent: gs.alpha < 0.999, tagged: wm, cut: [o], neutralise: [],
        });
        break;
      }
      case 'BI':
        if (tagged) tagged.cut.push(o);
        break;
      case 'sh':
        if (tagged) tagged.cut.push(o);
        break;
      default:
        if (SHOW.has(o.op)) {
          if (tagged) { tagged.cut.push(o); break; }
          if (block) {
            const strs = o.op === 'TJ' ? (a[0]?.t === 'arr' ? a[0].v : []) : o.op === '"' ? [a[2]] : [a[0]];
            const dec = decoderFor(gs.font);
            for (const s of strs) if (s?.t === 'str') block.text += dec(s.v);
            block.ops.push(o);
            if (rotatedNow(mul(tm, gs.ctm))) block.rotated = true;
            if (gs.alpha < 0.999) block.transparent = true;
          }
        } else if (PAINT_PATH.has(o.op) && tagged) {
          tagged.neutralise.push(o);
        }
    }
  }
  if (tagged) elements.push(tagged); // unbalanced marked content: still offer it
  return { bytes, elements, annots };
}

/* ---------- public API ---------- */

export async function findWatermarks(bytes: Uint8Array | ArrayBuffer): Promise<WatermarkCandidate[]> {
  const doc = await PDFDocument.load(bytes);
  return candidatesFrom(doc.getPages().map(scanPage));
}

function candidatesFrom(scans: PageScan[]): WatermarkCandidate[] {
  const total = scans.length;
  const groups = new Map<string, { el: Element; pages: Set<number>; count: number; rotated: boolean; transparent: boolean; tagged: boolean }>();
  scans.forEach((s, i) => {
    for (const el of s.elements) {
      const g = groups.get(el.key) ?? { el, pages: new Set<number>(), count: 0, rotated: false, transparent: false, tagged: false };
      g.pages.add(i + 1); g.count++;
      g.rotated ||= el.rotated; g.transparent ||= el.transparent; g.tagged ||= el.tagged;
      groups.set(el.key, g);
    }
  });

  const out: WatermarkCandidate[] = [];
  for (const [key, g] of groups) {
    const coverage = g.pages.size / total;
    const repeated = total >= 2 && g.pages.size >= 2 && coverage >= 0.6;
    const tiled = g.count >= 3 * g.pages.size; // same mark drawn many times per page
    const styled = g.rotated || g.transparent;
    // A text/image is offered when it looks like a watermark in at least one way.
    if (!(g.tagged || styled || repeated || tiled)) continue;
    // Repeating plain text in a multi-page document is usually a header or footer;
    // offer it, but don't pre-select it.
    const likely = g.tagged
      || (g.transparent && (g.rotated || tiled || repeated))
      || (g.rotated && (repeated || tiled));
    out.push({
      id: key, kind: g.el.kind, label: g.el.label, pages: [...g.pages].sort((a, b) => a - b), count: g.count,
      rotated: g.rotated, transparent: g.transparent, likely,
    });
  }
  const annotPages = scans.flatMap((s, i) => (s.annots.length ? [i + 1] : []));
  if (annotPages.length) {
    out.push({
      id: 'annot', kind: 'annotation', label: 'Watermark annotation', pages: annotPages,
      count: scans.reduce((n, s) => n + s.annots.length, 0), rotated: false, transparent: false, likely: true,
    });
  }
  const rank = (c: WatermarkCandidate) => (c.likely ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b) || b.count - a.count).slice(0, 15);
}

export interface RemoveResult { bytes: Uint8Array; removed: number; pages: number }

/** Removes the chosen candidates (by id) from every page. */
export async function removeWatermarks(bytes: Uint8Array | ArrayBuffer, ids: string[]): Promise<RemoveResult> {
  const doc = await PDFDocument.load(bytes);
  const want = new Set(ids);
  const ctx = doc.context;
  let removed = 0, pagesTouched = 0;
  for (const page of doc.getPages()) {
    const scan = scanPage(page);
    let touched = false;
    if (want.has('annot') && scan.annots.length) {
      const arr = ctx.lookup(page.node.get(PDFName.of('Annots')));
      if (arr instanceof PDFArray) {
        for (const i of [...scan.annots].sort((a, b) => b - a)) arr.remove(i);
        removed += scan.annots.length; touched = true;
      }
    }
    const chosen = scan.elements.filter(e => want.has(e.key));
    if (chosen.length && scan.bytes) {
      const edits: { start: number; end: number; with: string }[] = [];
      for (const e of chosen) {
        for (const o of e.cut) edits.push({ start: o.start, end: o.end, with: ' ' });
        for (const o of e.neutralise) edits.push({ start: o.start, end: o.end, with: ' n ' });
        removed++;
      }
      writeContent(doc, page, splice(scan.bytes, edits));
      touched = true;
    }
    if (touched) pagesTouched++;
  }
  return { bytes: await doc.save({ useObjectStreams: true }), removed, pages: pagesTouched };
}

function splice(src: Uint8Array, edits: { start: number; end: number; with: string }[]): Uint8Array {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  const parts: Uint8Array[] = [];
  let pos = 0;
  const enc = new TextEncoder();
  for (const e of sorted) {
    if (e.start < pos) continue;
    parts.push(src.subarray(pos, e.start), enc.encode(e.with));
    pos = e.end;
  }
  parts.push(src.subarray(pos));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function writeContent(doc: PDFDocument, page: PDFPage, bytes: Uint8Array) {
  const ctx = doc.context;
  page.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream(bytes)));
}
