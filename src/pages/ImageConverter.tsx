import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ImageDown, Upload, Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES, type ImageToolPreset } from '@/data/pages';

const ACCENT = { from: '#059669', to: '#6ee7b7', soft: 'rgba(5,150,105,0.18)' };
const MAX_FILES = 50;
const KB = 1024;
type Fmt = 'jpg' | 'png' | 'webp';
const MIME: Record<Fmt, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const LINKS: [string, string][] = [
  ['/compress-image', 'Compress image'], ['/webp-to-jpg', 'WebP to JPG'], ['/png-to-jpg', 'PNG to JPG'],
  ['/jpg-to-png', 'JPG to PNG'], ['/jpg-to-webp', 'JPG to WebP'], ['/photo-resizer-in-kb', 'Resize to KB'],
];

interface Item {
  id: number; file: File; status: 'waiting' | 'working' | 'done' | 'error';
  out?: Blob; outName?: string; width?: number; height?: number; kept?: boolean;
}
let nextId = 1;

const fmt = (b: number) => (b < KB * KB ? `${(b / KB).toFixed(b < 10 * KB ? 1 : 0)} KB` : `${(b / KB / KB).toFixed(2)} MB`);
const formatOf = (f: File): Fmt => (/png/i.test(f.type) || /\.png$/i.test(f.name) ? 'png' : /webp/i.test(f.type) || /\.webp$/i.test(f.name) ? 'webp' : 'jpg');

async function encode(file: File, to: Fmt, quality: number, maxSide: number | null) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = maxSide ? Math.min(1, maxSide / Math.max(bmp.width, bmp.height)) : 1;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  if (to === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); } // JPG has no transparency
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  let blob: Blob;
  if (to === 'png' && quality < 0.95) {
    // Lossy PNG: reduce to a palette (like TinyPNG). Fewer colours = smaller file.
    const UPNG = (await import('@pdf-lib/upng')).default;
    const colors = Math.max(16, Math.round(256 * quality));
    const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
    blob = new Blob([UPNG.encode([rgba.buffer], c.width, c.height, colors)], { type: 'image/png' });
  } else {
    blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), MIME[to], quality));
  }
  return { blob, width: c.width, height: c.height };
}

export default function ImageConverter() {
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/compress-image';
  const meta = PAGES[route];
  const preset: ImageToolPreset = meta.image ?? { mode: 'compress' };
  const isCompress = preset.mode === 'compress';

  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState<Fmt | 'same'>(isCompress ? 'same' : preset.to);
  const [quality, setQuality] = useState(isCompress ? 70 : 90);
  const [maxSide, setMaxSide] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTarget(isCompress ? 'same' : (preset as { to: Fmt }).to);
    setQuality(isCompress ? 70 : 90);
    setItems([]);
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
    if (imgs.length < files.length) toast.error('Some files were skipped — images only.');
    setItems(prev => [...prev, ...imgs.slice(0, Math.max(0, MAX_FILES - prev.length)).map(file => ({ id: nextId++, file, status: 'waiting' as const }))]);
  };

  const run = async () => {
    setBusy(true);
    const list = items.map(i => ({ ...i, status: 'waiting' as const, out: undefined, kept: false }));
    setItems(list);
    for (const it of list) {
      setItems(prev => prev.map(p => (p.id === it.id ? { ...p, status: 'working' } : p)));
      try {
        const to: Fmt = target === 'same' ? formatOf(it.file) : target;
        const r = await encode(it.file, to, quality / 100, typeof maxSide === 'number' && maxSide > 0 ? maxSide : null);
        const outName = `${it.file.name.replace(/\.[^.]+$/, '')}${isCompress ? '-compressed' : ''}.${to}`;
        // Compressing must never make a file bigger: keep the original instead.
        const keep = isCompress && to === formatOf(it.file) && !maxSide && r.blob.size >= it.file.size;
        setItems(prev => prev.map(p => (p.id === it.id
          ? { ...p, status: 'done', out: keep ? it.file : r.blob, outName: keep ? it.file.name : outName, width: r.width, height: r.height, kept: keep }
          : p)));
      } catch {
        setItems(prev => prev.map(p => (p.id === it.id ? { ...p, status: 'error' } : p)));
      }
    }
    setBusy(false);
  };

  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const saveAll = async () => {
    const done = items.filter(i => i.out);
    if (done.length === 1) { save(done[0].out!, done[0].outName!); return; }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const used = new Set<string>();
    for (const d of done) {
      let n = d.outName!, k = 2;
      while (used.has(n)) n = d.outName!.replace(/(\.[^.]+)$/, `-${k++}$1`);
      used.add(n);
      zip.file(n, d.out!);
    }
    save(await zip.generateAsync({ type: 'blob' }), isCompress ? 'compressed-images.zip' : `images-${target}.zip`);
  };

  const before = items.reduce((n, i) => n + i.file.size, 0);
  const after = items.reduce((n, i) => n + (i.out?.size ?? 0), 0);
  const allDone = items.length > 0 && items.every(i => i.status === 'done' || i.status === 'error');
  const showQuality = target !== 'png' || isCompress;

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-emerald-500 bg-emerald-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={route}
      eyebrow="Image Utility" eyebrowIcon={ImageDown}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={820}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {LINKS.map(([to, l]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-emerald-500 bg-emerald-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>{l}</Link>
        ))}
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); add(Array.from(e.dataTransfer.files ?? [])); }}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors p-8"
        style={{ borderColor: dragOver ? ACCENT.from : 'rgba(255,255,255,0.15)', background: dragOver ? ACCENT.soft : 'rgba(255,255,255,0.03)' }}
      >
        <Upload className="w-8 h-8 mx-auto" style={{ color: ACCENT.to }} />
        <p className="text-white font-semibold mt-3">{items.length ? 'Add more images' : 'Choose images or drop them here'}</p>
        <p className="text-xs mt-1 text-white/45">JPG, PNG, WebP · up to {MAX_FILES} at once · processed on your device</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      {items.length > 0 && (
        <>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 grid sm:grid-cols-2 gap-5">
            <div>
              <span className={label}>Output format</span>
              <div className="flex flex-wrap gap-2">
                {isCompress && <button onClick={() => setTarget('same')} className={chip(target === 'same')}>Same as original</button>}
                {(['jpg', 'png', 'webp'] as Fmt[]).map(f => <button key={f} onClick={() => setTarget(f)} className={chip(target === f)}>{f.toUpperCase()}</button>)}
              </div>
            </div>
            <div>
              <span className={label}>Max width/height (px)</span>
              <input type="number" min={16} placeholder="keep original" value={maxSide} onChange={e => setMaxSide(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-40 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-white text-sm outline-none focus:border-emerald-500" />
            </div>
            {showQuality && (
              <div className="sm:col-span-2">
                <label htmlFor="quality" className={label}>Quality: {quality}% {quality <= 50 ? '· smallest' : quality >= 85 ? '· best looking' : '· balanced'}</label>
                <input id="quality" type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-emerald-500" />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {items.map(it => (
              <div key={it.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{it.file.name}</p>
                  <p className="text-xs text-white/50">
                    {fmt(it.file.size)}
                    {it.status === 'done' && it.out && <> → <span className="text-emerald-300 font-semibold">{fmt(it.out.size)}</span>
                      {it.kept ? ' · already optimised, kept original' : ` · ${it.width} × ${it.height}${it.out.size < it.file.size ? ` · −${Math.floor((1 - it.out.size / it.file.size) * 100)}%` : ''}`}</>}
                    {it.status === 'working' && ' · working…'}
                    {it.status === 'error' && <span className="text-red-400"> · couldn’t process (iPhone HEIC? share as JPG)</span>}
                  </p>
                </div>
                {it.status === 'done' && it.out
                  ? <button onClick={() => save(it.out!, it.outName!)} className="text-emerald-300 hover:text-white" aria-label={`Download ${it.outName}`}><Download className="w-4 h-4" /></button>
                  : <button onClick={() => setItems(prev => prev.filter(p => p.id !== it.id))} disabled={busy} className="text-white/40 hover:text-red-400" aria-label="Remove"><X className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Button onClick={run} disabled={busy} className="flex-1 h-11" style={{ background: `linear-gradient(135deg,${ACCENT.from},#0284c7)`, color: '#fff' }}>
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : isCompress ? `Compress ${items.length} image${items.length === 1 ? '' : 's'}` : `Convert ${items.length} to ${(target === 'same' ? 'original' : target).toUpperCase()}`}
            </Button>
            {allDone && (
              <Button onClick={saveAll} variant="outline" className="h-11">
                <Download className="w-4 h-4 mr-2" />{items.filter(i => i.out).length > 1 ? 'Download all (ZIP)' : 'Download'}
                {after > 0 && before > 0 && after < before ? ` · −${Math.floor((1 - after / before) * 100)}%` : ''}
              </Button>
            )}
          </div>
        </>
      )}
    </ToolLayout>
  );
}
