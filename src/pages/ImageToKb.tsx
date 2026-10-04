import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Upload, Download, Loader2, Minimize2, PenLine, Info } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES, type KbPreset } from '@/data/pages';
import { fitToKb } from '@/lib/fitToKb';
import { padJpeg } from '@/lib/jpegPad';

const ACCENT = { from: '#16a34a', to: '#86efac', soft: 'rgba(22,163,74,0.18)' };
const KB = 1024;
/** Phone photos are huge; nothing a form wants needs more than this. */
const MAX_START_SIDE = 2400;

const SIZE_LINKS: [string, string][] = [
  ['/ibps-photo-signature-size', 'IBPS'], ['/neet-photo-size', 'NEET'], ['/jee-main-photo-size', 'JEE Main'], ['/ssc-signature-size', 'SSC'],
  ['/resize-image-to-10kb', '10 KB'], ['/resize-image-to-20kb', '20 KB'], ['/resize-image-to-50kb', '50 KB'],
  ['/resize-image-to-100kb', '100 KB'], ['/resize-image-to-200kb', '200 KB'], ['/signature-resizer', 'Signature'],
  ['/photo-resizer-in-kb', 'Any size'],
];

interface Result { url: string; bytes: number; width: number; height: number; quality: number; ok: boolean; note?: string }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This browser can’t open that image. Try a JPG or PNG (iPhone HEIC photos: share as JPG first).')); };
    img.src = url;
  });
}

/** Whitens paper and shadows, darkens ink, and crops to the signature. */
function cleanSignature(src: HTMLCanvasElement, trim: boolean): HTMLCanvasElement {
  const ctx = src.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = src;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lum = new Uint8Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) {
    const l = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
    lum[i] = l; hist[l]++;
  }
  // Paper brightness = 80th percentile; ink is anything clearly darker.
  let acc = 0, paper = 255;
  for (let l = 0; l < 256; l++) { acc += hist[l]; if (acc >= w * h * 0.8) { paper = l; break; } }
  const cut = paper * 0.72;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    if (lum[i] > cut) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
    else {
      const k = 0.75; // deepen the ink a little so it survives compression
      d[i * 4] *= k; d[i * 4 + 1] *= k; d[i * 4 + 2] *= k;
      const x = i % w, y = (i / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (!trim || maxX < 0) return src;
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export default function ImageToKb() {
  const { pathname } = useLocation();
  const meta = PAGES[pathname] ?? PAGES['/photo-resizer-in-kb'];
  const preset: KbPreset = meta.kb ?? { maxKb: 50, mode: 'photo' };
  const exam = meta.exam;
  const [docIdx, setDocIdx] = useState(0);
  const doc = exam?.docs[docIdx] ?? null;
  const isSignature = doc ? doc.mode === 'signature' : preset.mode === 'signature';

  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [maxKb, setMaxKb] = useState(preset.maxKb);
  const [minKb, setMinKb] = useState<number | ''>(preset.minKb ?? '');
  const [sizeMode, setSizeMode] = useState<'keep' | 'exact'>('keep');
  const [exactW, setExactW] = useState(isSignature ? 140 : 200);
  const [exactH, setExactH] = useState(isSignature ? 60 : 230);
  const [clean, setClean] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  // A new page (e.g. 20 KB → 50 KB) resets the preset.
  useEffect(() => {
    if (exam) return;
    setMaxKb(preset.maxKb);
    setMinKb(preset.minKb ?? '');
  }, [preset.maxKb, preset.minKb, exam]);

  // Exam pages: a new page starts on its first document.
  useEffect(() => { setDocIdx(0); }, [pathname]);

  // Exam pages: each document applies its official limits. A different
  // document needs a different image, so the current one is cleared.
  useEffect(() => {
    if (!doc) return;
    setMaxKb(doc.maxKb);
    setMinKb(doc.minKb ?? '');
    if (doc.w && doc.h) { setSizeMode('exact'); setExactW(doc.w); setExactH(doc.h); } else setSizeMode('keep');
    setFile(null); setSource(null); setResult(null);
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) { toast.error('Please choose an image file (JPG, PNG or WebP).'); return; }
    try {
      const img = await loadImage(f);
      setFile(f); setSource(img); setResult(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  const process = useCallback(async () => {
    if (!source || !maxKb || maxKb <= 0) return;
    const id = ++runId.current;
    setBusy(true);
    try {
      // 1. Base canvas: original (capped), optionally cleaned/cropped.
      let w = source.naturalWidth, h = source.naturalHeight;
      const cap = Math.min(1, MAX_START_SIDE / Math.max(w, h));
      w = Math.round(w * cap); h = Math.round(h * cap);
      let base = document.createElement('canvas');
      base.width = w; base.height = h;
      const bctx = base.getContext('2d')!;
      bctx.fillStyle = '#fff'; bctx.fillRect(0, 0, w, h); // PNG transparency → white
      bctx.drawImage(source, 0, 0, w, h);
      if (isSignature && clean) base = cleanSignature(base, true);

      // 2. Target shape: keep proportions, or exact pixels. Photos are cropped
      //    from the centre to the new shape; signatures are fitted inside it
      //    with white margins so their ends are never cut off.
      let tw = base.width, th = base.height, sx = 0, sy = 0, sw = base.width, sh = base.height;
      let dx = 0, dy = 0, dw = 1, dh = 1; // destination box as fractions of the canvas
      if (sizeMode === 'exact' && exactW > 0 && exactH > 0) {
        tw = exactW; th = exactH;
        const want = exactW / exactH, have = base.width / base.height;
        if (isSignature) {
          if (have > want) { dh = want / have; dy = (1 - dh) / 2; } else { dw = have / want; dx = (1 - dw) / 2; }
        } else if (have > want) { sw = Math.round(base.height * want); sx = Math.round((base.width - sw) / 2); }
        else { sh = Math.round(base.width / want); sy = Math.round((base.height - sh) / 2); }
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const cache = new Map<string, Blob>();
      const render = async (scale: number, q: number) => {
        const key = `${scale.toFixed(4)}|${q.toFixed(3)}`;
        let blob = cache.get(key);
        if (!blob) {
          canvas.width = Math.max(1, Math.round(tw * scale));
          canvas.height = Math.max(1, Math.round(th * scale));
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(base, sx, sy, sw, sh, dx * canvas.width, dy * canvas.height, dw * canvas.width, dh * canvas.height);
          blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', q));
          cache.set(key, blob);
        }
        return blob;
      };

      const exact = sizeMode === 'exact';
      const min = typeof minKb === 'number' && minKb > 0 && minKb < maxKb ? minKb * KB : 0;
      // Exact pixel sizes must not change, so the search may only adjust quality.
      const fit = await fitToKb(async (s, q) => (await render(s, q)).size, maxKb * KB, exact ? 0 : min, 1);
      let blob = await render(fit.scale, fit.quality);
      if (id !== runId.current) return;
      let note: string | undefined;
      if (!fit.ok) note = `Couldn’t get under ${maxKb} KB at a usable quality — try a smaller pixel size.`;
      else if (min && blob.size < min) {
        // Too small for the form's minimum even at full quality (common with
        // small exact sizes like 140 × 60). Pad the JPEG with a comment block:
        // the picture is untouched, only the file size grows.
        const target = Math.min(maxKb * KB - 256, min + 512);
        const padded = padJpeg(new Uint8Array(await blob.arrayBuffer()), target);
        note = `Your image was only ${(blob.size / KB).toFixed(1)} KB, below the ${minKb} KB minimum, so the file was padded to ${(padded.length / KB).toFixed(1)} KB. The picture itself is unchanged — portals only check the file size.`;
        blob = new Blob([padded], { type: 'image/jpeg' });
      }
      setResult(prev => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url: URL.createObjectURL(blob), bytes: blob.size,
          width: Math.round(tw * fit.scale), height: Math.round(th * fit.scale),
          quality: fit.quality, ok: fit.ok, note,
        };
      });
    } catch (e) {
      if (id === runId.current) toast.error('Could not process this image.');
      console.error(e);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  }, [source, maxKb, minKb, sizeMode, exactW, exactH, clean, isSignature]);

  // Re-run whenever the image or a setting changes (debounced for typing).
  useEffect(() => {
    if (!source) return;
    const t = setTimeout(process, 250);
    return () => clearTimeout(t);
  }, [process, source]);

  const download = () => {
    if (!result || !file) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${file.name.replace(/\.[^.]+$/, '')}-${Math.ceil(result.bytes / KB)}kb.jpg`;
    a.click();
  };

  const field = 'w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white text-sm outline-none focus:border-green-500';
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';

  return (
    <ToolLayout
      seoTitle={meta.title}
      seoDescription={meta.description}
      path={pathname in PAGES ? pathname : '/photo-resizer-in-kb'}
      eyebrow={isSignature ? 'Exam & job forms' : 'Image size in KB'}
      eyebrowIcon={isSignature ? PenLine : Minimize2}
      title={meta.h1}
      subtitle={meta.intro}
      accent={ACCENT}
      appCategory="MultimediaApplication"
      faqs={meta.faqs}
      maxWidth={860}
    >
      {exam && doc && (
        <div className="mb-5 rounded-2xl border border-green-500/30 bg-green-500/[0.06] p-4">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-2">Which document?</span>
          <div className="flex flex-wrap gap-2">
            {exam.docs.map((d, i) => (
              <button key={d.label} onClick={() => setDocIdx(i)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold border text-left ${docIdx === i ? 'border-green-500 bg-green-500/15 text-white' : 'border-white/10 text-white/60 hover:text-white'}`}>
                {d.label}
                <span className="block text-[11px] font-normal opacity-70">{d.minKb ? `${d.minKb}–` : 'up to '}{d.maxKb} KB{d.w && d.h ? ` · ${d.w} × ${d.h} px` : ''}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-white/75 mt-3">{doc.tip}</p>
          <p className="text-[11px] text-white/40 mt-2">Source: {exam.source}</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {SIZE_LINKS.map(([to, label]) => (
          <Link key={to} to={to}
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${pathname === to ? 'border-green-500 bg-green-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>
            {label}
          </Link>
        ))}
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors p-8"
        style={{ borderColor: dragOver ? ACCENT.from : 'rgba(255,255,255,0.15)', background: dragOver ? ACCENT.soft : 'rgba(255,255,255,0.03)' }}
      >
        <Upload className="w-8 h-8 mx-auto" style={{ color: ACCENT.to }} />
        <p className="text-white font-semibold mt-3">{file ? file.name : `Choose ${doc ? `your ${doc.label.toLowerCase()} image` : isSignature ? 'a signature photo' : 'a photo'} or drop it here`}</p>
        <p className="text-xs mt-1 text-white/45">JPG, PNG or WebP · resized on your device, never uploaded</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="max-kb">Max size (KB)</label>
            <input id="max-kb" type="number" min={1} className={field} value={maxKb} onChange={e => setMaxKb(Number(e.target.value))} />
          </div>
          <div>
            <label className={label} htmlFor="min-kb">Min size (KB)</label>
            <input id="min-kb" type="number" min={0} placeholder="optional" className={field} value={minKb} onChange={e => setMinKb(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </div>
        <div>
          <span className={label}>Dimensions</span>
          <div className="flex gap-2 mb-2">
            {(['keep', 'exact'] as const).map(m => (
              <button key={m} onClick={() => setSizeMode(m)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border ${sizeMode === m ? 'border-green-500 bg-green-500/15 text-white' : 'border-white/10 text-white/55'}`}>
                {m === 'keep' ? 'Keep shape' : 'Exact pixels'}
              </button>
            ))}
          </div>
          {sizeMode === 'exact' && (
            <div className="flex items-center gap-2">
              <input type="number" min={10} className={field} value={exactW} onChange={e => setExactW(Number(e.target.value))} aria-label="Width in pixels" />
              <span className="text-white/40">×</span>
              <input type="number" min={10} className={field} value={exactH} onChange={e => setExactH(Number(e.target.value))} aria-label="Height in pixels" />
            </div>
          )}
        </div>
        {isSignature && (
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" checked={clean} onChange={e => setClean(e.target.checked)} className="accent-green-600" />
            Clean background (whiten paper and shadows, crop to the signature)
          </label>
        )}
      </div>

      {source && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col sm:flex-row gap-5 items-center">
            <div className="shrink-0 rounded-lg bg-white p-2 flex items-center justify-center" style={{ width: 220, height: 220 }}>
              {result
                ? <img src={result.url} alt="Resized result" className="max-w-full max-h-full object-contain" />
                : <Loader2 className="w-6 h-6 animate-spin text-gray-400" />}
            </div>
            <div className="flex-1 w-full">
              {result ? (
                <>
                  <p className="text-3xl font-black text-white">{(result.bytes / KB).toFixed(1)} KB</p>
                  <p className="text-sm text-white/55 mt-1">
                    {result.width} × {result.height} px · JPG quality {Math.round(result.quality * 100)}% · from {(file!.size / KB).toFixed(0)} KB
                  </p>
                  {result.note && (
                    <p className="flex gap-1.5 text-sm text-amber-200 mt-3"><Info className="w-4 h-4 mt-0.5 shrink-0" />{result.note}</p>
                  )}
                  <Button onClick={download} disabled={busy} className="mt-4 w-full sm:w-auto" style={{ background: `linear-gradient(135deg,${ACCENT.from},#0d9488)`, color: '#fff' }}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download JPG
                  </Button>
                </>
              ) : <p className="text-white/55 text-sm">Resizing…</p>}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-white/35 mt-4 text-center">
        Always check the size and dimensions in your exam or job notification — requirements differ between forms and years.
      </p>
    </ToolLayout>
  );
}
