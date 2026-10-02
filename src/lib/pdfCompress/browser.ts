import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { recompressImages, saveSmall, type Reencoder, type ImageLevel, type ImageReport } from './images';
import { fitToKb } from '@/lib/fitToKb';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('JPEG encode failed'))), 'image/jpeg', q));

/** Canvas-based JPEG re-encoder for images pulled out of a PDF. */
export const browserReencoder: Reencoder = async (src, maxSide, quality) => {
  let w = src.width, h = src.height;
  let source: CanvasImageSource;
  if (src.kind === 'jpeg') {
    const bmp = await createImageBitmap(new Blob([src.bytes], { type: 'image/jpeg' }));
    w = bmp.width; h = bmp.height; source = bmp;
  } else {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const d = img.data, s = src.data;
    for (let i = 0, j = 0; i < w * h; i++) {
      if (src.channels === 3) { d[i * 4] = s[j++]; d[i * 4 + 1] = s[j++]; d[i * 4 + 2] = s[j++]; }
      else { const v = s[j++]; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    source = c;
  }
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * scale));
  out.height = Math.max(1, Math.round(h * scale));
  const octx = out.getContext('2d')!;
  octx.fillStyle = '#fff'; octx.fillRect(0, 0, out.width, out.height);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(source, 0, 0, out.width, out.height);
  if ('close' in source) (source as ImageBitmap).close();
  const blob = await toBlob(out, quality);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: out.width, height: out.height };
};

/** Text-preserving levels, gentlest first. */
export const LEVELS: Record<'light' | 'medium' | 'strong', ImageLevel> = {
  light: { quality: 0.8, maxSide: 2200 },
  medium: { quality: 0.65, maxSide: 1600 },
  strong: { quality: 0.45, maxSide: 1100 },
};
/** Extra steps tried only when chasing a size target. */
const TARGET_LADDER: ImageLevel[] = [LEVELS.medium, LEVELS.strong, { quality: 0.35, maxSide: 900 }, { quality: 0.3, maxSide: 700 }];

export interface Compressed { bytes: Uint8Array; report: ImageReport; textKept: boolean }

/** Recompresses images and re-saves compactly. Text and vectors are untouched. */
export async function compressKeepText(original: Uint8Array, level: ImageLevel): Promise<Compressed> {
  const doc = await PDFDocument.load(original, { updateMetadata: false });
  const report = await recompressImages(doc, level, browserReencoder);
  return { bytes: await saveSmall(doc), report, textKept: true };
}

/**
 * Smallest text-preserving result that fits the target, or the smallest one
 * overall if none does (caller decides whether to fall back to rasterising).
 */
export async function compressKeepTextToTarget(original: Uint8Array, targetBytes: number, onStep?: (i: number, n: number) => void) {
  let best: Compressed | null = null;
  for (let i = 0; i < TARGET_LADDER.length; i++) {
    onStep?.(i + 1, TARGET_LADDER.length);
    const r = await compressKeepText(original, TARGET_LADDER[i]);
    if (!best || r.bytes.length < best.bytes.length) best = r;
    if (r.bytes.length <= targetBytes) return { result: r, fits: true };
  }
  return { result: best!, fits: false };
}

/**
 * Last resort for a hard size limit: every page becomes one JPEG image. Hits
 * almost any target, but the text is no longer selectable or searchable.
 */
export async function rasterizeToTarget(original: Uint8Array, targetBytes: number, onProgress?: (msg: string) => void): Promise<{ bytes: Uint8Array; fits: boolean } | null> {
  const pdf = await pdfjs.getDocument({ data: original.slice(), isEvalSupported: false }).promise;
  try {
    const n = pdf.numPages;
    if (n > 100) return null;
    // Keep memory sane on long documents.
    const dpi = n <= 10 ? 150 : n <= 30 ? 110 : 80;
    const pages: { canvas: HTMLCanvasElement; wPt: number; hPt: number }[] = [];
    for (let i = 1; i <= n; i++) {
      onProgress?.(`Rendering page ${i} of ${n}…`);
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: dpi / 72 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
      pages.push({ canvas, wPt: base.width, hPt: base.height });
    }

    const scratch = document.createElement('canvas');
    const sctx = scratch.getContext('2d')!;
    const encodePage = async (p: typeof pages[number], scale: number, q: number) => {
      scratch.width = Math.max(1, Math.round(p.canvas.width * scale));
      scratch.height = Math.max(1, Math.round(p.canvas.height * scale));
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(p.canvas, 0, 0, scratch.width, scratch.height);
      return toBlob(scratch, q);
    };
    const overhead = 1500 + n * 700;
    const build = async (budget: number) => {
      onProgress?.('Finding the best quality for your size limit…');
      const fit = await fitToKb(async (s, q) => {
        let total = overhead;
        for (const p of pages) total += (await encodePage(p, s, q)).size;
        return total;
      }, budget);
      const doc = await PDFDocument.create();
      for (const p of pages) {
        const jpg = await doc.embedJpg(new Uint8Array(await (await encodePage(p, fit.scale, fit.quality)).arrayBuffer()));
        doc.addPage([p.wPt, p.hPt]).drawImage(jpg, { x: 0, y: 0, width: p.wPt, height: p.hPt });
      }
      return saveSmall(doc);
    };
    let bytes = await build(targetBytes);
    // The size estimate can be a little off; tighten once if needed.
    if (bytes.length > targetBytes) bytes = await build(targetBytes - (bytes.length - targetBytes) - 2048);
    return { bytes, fits: bytes.length <= targetBytes };
  } finally {
    pdf.destroy();
  }
}
