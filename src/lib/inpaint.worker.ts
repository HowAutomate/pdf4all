/// <reference lib="webworker" />
/**
 * Runs the inpainting model off the main thread, so the page stays responsive
 * (a single pass can take several seconds on a phone).
 */
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import mjsUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';

ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
// Several threads only work on cross-origin-isolated pages (vercel.json sets
// the headers for the watermark pages); elsewhere it falls back to one.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;

const MODEL_URL = '/models/migan-pipeline-v2.onnx';
const MODEL_BYTES = 28_079_181;

let session: Promise<ort.InferenceSession> | null = null;

function load(): Promise<ort.InferenceSession> {
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
        self.postMessage({ type: 'progress', p: Math.min(1, got / total) });
      }
      const buf = new Uint8Array(got);
      let o = 0;
      for (const c of chunks) { buf.set(c, o); o += c.length; }
      return ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
    })();
    session.catch(() => { session = null; });
  }
  return session;
}

type Msg =
  | { type: 'load' }
  | { type: 'run'; id: number; image: Uint8Array; mask: Uint8Array; w: number; h: number };

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      await load();
      self.postMessage({ type: 'ready' });
    } else {
      const sess = await load();
      const out = await sess.run({
        image: new ort.Tensor('uint8', m.image, [1, 3, m.h, m.w]),
        mask: new ort.Tensor('uint8', m.mask, [1, 1, m.h, m.w]),
      });
      const data = new Uint8Array(out.result.data as Uint8Array);
      self.postMessage({ type: 'result', id: m.id, data }, [data.buffer]);
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: m.type === 'run' ? m.id : undefined, message: (err as Error).message });
  }
};
