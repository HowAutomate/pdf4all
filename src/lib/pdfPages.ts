import { PDFDocument, StandardFonts, rgb, degrees, type PDFPage } from 'pdf-lib';

/* ── Organize: reorder, rotate, delete ─────────────────────────────── */

export interface PageOp {
  /** Zero-based index of the page in the original document. */
  src: number;
  /** Extra clockwise rotation to apply, in degrees (multiple of 90). */
  rotate: number;
}

/** Builds a new PDF containing `ops` pages, in order, with rotations applied. */
export async function organize(bytes: Uint8Array | ArrayBuffer, ops: PageOp[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, ops.map(o => o.src));
  copied.forEach((page, i) => {
    const r = (page.getRotation().angle + ops[i].rotate) % 360;
    page.setRotation(degrees((r + 360) % 360));
    out.addPage(page);
  });
  return out.save({ useObjectStreams: true });
}

/* ── Placing things as the reader sees the page ───────────────────── */

/** Visible page size (after /Rotate) in points. */
export function visualSize(page: PDFPage) {
  const box = page.getCropBox();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  return rot === 90 || rot === 270 ? { w: box.height, h: box.width, rot } : { w: box.width, h: box.height, rot };
}

/**
 * Converts a point measured on the page as displayed (origin bottom-left of
 * what the reader sees) into the page's own coordinates, and gives the text
 * rotation that makes drawn text appear upright.
 */
export function visualToUser(page: PDFPage, vx: number, vy: number): { x: number; y: number; rotate: number } {
  const box = page.getCropBox();
  const { rot } = visualSize(page);
  const W = box.width, H = box.height;
  let x = vx, y = vy;
  if (rot === 90) { x = W - vy; y = vx; }
  else if (rot === 180) { x = W - vx; y = H - vy; }
  else if (rot === 270) { x = vy; y = H - vx; }
  return { x: box.x + x, y: box.y + y, rotate: rot };
}

/* ── Page numbers ──────────────────────────────────────────────────── */

export type Position = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
export type NumberFormat = 'n' | 'page-n' | 'page-n-of-total' | 'n-slash-total';

export interface PageNumberOptions {
  position: Position;
  format: NumberFormat;
  /** Number printed on the first numbered page. */
  start: number;
  /** Leave the first page (e.g. a cover) unnumbered; numbering starts on page 2. */
  skipFirst: boolean;
  fontSize: number;
  /** Distance from the page edge, in points. */
  margin: number;
}

export function formatNumber(fmt: NumberFormat, n: number, total: number): string {
  switch (fmt) {
    case 'page-n': return `Page ${n}`;
    case 'page-n-of-total': return `Page ${n} of ${total}`;
    case 'n-slash-total': return `${n} / ${total}`;
    default: return String(n);
  }
}

export async function addPageNumbers(bytes: Uint8Array | ArrayBuffer, o: PageNumberOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const numbered = o.skipFirst ? pages.length - 1 : pages.length;
  const total = o.start + numbered - 1;
  pages.forEach((page, i) => {
    if (o.skipFirst && i === 0) return;
    const n = o.start + (o.skipFirst ? i - 1 : i);
    const text = formatNumber(o.format, n, total);
    const tw = font.widthOfTextAtSize(text, o.fontSize);
    const { w, h } = visualSize(page);
    const [vert, horiz] = o.position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
    const vx = horiz === 'left' ? o.margin : horiz === 'right' ? w - o.margin - tw : (w - tw) / 2;
    const vy = vert === 'bottom' ? o.margin : h - o.margin - o.fontSize;
    const p = visualToUser(page, vx, vy);
    page.drawText(text, { x: p.x, y: p.y, size: o.fontSize, font, color: rgb(0.2, 0.2, 0.2), rotate: degrees(p.rotate) });
  });
  return doc.save({ useObjectStreams: true });
}

/* ── Watermark ─────────────────────────────────────────────────────── */

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  /** 0–1 */
  opacity: number;
  /** Degrees, counter-clockwise as the reader sees it (45 = rising diagonal). */
  angle: number;
  color: [number, number, number];
  /** One mark in the middle, or a repeating pattern across the page. */
  layout: 'center' | 'tile';
  bold: boolean;
}

export async function addWatermark(bytes: Uint8Array | ArrayBuffer, o: WatermarkOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(o.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  const tw = font.widthOfTextAtSize(o.text, o.fontSize);
  const th = font.heightAtSize(o.fontSize);
  const rad = (o.angle * Math.PI) / 180;
  for (const page of doc.getPages()) {
    const { w, h } = visualSize(page);
    // Centre of each mark, in visual coordinates.
    const centres: [number, number][] = [];
    if (o.layout === 'center') centres.push([w / 2, h / 2]);
    else {
      const stepX = tw * Math.abs(Math.cos(rad)) + o.fontSize * 3, stepY = tw * Math.abs(Math.sin(rad)) + o.fontSize * 3;
      for (let y = stepY / 2; y < h + stepY; y += Math.max(stepY, o.fontSize * 4)) {
        for (let x = stepX / 2; x < w + stepX; x += Math.max(stepX, o.fontSize * 4)) centres.push([x, y]);
      }
    }
    for (const [cx, cy] of centres) {
      // drawText rotates around its start point, so start half the text
      // length back along the angle (and half the height down) from the centre.
      const sx = cx - (tw / 2) * Math.cos(rad) + (th / 2) * Math.sin(rad);
      const sy = cy - (tw / 2) * Math.sin(rad) - (th / 2) * Math.cos(rad);
      const p = visualToUser(page, sx, sy);
      page.drawText(o.text, {
        x: p.x, y: p.y, size: o.fontSize, font, color: rgb(...o.color), opacity: o.opacity,
        rotate: degrees(p.rotate + o.angle),
      });
    }
  }
  return doc.save({ useObjectStreams: true });
}
