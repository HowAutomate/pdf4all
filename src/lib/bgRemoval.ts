import * as ort from 'onnxruntime-web/wasm';
// The package doesn't export its WASM files by subpath, so they're referenced
// by path; Vite copies them into the build and gives back their URLs.
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import mjsUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import { modelSize, toTensor, matteToAlpha, refineAlpha } from './matting';

ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
// Multi-threading needs cross-origin isolation, which this site doesn't use.
ort.env.wasm.numThreads = 1;

const MODEL_URL = '/models/modnet-v1.onnx';
const MODEL_BYTES = 25_888_640; // for progress when the server sends no length

let session: Promise<ort.InferenceSession> | null = null;

/** Downloads (once, then browser-cached) and starts the model. */
export function loadModel(onProgress?: (fraction: number) => void): Promise<ort.InferenceSession> {
  if (!session) {
    session = (async () => {
      const res = await fetch(MODEL_URL);
      if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status})`);
      const total = Number(res.headers.get('content-length')) || MODEL_BYTES;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        onProgress?.(Math.min(1, got / total));
      }
      const buf = new Uint8Array(got);
      let o = 0;
      for (const c of chunks) { buf.set(c, o); o += c.length; }
      return ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
    })();
    session.catch(() => { session = null; }); // allow a retry after a failed download
  }
  return session;
}

export interface Cutout {
  width: number;
  height: number;
  /** Original pixels (RGBA, alpha untouched). */
  rgba: Uint8ClampedArray;
  /** Subject mask, 0 = background … 255 = subject. */
  alpha: Uint8ClampedArray;
}

/** Runs the matting model on an image (any size; EXIF rotation applied). */
export async function cutOut(file: Blob, onProgress?: (fraction: number) => void, maxSide = 2400): Promise<Cutout> {
  const sess = await loadModel(onProgress);
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale), height = Math.round(bmp.height * scale);

  const full = document.createElement('canvas');
  full.width = width; full.height = height;
  const fctx = full.getContext('2d', { willReadFrequently: true })!;
  fctx.drawImage(bmp, 0, 0, width, height);
  const rgba = fctx.getImageData(0, 0, width, height).data;

  const [mw, mh] = modelSize(width, height);
  const small = document.createElement('canvas');
  small.width = mw; small.height = mh;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(bmp, 0, 0, mw, mh);
  bmp.close();

  const input = new ort.Tensor('float32', toTensor(sctx.getImageData(0, 0, mw, mh).data, mw, mh), [1, 3, mh, mw]);
  const out = (await sess.run({ input })).output;
  const [, , oh, ow] = out.dims as number[];
  const alpha = refineAlpha(matteToAlpha(out.data as Float32Array, ow, oh, width, height));
  return { width, height, rgba, alpha };
}

/** Renders the cut-out onto a canvas: transparent, or over a solid colour. */
export function renderCutout(c: Cutout, background: string | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = c.width; canvas.height = c.height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  for (let i = 0; i < c.width * c.height; i++) {
    img.data[i * 4] = c.rgba[i * 4];
    img.data[i * 4 + 1] = c.rgba[i * 4 + 1];
    img.data[i * 4 + 2] = c.rgba[i * 4 + 2];
    img.data[i * 4 + 3] = c.alpha[i];
  }
  if (background) {
    const tmp = document.createElement('canvas');
    tmp.width = c.width; tmp.height = c.height;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(tmp, 0, 0);
  } else {
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}

/* ── Face detection (UltraFace RFB-320, MIT, ~1.3 MB) ──────────────── */

let faceSession: Promise<ort.InferenceSession> | null = null;

function loadFaceModel() {
  if (!faceSession) {
    faceSession = (async () => {
      const res = await fetch('/models/ultraface-320-v1.onnx');
      if (!res.ok) throw new Error(`Face model download failed (${res.status})`);
      return ort.InferenceSession.create(new Uint8Array(await res.arrayBuffer()), { executionProviders: ['wasm'] });
    })();
    faceSession.catch(() => { faceSession = null; });
  }
  return faceSession;
}

/** Finds the main face in a cut-out's original pixels, or null. */
export async function detectFace(c: Cutout) {
  const sess = await loadFaceModel();
  const src = document.createElement('canvas');
  src.width = c.width; src.height = c.height;
  src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(c.rgba), c.width, c.height), 0, 0);
  const W = 320, H = 240;
  const small = document.createElement('canvas');
  small.width = W; small.height = H;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(src, 0, 0, W, H);
  const px = sctx.getImageData(0, 0, W, H).data;
  const t = new Float32Array(3 * W * H);
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) t[k * W * H + i] = (px[i * 4 + k] - 127) / 128;
  const out = await sess.run({ input: new ort.Tensor('float32', t, [1, 3, H, W]) });
  const { pickFace } = await import('./passport');
  return pickFace(out.scores.data as Float32Array, out.boxes.data as Float32Array, c.width, c.height);
}
