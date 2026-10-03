/**
 * Passport / ID photo framing and print-sheet layout. Pure functions.
 */

export interface PhotoSpec {
  id: string;
  label: string;
  /** Finished photo size in millimetres. */
  wMm: number; hMm: number;
  /** Share of the photo height the head (crown to chin) should fill. */
  headFraction: number;
  /** Gap above the crown, as a share of the photo height. */
  topMargin: number;
}

export const SPECS: PhotoSpec[] = [
  { id: 'in-35x45', label: '35 × 45 mm — passport size (India)', wMm: 35, hMm: 45, headFraction: 0.74, topMargin: 0.09 },
  { id: '2x2', label: '51 × 51 mm — 2 × 2 inch (US passport, Indian visa)', wMm: 51, hMm: 51, headFraction: 0.6, topMargin: 0.12 },
  { id: 'stamp', label: '25 × 35 mm — stamp size', wMm: 25, hMm: 35, headFraction: 0.7, topMargin: 0.1 },
];

export const DPI = 300;
export const mmToPx = (mm: number, dpi = DPI) => Math.round((mm / 25.4) * dpi);

/** Crop rectangle in source-image pixels. */
export interface Crop { x: number; y: number; w: number; h: number }

/** Left/right extent of the subject in one row of the mask, or null. */
function rowExtent(alpha: Uint8ClampedArray, w: number, y: number, threshold = 128): [number, number] | null {
  let lo = -1, hi = -1;
  const off = y * w;
  for (let x = 0; x < w; x++) if (alpha[off + x] >= threshold) { if (lo < 0) lo = x; hi = x; }
  return lo < 0 ? null : [lo, hi];
}

export interface Head { top: number; height: number; cx: number }

/** Face box in image pixels (from the face detector). */
export interface FaceBox { x1: number; y1: number; x2: number; y2: number }

/**
 * UltraFace output → the main face: of all detections above `threshold`,
 * the largest box (the person posing, not someone in the background).
 * Boxes are normalised [x1, y1, x2, y2]; returned in image pixels.
 */
export function pickFace(scores: Float32Array, boxes: Float32Array, w: number, h: number, threshold = 0.7): FaceBox | null {
  let best: FaceBox | null = null, bestArea = 0;
  for (let i = 0; i < scores.length / 2; i++) {
    if (scores[i * 2 + 1] < threshold) continue;
    const b = { x1: boxes[i * 4] * w, y1: boxes[i * 4 + 1] * h, x2: boxes[i * 4 + 2] * w, y2: boxes[i * 4 + 3] * h };
    const area = (b.x2 - b.x1) * (b.y2 - b.y1);
    if (area > bestArea) { bestArea = area; best = b; }
  }
  return best;
}

/**
 * Head position from a detected face plus the subject mask: the chin is the
 * bottom of the face box; the crown is the highest masked pixel directly
 * above the face (so hair counts, but a tall object elsewhere doesn't).
 */
export function headFromFace(alpha: Uint8ClampedArray, w: number, h: number, face: FaceBox): Head {
  const x1 = Math.max(0, Math.round(face.x1)), x2 = Math.min(w - 1, Math.round(face.x2));
  let crown = -1;
  for (let y = 0; y < Math.round(face.y1) && crown < 0; y++) {
    for (let x = x1; x <= x2; x++) if (alpha[y * w + x] >= 128) { crown = y; break; }
  }
  const faceH = face.y2 - face.y1;
  if (crown < 0) crown = Math.max(0, face.y1 - faceH * 0.3);
  // UltraFace boxes end slightly above the chin; extend a little.
  const chin = Math.min(h - 1, face.y2 + faceH * 0.05);
  return { top: crown, height: chin - crown, cx: (face.x1 + face.x2) / 2 };
}

/** Frames the photo around the head according to the spec. */
export function cropForHead(head: Head, spec: PhotoSpec): Crop {
  const cropH = head.height / spec.headFraction;
  const cropW = cropH * (spec.wMm / spec.hMm);
  return { x: head.cx - cropW / 2, y: head.top - cropH * spec.topMargin, w: cropW, h: cropH };
}

/**
 * Fallback when no face is found: crown = top of the mask; head width = mask
 * width a little below eye level, refined a few times since a head is ~1.35×
 * taller than wide. Returns null if there is no subject.
 */
export function autoCrop(alpha: Uint8ClampedArray, w: number, h: number, spec: PhotoSpec): { crop: Crop; head: Head } | null {
  let top = -1;
  for (let y = 0; y < h && top < 0; y++) if (rowExtent(alpha, w, y)) top = y;
  if (top < 0) return null;

  // Initial guess: head height ≈ 18% of the image height, then refine.
  let headH = h * 0.18, cx = w / 2;
  for (let i = 0; i < 4; i++) {
    const y = Math.min(h - 1, Math.round(top + headH * 0.45));
    const ext = rowExtent(alpha, w, y);
    if (!ext) break;
    const headW = ext[1] - ext[0] + 1;
    cx = (ext[0] + ext[1]) / 2;
    headH = Math.min(h - top, headW * 1.35);
  }

  const head = { top, height: headH, cx };
  return { crop: cropForHead(head, spec), head };
}

/** Applies user adjustments: zoom (>1 = tighter) and offsets as fractions of the crop. */
export function adjustCrop(base: Crop, zoom: number, dx: number, dy: number): Crop {
  const w = base.w / zoom, h = base.h / zoom;
  const cx = base.x + base.w / 2 + dx * base.w, cy = base.y + base.h / 2 + dy * base.h;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export interface SheetLayout {
  sheetW: number; sheetH: number;
  cols: number; rows: number;
  /** Top-left corners of each photo, in sheet pixels. */
  cells: { x: number; y: number }[];
}

/** Packs as many photos as fit on a sheet (pixels), with gaps for cutting. */
// Defaults (at 300 DPI: ~1.7 mm margin, ~1.35 mm gap) fit the standard 8 photos
// of 35×45 mm on 4×6 inch paper, as photo studios print them.
export function layoutSheet(sheetW: number, sheetH: number, photoW: number, photoH: number, margin = 20, gap = 16): SheetLayout {
  const cols = Math.max(0, Math.floor((sheetW - 2 * margin + gap) / (photoW + gap)));
  const rows = Math.max(0, Math.floor((sheetH - 2 * margin + gap) / (photoH + gap)));
  const usedW = cols * photoW + (cols - 1) * gap, usedH = rows * photoH + (rows - 1) * gap;
  const ox = (sheetW - usedW) / 2, oy = (sheetH - usedH) / 2;
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: Math.round(ox + c * (photoW + gap)), y: Math.round(oy + r * (photoH + gap)) });
  return { sheetW, sheetH, cols, rows, cells };
}

export const SHEETS = [
  { id: '4x6', label: '4 × 6 inch photo paper', wIn: 6, hIn: 4 },
  { id: 'a4', label: 'A4 sheet', wIn: 8.27, hIn: 11.69 },
] as const;
