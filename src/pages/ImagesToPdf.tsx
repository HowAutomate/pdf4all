import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Images, Upload, Download, Loader2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import { placeImage, type PageSize, type Orientation } from '@/lib/imageLayout';

const ACCENT = { from: '#e11d48', to: '#fda4af', soft: 'rgba(225,29,72,0.18)' };
const MAX_IMAGES = 100;

interface Item { id: number; file: File; url: string; width: number; height: number }
let nextId = 1;

const SIZE_OPTIONS: [PageSize, string][] = [['a4', 'A4'], ['letter', 'Letter'], ['legal', 'Legal'], ['fit', 'Same as image']];
const MARGINS: [number, string][] = [[0, 'None'], [18, 'Small'], [36, 'Large']];

function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('unreadable'));
    img.src = url;
  });
}

/**
 * Draws the image through a canvas: applies the phone's EXIF rotation (the
 * browser does this when decoding), turns transparency white, converts any
 * format the browser can open into JPEG, and optionally downsizes.
 */
async function toJpeg(file: File, maxSide: number, quality: number): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', quality));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height };
}

export default function ImagesToPdf() {
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/jpg-to-pdf';
  const meta = PAGES[route];

  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [margin, setMargin] = useState(18);
  const [smaller, setSmaller] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Free preview URLs when leaving the page.
  useEffect(() => () => itemsRef.current.forEach(i => URL.revokeObjectURL(i.url)), []);

  const add = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
    if (imgs.length < files.length) toast.error('Some files were skipped — images only (JPG, PNG, WebP).');
    const room = MAX_IMAGES - items.length;
    if (imgs.length > room) toast.error(`Up to ${MAX_IMAGES} images at a time.`);
    const added: Item[] = [];
    for (const file of imgs.slice(0, Math.max(0, room))) {
      const url = URL.createObjectURL(file);
      try {
        const { width, height } = await readSize(url);
        added.push({ id: nextId++, file, url, width, height });
      } catch {
        URL.revokeObjectURL(url);
        toast.error(`${file.name} couldn’t be opened. iPhone HEIC photos: share them as JPG first.`);
      }
    }
    setItems(prev => [...prev, ...added]);
  };

  const move = (i: number, d: -1 | 1) => setItems(prev => {
    const next = [...prev];
    const j = i + d;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = (id: number) => setItems(prev => {
    const it = prev.find(x => x.id === id);
    if (it) URL.revokeObjectURL(it.url);
    return prev.filter(x => x.id !== id);
  });

  const build = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        setProgress(`Adding image ${i + 1} of ${items.length}…`);
        const it = items[i];
        const isPng = it.file.type === 'image/png' || /\.png$/i.test(it.file.name);
        // PNGs (screenshots, diagrams) stay lossless unless the user asked for a smaller file.
        let img;
        if (isPng && !smaller) {
          img = await doc.embedPng(new Uint8Array(await it.file.arrayBuffer()));
        } else {
          const jpg = await toJpeg(it.file, smaller ? 1800 : 4000, smaller ? 0.72 : 0.9);
          img = await doc.embedJpg(jpg.bytes);
        }
        const p = placeImage(img.width, img.height, size, orientation, margin);
        doc.addPage([p.pageW, p.pageH]).drawImage(img, { x: p.x, y: p.y, width: p.w, height: p.h });
      }
      setProgress('Saving PDF…');
      const out = await doc.save({ useObjectStreams: true });
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = items.length === 1 ? `${items[0].file.name.replace(/\.[^.]+$/, '')}.pdf` : 'images.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`PDF created — ${items.length} page${items.length === 1 ? '' : 's'}, ${(out.length / 1024 / 1024).toFixed(2)} MB.`);
    } catch (e) {
      console.error(e);
      toast.error('Could not create the PDF from these images.');
    } finally {
      setBusy(false); setProgress('');
    }
  };

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-rose-500 bg-rose-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={route}
      eyebrow="PDF Utility" eyebrowIcon={Images}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={860}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[['/jpg-to-pdf', 'JPG to PDF'], ['/png-to-pdf', 'PNG to PDF'], ['/pdf-to-jpg', 'PDF to JPG'], ['/pdf-to-png', 'PDF to PNG']].map(([to, l]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-rose-500 bg-rose-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>{l}</Link>
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
        <p className="text-xs mt-1 text-white/45">JPG, PNG or WebP · up to {MAX_IMAGES} · never uploaded</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      {items.length > 0 && (
        <>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((it, i) => (
              <div key={it.id} className="relative rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <div className="aspect-[3/4] rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  <img src={it.url} alt={it.file.name} className="max-w-full max-h-full object-contain" style={{ imageOrientation: 'from-image' }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-white/50 font-semibold">Page {i + 1}</span>
                  <span className="flex">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" className="p-1 text-white/50 hover:text-white disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move later" className="p-1 text-white/50 hover:text-white disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(it.id)} aria-label="Remove" className="p-1 text-white/50 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 grid sm:grid-cols-2 gap-5">
            <div>
              <span className={label}>Page size</span>
              <div className="flex flex-wrap gap-2">{SIZE_OPTIONS.map(([v, l]) => <button key={v} onClick={() => setSize(v)} className={chip(size === v)}>{l}</button>)}</div>
            </div>
            <div>
              <span className={label}>Orientation</span>
              <div className="flex flex-wrap gap-2">
                {(['auto', 'portrait', 'landscape'] as Orientation[]).map(o => (
                  <button key={o} onClick={() => setOrientation(o)} disabled={size === 'fit'} className={`${chip(orientation === o)} disabled:opacity-30`}>
                    {o === 'auto' ? 'Auto' : o[0].toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>Margin</span>
              <div className="flex flex-wrap gap-2">{MARGINS.map(([v, l]) => <button key={v} onClick={() => setMargin(v)} className={chip(margin === v)}>{l}</button>)}</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/75 cursor-pointer self-end">
              <input type="checkbox" checked={smaller} onChange={e => setSmaller(e.target.checked)} className="accent-rose-600" />
              Make the PDF smaller (good for email and upload portals)
            </label>
          </div>

          <Button onClick={build} disabled={busy} className="w-full mt-5 h-11" style={{ background: `linear-gradient(135deg,${ACCENT.from},#7c3aed)`, color: '#fff' }}>
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{progress}</> : <><Download className="w-4 h-4 mr-2" />Convert {items.length} image{items.length === 1 ? '' : 's'} to PDF</>}
          </Button>
        </>
      )}
    </ToolLayout>
  );
}
