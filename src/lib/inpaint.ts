import { contextWindow, dilate, maskRegions } from './inpaintRegions';

/*
 * MI-GAN (Picsart AI Research, MIT licence), "pipeline v2" ONNX export:
 * takes the picture (uint8, 1×3×H×W) and a mask (uint8, 1×1×H×W, 0 = fill
 * this, 255 = keep) at any size, and returns the picture with only the
 * masked pixels replaced. It runs in a worker (inpaint.worker.ts).
 */
let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let failReady: ((e: Error) => void) | null = null;
const progressListeners = new Set<(p: number) => void>();
const pending = new Map<number, { resolve: (d: Uint8Array) => void; reject: (e: Error) => void }>();
let nextId = 1;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./inpaint.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'progress') progressListeners.forEach(f => f(m.p));
      else if (m.type === 'result') { pending.get(m.id)?.resolve(m.data); pending.delete(m.id); }
      else if (m.type === 'error' && m.id !== undefined) { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); }
    };
    // A crashed worker (e.g. out of memory) fails everything waiting on it;
    // the next attempt starts a fresh one.
    worker.onerror = e => {
      const err = new Error(e.message || 'The AI stopped unexpectedly');
      pending.forEach(p => p.reject(err)); pending.clear();
      failReady?.(err);
      worker?.terminate(); worker = null; ready = null;
    };
  }
  return worker;
}

/** Downloads (once, then browser-cached) and starts the model. */
export function loadInpaintModel(onProgress?: (fraction: number) => void): Promise<void> {
  if (onProgress) progressListeners.add(onProgress);
  if (!ready) {
    const w = getWorker();
    ready = new Promise<void>((resolve, reject) => {
      failReady = reject;
      const on = (e: MessageEvent) => {
        if (e.data.type === 'ready') { w.removeEventListener('message', on); resolve(); }
        else if (e.data.type === 'error' && e.data.id === undefined) { w.removeEventListener('message', on); reject(new Error(e.data.message)); }
      };
      w.addEventListener('message', on);
      w.postMessage({ type: 'load' });
    });
    ready.catch(() => { ready = null; });
  }
  const r = ready;
  r.finally(() => { if (onProgress) progressListeners.delete(onProgress); }).catch(() => {});
  return r;
}

function runModel(image: Uint8Array, mask: Uint8Array, w: number, h: number): Promise<Uint8Array> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ type: 'run', id, image, mask, w, h }, [image.buffer, mask.buffer]);
  });
}

/**
 * Fills the painted pixels (hole[i] = 1) of an image in place.
 * `onRegion` reports progress as (done, total) areas.
 */
export async function inpaint(img: ImageData, hole: Uint8Array, onRegion?: (done: number, total: number) => void): Promise<void> {
  await loadInpaintModel();
  const { width: W, height: H, data } = img;
  // A few extra pixels catch the watermark's anti-aliased edge and glow; the
  // same ring (outside what the user painted) is used to blend the seam.
  const ring = Math.max(4, Math.round(Math.max(W, H) / 250));
  const grown = dilate(hole, W, H, ring);
  const regions = maskRegions(grown, W, H);
  for (let r = 0; r < regions.length; r++) {
    const win = contextWindow(regions[r], W, H);
    const n = win.w * win.h;
    const chw = new Uint8Array(3 * n), m = new Uint8Array(n);
    for (let y = 0; y < win.h; y++) {
      for (let x = 0; x < win.w; x++) {
        const s = (win.y + y) * W + win.x + x, d = y * win.w + x;
        chw[d] = data[s * 4]; chw[n + d] = data[s * 4 + 1]; chw[2 * n + d] = data[s * 4 + 2];
        m[d] = grown[s] ? 0 : 255;
      }
    }
    const res = await runModel(chw, m.slice(), win.w, win.h);
    const dist = distanceInside(m, win.w, win.h);
    for (let y = 0; y < win.h; y++) {
      for (let x = 0; x < win.w; x++) {
        const d = y * win.w + x;
        if (m[d]) continue; // only painted pixels change
        const s = ((win.y + y) * W + win.x + x) * 4;
        // Fade from the original picture to the fill across the outer ring, so
        // a slight colour difference doesn't show as a hard-edged box.
        const a = Math.min(1, dist[d] / ring);
        for (let k = 0; k < 3; k++) data[s + k] = Math.round(a * res[k * n + d] + (1 - a) * data[s + k]);
      }
    }
    onRegion?.(r + 1, regions.length);
  }
}

/** For each fill pixel (mask 0), distance in px to the nearest kept pixel (chamfer approximation). */
function distanceInside(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9, D1 = 1, D2 = Math.SQRT2;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? INF : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + D1, at(x, y - 1) + D1, at(x - 1, y - 1) + D2, at(x + 1, y - 1) + D2);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + D1, at(x, y + 1) + D1, at(x + 1, y + 1) + D2, at(x - 1, y + 1) + D2);
  }
  return d;
}
