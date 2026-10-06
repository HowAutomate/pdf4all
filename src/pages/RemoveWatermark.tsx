import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Droplets, Upload, Download, Loader2, Undo2, Eraser, Brush, FileText, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import type { WatermarkCandidate } from '@/lib/pdfWatermark';

const ACCENT = { from: '#0891b2', to: '#67e8f9', soft: 'rgba(8,145,178,0.18)' };
const MAX_SIDE = 4096;
const MAX_PDF_BYTES = 100 * 1024 * 1024;
const GRAD = { background: `linear-gradient(135deg,${ACCENT.from},#2563eb)`, color: '#fff' };

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const baseName = (f: File) => f.name.replace(/\.[^.]+$/, '');

export default function RemoveWatermark() {
  const path = useLocation().pathname === '/remove-watermark-from-pdf' ? '/remove-watermark-from-pdf' : '/watermark-remover';
  const meta = PAGES[path];
  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={path}
      eyebrow={path === '/watermark-remover' ? 'AI · Runs on your device' : 'PDF · Runs on your device'} eyebrowIcon={Droplets}
      title={meta.h1} subtitle={meta.intro}
      note="Use it on your own files, or files you have permission to edit."
      accent={ACCENT} faqs={meta.faqs} maxWidth={900}
    >
      <div className="flex justify-center gap-2 mb-5">
        {([['/watermark-remover', 'From an image', ImageIcon], ['/remove-watermark-from-pdf', 'From a PDF', FileText]] as const).map(([to, label, Icon]) => (
          <Link key={to} to={to}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold border ${path === to ? 'border-cyan-500 bg-cyan-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>
            <Icon className="w-4 h-4" />{label}
          </Link>
        ))}
      </div>
      {path === '/watermark-remover' ? <ImageMode key="img" /> : <PdfMode key="pdf" />}
    </ToolLayout>
  );
}

/* ───────────────────────── Image: paint over it, AI fills it ───────────────────────── */

function DropZone({ accept, busy, status, label, hint, onFile }: {
  accept: string; busy: boolean; status: string; label: string; hint: string; onFile: (f: File | undefined) => void;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
      onClick={() => !busy && ref.current?.click()}
      className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors p-8"
      style={{ borderColor: over ? ACCENT.from : 'rgba(255,255,255,0.15)', background: over ? ACCENT.soft : 'rgba(255,255,255,0.03)' }}
    >
      {busy ? <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: ACCENT.to }} /> : <Upload className="w-8 h-8 mx-auto" style={{ color: ACCENT.to }} />}
      <p className="text-white font-semibold mt-3">{busy ? status : label}</p>
      <p className="text-xs mt-1 text-white/45">{hint}</p>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

function ImageMode() {
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [brush, setBrush] = useState(4); // % of the shorter side … mapped below
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [hasMarks, setHasMarks] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const imgCanvas = useRef<HTMLCanvasElement>(null);
  const maskCanvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const pending = useRef<ImageBitmap | null>(null);

  // Draw a newly chosen image once its canvases are on the page.
  useEffect(() => {
    const bmp = pending.current, c = imgCanvas.current, m = maskCanvas.current;
    if (!bmp || !size || !c || !m) return;
    c.width = m.width = size.w; c.height = m.height = size.h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, size.w, size.h);
    m.getContext('2d')!.clearRect(0, 0, size.w, size.h);
    bmp.close();
    pending.current = null;
  }, [size]);

  const brushPx = useCallback(() => {
    if (!size) return 10;
    return Math.max(3, Math.round((Math.min(size.w, size.h) * brush) / 100));
  }, [size, brush]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(f.name)) { toast.error('Please choose an image (JPG, PNG or WebP).'); return; }
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
      const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
      pending.current?.close();
      pending.current = bmp;
      setFile(f); setSize({ w, h }); setHistory([]); setHasMarks(false);
      // Start fetching the model while the user paints.
      import('@/lib/inpaint').then(m => m.loadInpaintModel()).catch(() => { /* reported when used */ });
    } catch {
      toast.error('Couldn’t open this image. iPhone HEIC photos: share as JPG first.');
    }
  };

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * e.currentTarget.width) / r.width, y: ((e.clientY - r.top) * e.currentTarget.height) / r.height };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = maskCanvas.current!.getContext('2d')!;
    // Painted solid; the canvas itself is shown half-transparent, so
    // overlapping strokes don't get darker.
    ctx.strokeStyle = '#ef4444';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = brushPx();
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (busy) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    const p = toCanvas(e);
    drawing.current = p;
    stroke(p, p);
    setHasMarks(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = toCanvas(e);
    stroke(drawing.current, p);
    drawing.current = p;
  };
  const onUp = () => { drawing.current = null; };

  const clearMarks = () => {
    const m = maskCanvas.current;
    if (m) m.getContext('2d')!.clearRect(0, 0, m.width, m.height);
    setHasMarks(false);
  };

  const run = async () => {
    const c = imgCanvas.current, m = maskCanvas.current;
    if (!c || !m || !size) return;
    const marks = m.getContext('2d')!.getImageData(0, 0, size.w, size.h).data;
    const hole = new Uint8Array(size.w * size.h);
    let any = false;
    for (let i = 0; i < hole.length; i++) if (marks[i * 4 + 3] > 0) { hole[i] = 1; any = true; }
    if (!any) { toast.message('Paint over the watermark first.'); return; }
    setBusy(true);
    try {
      const lib = await import('@/lib/inpaint');
      setStatus('Loading the AI model…');
      await lib.loadInpaintModel(p => setStatus(p < 1 ? `Downloading the AI model (one time only) — ${Math.round(p * 100)}%` : 'Removing…'));
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      const before = ctx.getImageData(0, 0, size.w, size.h);
      const work = new ImageData(new Uint8ClampedArray(before.data), size.w, size.h);
      setStatus('Removing…');
      await lib.inpaint(work, hole, (d, t) => setStatus(t > 1 ? `Removing… ${d} of ${t} areas` : 'Removing…'));
      ctx.putImageData(work, 0, 0);
      setHistory(h => [...h.slice(-9), before]);
      clearMarks();
    } catch (e) {
      console.error(e);
      toast.error(/download/i.test((e as Error).message) ? 'Couldn’t download the AI model — check your connection and try again.' : 'Something went wrong. Try a smaller area or a smaller image.');
    } finally {
      setBusy(false); setStatus('');
    }
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev || !imgCanvas.current) return;
    imgCanvas.current.getContext('2d')!.putImageData(prev, 0, 0);
    setHistory(h => h.slice(0, -1));
  };

  const download = (fmt: 'jpg' | 'png') => {
    if (!file || !imgCanvas.current) return;
    imgCanvas.current.toBlob(b => b && saveBlob(b, `${baseName(file)}-no-watermark.${fmt}`), fmt === 'png' ? 'image/png' : 'image/jpeg', 0.95);
  };

  return (
    <>
      <DropZone accept="image/*" busy={busy && !size} status={status} onFile={pick}
        label={file ? 'Choose another image' : 'Choose an image or drop it here'}
        hint="JPG, PNG or WebP · processed on your device, never uploaded" />

      {size && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <p className="text-sm text-white/70 mb-3 flex items-center gap-2"><Brush className="w-4 h-4" style={{ color: ACCENT.to }} />
            Paint over the watermark (or any unwanted text or object), then press <b className="text-white">Remove</b>.
          </p>
          <div className="relative rounded-xl overflow-hidden mx-auto" style={{ maxWidth: '100%', width: 'fit-content', background: '#111' }}>
            <canvas ref={imgCanvas} className="block max-w-full" style={{ maxHeight: 620 }} />
            <canvas ref={maskCanvas}
              className="absolute inset-0 w-full h-full"
              style={{ touchAction: 'none', cursor: busy ? 'wait' : 'crosshair', opacity: busy ? 0.25 : 0.55 }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex items-center gap-2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white"><Loader2 className="w-4 h-4 animate-spin" />{status}</div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-white/60">
              Brush
              <input type="range" min={1} max={12} step={0.5} value={brush} onChange={e => setBrush(Number(e.target.value))} className="w-32 accent-cyan-500" />
            </label>
            <Button variant="outline" size="sm" onClick={clearMarks} disabled={busy || !hasMarks}><Eraser className="w-4 h-4 mr-1.5" />Clear marks</Button>
            <Button variant="outline" size="sm" onClick={undo} disabled={busy || !history.length}><Undo2 className="w-4 h-4 mr-1.5" />Undo</Button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button onClick={run} disabled={busy || !hasMarks} className="flex-1 h-11" style={GRAD}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Droplets className="w-4 h-4 mr-2" />}Remove
            </Button>
            <Button onClick={() => download('jpg')} disabled={busy} variant="outline" className="h-11"><Download className="w-4 h-4 mr-2" />JPG</Button>
            <Button onClick={() => download('png')} disabled={busy} variant="outline" className="h-11"><Download className="w-4 h-4 mr-2" />PNG</Button>
          </div>
          <p className="text-xs text-white/40 mt-3">Tip: for a big or repeated watermark, remove it in a few smaller passes. Paint a little beyond its edges.</p>
        </div>
      )}
    </>
  );
}

/* ───────────────────────── PDF: remove the watermark layer ───────────────────────── */

function PdfMode() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [cands, setCands] = useState<WatermarkCandidate[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const runId = useRef(0);

  const render = async (data: Uint8Array, pageNo: number) => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    const pdf = await pdfjs.getDocument({ data: data.slice(), isEvalSupported: false }).promise;
    const page = await pdf.getPage(Math.min(pageNo, pdf.numPages));
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 700 / Math.max(vp1.width, vp1.height) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pdf.destroy();
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ? URL.createObjectURL(blob) : null;
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { toast.error('Please choose a PDF file.'); return; }
    if (f.size > MAX_PDF_BYTES) { toast.error('That PDF is over 100 MB — too large to handle in the browser.'); return; }
    setBusy(true); setStatus('Looking for watermarks…');
    try {
      const data = new Uint8Array(await f.arrayBuffer());
      const { findWatermarks } = await import('@/lib/pdfWatermark');
      const found = await findWatermarks(data);
      setFile(f); setBytes(data); setCands(found);
      setChosen(new Set(found.filter(c => c.likely).map(c => c.id)));
      const first = found.find(c => c.likely)?.pages[0] ?? found[0]?.pages[0] ?? 1;
      setPreviewPage(first);
      setBefore(null);
      // The preview draws in the background; it never holds up the download.
      render(data, first).then(setBefore).catch(console.error);
    } catch (e) {
      console.error(e);
      toast.error(/encrypt/i.test((e as Error).message) ? 'This PDF is password-protected. Unlock it first, then try again.' : 'Could not read that PDF.');
    } finally {
      setBusy(false); setStatus('');
    }
  };

  // Live "after" preview whenever the selection changes.
  useEffect(() => {
    if (!bytes || !cands) return;
    const id = ++runId.current;
    (async () => {
      if (!chosen.size) { setAfter(null); return; }
      const { removeWatermarks } = await import('@/lib/pdfWatermark');
      const { bytes: out } = await removeWatermarks(bytes, [...chosen]);
      const url = await render(out, previewPage);
      if (id === runId.current) setAfter(url);
    })().catch(console.error);
  }, [bytes, cands, chosen, previewPage]);

  const toggle = (id: string) => setChosen(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const download = async () => {
    if (!bytes || !file || !chosen.size) return;
    setBusy(true);
    try {
      const { removeWatermarks } = await import('@/lib/pdfWatermark');
      const r = await removeWatermarks(bytes, [...chosen]);
      saveBlob(new Blob([r.bytes], { type: 'application/pdf' }), `${baseName(file)}-no-watermark.pdf`);
      toast.success(`Removed from ${r.pages} page${r.pages === 1 ? '' : 's'}.`);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while saving the PDF.');
    } finally {
      setBusy(false);
    }
  };

  const describe = (c: WatermarkCandidate) => {
    const bits = [`${c.pages.length === 1 ? `page ${c.pages[0]}` : `${c.pages.length} pages`}`];
    if (c.count > c.pages.length) bits.push(`${c.count}×`);
    if (c.rotated) bits.push('tilted');
    if (c.transparent) bits.push('see-through');
    return bits.join(' · ');
  };

  return (
    <>
      <DropZone accept="application/pdf,.pdf" busy={busy && !cands} status={status} onFile={pick}
        label={file ? 'Choose another PDF' : 'Choose a PDF or drop it here'}
        hint="Processed in your browser, never uploaded" />

      {cands && cands.length === 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70 leading-relaxed">
          <p className="text-white font-semibold mb-1">No separate watermark layer found in this PDF.</p>
          The watermark is probably part of a scanned or flattened page image. Convert the page to an image with{' '}
          <Link to="/pdf-to-jpg" className="text-cyan-300 underline">PDF to JPG</Link>, remove it with the{' '}
          <Link to="/watermark-remover" className="text-cyan-300 underline">image watermark remover</Link>, then turn it back into a PDF with{' '}
          <Link to="/jpg-to-pdf" className="text-cyan-300 underline">JPG to PDF</Link>.
        </div>
      )}

      {cands && cands.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <p className="text-sm text-white/70 mb-3">Tick what to remove. Likely watermarks are already ticked; check the preview before downloading.</p>
          <div className="space-y-2">
            {cands.map(c => (
              <label key={c.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${chosen.has(c.id) ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-white/10'}`}>
                <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 accent-cyan-500" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white break-words">{c.label}</span>
                  <span className="block text-xs text-white/45">{describe(c)}{c.likely ? ' · likely watermark' : ''}</span>
                </span>
                {c.pages[0] !== previewPage && (
                  <button type="button" onClick={e => { e.preventDefault(); setPreviewPage(c.pages[0]); setBefore(null); if (bytes) render(bytes, c.pages[0]).then(setBefore).catch(console.error); }}
                    className="text-xs text-cyan-300 hover:text-white shrink-0 mt-0.5">Preview p.{c.pages[0]}</button>
                )}
              </label>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[['Before', before], ['After', chosen.size ? after : before]].map(([label, src]) => (
              <div key={label as string}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">{label} · page {previewPage}</p>
                <div className="rounded-lg overflow-hidden bg-white flex items-center justify-center min-h-[160px]">
                  {src ? <img src={src as string} alt={`${label} preview`} className="w-full h-auto" /> : <Loader2 className="w-6 h-6 animate-spin text-slate-400" />}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={download} disabled={busy || !chosen.size} className="w-full h-11 mt-5" style={GRAD}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Download PDF without watermark
          </Button>
          <p className="text-xs text-white/40 mt-3">
            Only the watermark is cut out, so text stays sharp and selectable. A watermark that is part of a scanned image can’t be separated here; use the{' '}
            <Link to="/watermark-remover" className="text-cyan-300 underline">image remover</Link> for those.
          </p>
        </div>
      )}
    </>
  );
}
