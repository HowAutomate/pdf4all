import {
  PDFDocument, PDFDict, PDFName, PDFArray, PDFRawStream, PDFRef, PDFNumber, PDFStream,
  decodePDFRawStream, type PDFObject,
} from 'pdf-lib';

/**
 * Finds the photos and scans inside a PDF and re-encodes them smaller, while
 * leaving text, vector graphics and layout untouched — so text stays sharp
 * and selectable. Images are only replaced when the new version is clearly
 * smaller.
 *
 * Decoding/encoding pixels needs a canvas, so it is injected (`Reencoder`):
 * the browser implementation lives in ./browserReencoder.ts.
 */

export type ImageSource =
  | { kind: 'jpeg'; bytes: Uint8Array; width: number; height: number }
  | { kind: 'raw'; width: number; height: number; channels: 1 | 3; data: Uint8Array };

export interface Encoded { bytes: Uint8Array; width: number; height: number }

/** Re-encode to JPEG, scaled so the longer side is at most `maxSide`. */
export type Reencoder = (src: ImageSource, maxSide: number, quality: number) => Promise<Encoded | null>;

export interface ImageLevel { quality: number; maxSide: number }

export interface ImageReport { found: number; recompressed: number; skipped: number; savedBytes: number }

const name = (o: PDFObject | undefined) => (o instanceof PDFName ? o.decodeText() : undefined);

interface Candidate { ref: PDFRef; stream: PDFRawStream; src: ImageSource; comps: 1 | 3 }

/** Reverses PNG predictors (Predictor 10–15), applied per row before Flate. */
export function unpredictPng(data: Uint8Array, width: number, colors: number, bpc = 8): Uint8Array {
  const bpp = Math.max(1, Math.round((colors * bpc) / 8));
  const rowLen = Math.ceil((width * colors * bpc) / 8);
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLen + 1)];
    const inOff = r * (rowLen + 1) + 1, o = r * rowLen, up = o - rowLen;
    for (let i = 0; i < rowLen; i++) {
      const x = data[inOff + i];
      const a = i >= bpp ? out[o + i - bpp] : 0;
      const b = r > 0 ? out[up + i] : 0;
      const c = r > 0 && i >= bpp ? out[up + i - bpp] : 0;
      let v: number;
      switch (type) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: throw new Error(`Unknown PNG filter ${type}`);
      }
      out[o + i] = v & 0xff;
    }
  }
  return out;
}

/** Number of colour components of an image colour space we can re-encode, else null. */
function components(cs: PDFObject | undefined, lookup: (o: PDFObject | undefined) => PDFObject | undefined): 1 | 3 | null {
  const n = name(cs);
  if (n === 'DeviceRGB' || n === 'CalRGB') return 3;
  if (n === 'DeviceGray' || n === 'CalGray') return 1;
  if (cs instanceof PDFArray) {
    const kind = name(cs.get(0));
    if (kind === 'CalRGB') return 3;
    if (kind === 'CalGray') return 1;
    if (kind === 'ICCBased') {
      const icc = lookup(cs.get(1));
      const nObj = icc instanceof PDFStream ? icc.dict.get(PDFName.of('N')) : undefined;
      const N = nObj instanceof PDFNumber ? nObj.asNumber() : 0;
      return N === 3 ? 3 : N === 1 ? 1 : null;
    }
  }
  return null; // CMYK, Indexed, Lab, Separation… left alone
}

/** Collects every image XObject reachable from the pages (including inside forms). */
function collectImages(doc: PDFDocument): Candidate[] {
  const ctx = doc.context;
  const lookup = (o: PDFObject | undefined) => (o instanceof PDFRef ? ctx.lookup(o) : o);
  const seen = new Set<string>();
  const out: Candidate[] = [];

  const visitResources = (res: PDFObject | undefined, depth: number) => {
    const r = lookup(res);
    if (!(r instanceof PDFDict) || depth > 8) return;
    const xobjs = lookup(r.get(PDFName.of('XObject')));
    if (!(xobjs instanceof PDFDict)) return;
    for (const [, v] of xobjs.entries()) {
      if (!(v instanceof PDFRef)) continue;
      const key = v.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const s = ctx.lookup(v);
      if (!(s instanceof PDFRawStream)) continue;
      const d = s.dict;
      const subtype = name(d.get(PDFName.of('Subtype')));
      if (subtype === 'Form') { visitResources(d.get(PDFName.of('Resources')), depth + 1); continue; }
      if (subtype !== 'Image') continue;
      const cand = toCandidate(v, s, lookup);
      if (cand) out.push(cand);
    }
  };
  for (const page of doc.getPages()) visitResources(page.node.Resources(), 0);
  return out;
}

function toCandidate(ref: PDFRef, s: PDFRawStream, lookup: (o: PDFObject | undefined) => PDFObject | undefined): Candidate | null {
  const d = s.dict;
  const num = (k: string) => { const o = lookup(d.get(PDFName.of(k))); return o instanceof PDFNumber ? o.asNumber() : undefined; };
  const width = num('Width'), height = num('Height');
  if (!width || !height || width * height < 64 * 64) return null; // icons aren't worth it
  if (d.get(PDFName.of('ImageMask')) || d.get(PDFName.of('Decode')) || d.get(PDFName.of('Mask'))) return null;
  if ((num('BitsPerComponent') ?? 8) !== 8) return null;
  const colorSpace = d.get(PDFName.of('ColorSpace'));
  const comps = components(lookup(colorSpace), lookup);
  if (!comps) return null;

  const filterObj = lookup(d.get(PDFName.of('Filter')));
  const filters = filterObj instanceof PDFArray ? filterObj.asArray().map(o => name(lookup(o))) : [name(filterObj)];
  if (filters.length !== 1) return null;

  if (filters[0] === 'DCTDecode') {
    return { ref, stream: s, comps, src: { kind: 'jpeg', bytes: s.contents, width, height } };
  }
  if (filters[0] === 'FlateDecode') {
    const parms = lookup(d.get(PDFName.of('DecodeParms')));
    let predictor = 1;
    if (parms instanceof PDFDict) {
      const p = lookup(parms.get(PDFName.of('Predictor')));
      predictor = p instanceof PDFNumber ? p.asNumber() : 1;
    }
    if (predictor !== 1 && predictor < 10) return null; // TIFF predictor: rare, skip
    let data: Uint8Array;
    try {
      // pdf-lib inflates but doesn't undo predictors; strip DecodeParms first.
      const copy = PDFRawStream.of(d.clone(), s.contents);
      copy.dict.delete(PDFName.of('DecodeParms'));
      data = decodePDFRawStream(copy).decode();
      if (predictor >= 10) data = unpredictPng(data, width, comps);
    } catch { return null; }
    if (data.length < width * height * comps) return null;
    return { ref, stream: s, comps, src: { kind: 'raw', width, height, channels: comps, data: data.subarray(0, width * height * comps) } };
  }
  return null; // JPX, JBIG2, CCITT (already efficient for scans), LZW…
}

/**
 * Re-encodes images in place on `doc`. An image is only replaced if the new
 * stream is at least 10% smaller; otherwise the original is kept.
 */
export async function recompressImages(doc: PDFDocument, level: ImageLevel, reencode: Reencoder): Promise<ImageReport> {
  const report: ImageReport = { found: 0, recompressed: 0, skipped: 0, savedBytes: 0 };
  const cands = collectImages(doc);
  report.found = cands.length;
  for (const c of cands) {
    let enc: Encoded | null = null;
    try { enc = await reencode(c.src, level.maxSide, level.quality); } catch { enc = null; }
    const before = c.stream.contents.length;
    if (!enc || enc.bytes.length > before * 0.9) { report.skipped++; continue; }
    const dict = c.stream.dict.clone();
    dict.set(PDFName.of('Width'), PDFNumber.of(enc.width));
    dict.set(PDFName.of('Height'), PDFNumber.of(enc.height));
    dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
    dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
    dict.delete(PDFName.of('DecodeParms'));
    dict.delete(PDFName.of('Length'));
    // Browsers always write 3-channel JPEGs, so grey sources become RGB.
    if (c.comps === 1) dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
    doc.context.assign(c.ref, PDFRawStream.of(dict, enc.bytes));
    report.recompressed++;
    report.savedBytes += before - enc.bytes.length;
  }
  return report;
}

/** Same as saving normally, but never larger than necessary: object streams on. */
export const saveSmall = (doc: PDFDocument) => doc.save({ useObjectStreams: true, addDefaultPage: false });
