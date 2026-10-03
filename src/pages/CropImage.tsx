import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crop as CropIcon, Upload, Download, RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import { initialRect, moveRect, resizeRect, toPixels, type Rect, type Handle } from '@/lib/cropRect';

const ACCENT = { from: '#db2777', to: '#f9a8d4', soft: 'rgba(219,39,119,0.18)' };
const ASPECTS: [string, number | null][] = [
  ['Free', null], ['Square 1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16 Story', 9 / 16],
  ['Instagram 4:5', 4 / 5], ['Passport 35×45', 35 / 45], ['YouTube thumbnail', 16 / 9],
];
type Fmt = 'jpg' | 'png' | 'webp';
const MIME: Record<Fmt, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export default function CropImage() {
  const meta = PAGES['/crop-image'];
  const [file, setFile] = useState<File | null>(null);
  const [work, setWork] = useState<HTMLCanvasElement | null>(null); // image after rotate/flip
  const [workUrl, setWorkUrl] = useState('');
  const [rect, setRect] = useState<Rect | null>(null);
  const [aspectIdx, setAspectIdx] = useState(0);
  const [format, setFormat] = useState<Fmt>('jpg');
  const [outW, setOutW] = useState<number | ''>('');
  const [dragOver, setDragOver] = useState(false);
  const [boxW, setBoxW] = useState(800);
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: 'move' | Handle; sx: number; sy: number; start: Rect } | null>(null);

  const aspect = ASPECTS[aspectIdx][1];
  const W = work?.width ?? 1, H = work?.height ?? 1;
  // Fit the preview into the column (and at most 560 px tall).
  const scale = Math.min(boxW / W, 560 / H, 1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [work]);

  const setWorkCanvas = (c: HTMLCanvasElement) => {
    setWork(c);
    c.toBlob(b => { if (b) setWorkUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b); }); }, 'image/png');
    setRect(initialRect(c.width, c.height, aspect, aspect ? 1 : 0.9));
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) { toast.error('Please choose an image (JPG, PNG or WebP).'); return; }
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      c.getContext('2d')!.drawImage(bmp, 0, 0);
      bmp.close();
      setFile(f);
      setFormat(/png/i.test(f.type) ? 'png' : /webp/i.test(f.type) ? 'webp' : 'jpg');
      setOutW('');
      setWorkCanvas(c);
    } catch {
      toast.error('This browser can’t open that image. iPhone HEIC photos: share as JPG first.');
    }
  };

  /** Rotates (±90°) or flips the working image; the crop box resets. */
  const transform = (op: 'left' | 'right' | 'h' | 'v') => {
    if (!work) return;
    const turn = op === 'left' || op === 'right';
    const c = document.createElement('canvas');
    c.width = turn ? work.height : work.width;
    c.height = turn ? work.width : work.height;
    const ctx = c.getContext('2d')!;
    ctx.translate(c.width / 2, c.height / 2);
    if (op === 'right') ctx.rotate(Math.PI / 2);
    if (op === 'left') ctx.rotate(-Math.PI / 2);
    if (op === 'h') ctx.scale(-1, 1);
    if (op === 'v') ctx.scale(1, -1);
    ctx.drawImage(work, -work.width / 2, -work.height / 2);
    setWorkCanvas(c);
  };

  const chooseAspect = (i: number) => {
    setAspectIdx(i);
    if (work) setRect(initialRect(W, H, ASPECTS[i][1], ASPECTS[i][1] ? 1 : 0.9));
  };

  const startDrag = (kind: 'move' | Handle) => (e: React.PointerEvent) => {
    if (!rect) return;
    e.preventDefault(); e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    drag.current = { kind, sx: e.clientX, sy: e.clientY, start: rect };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    setRect(d.kind === 'move' ? moveRect(d.start, dx, dy, W, H) : resizeRect(d.start, d.kind, dx, dy, aspect, W, H));
  };
  const endDrag = () => { drag.current = null; };

  const px = rect ? toPixels(rect, W, H) : null;
  const outWidth = typeof outW === 'number' && outW > 0 ? Math.round(outW) : px?.w ?? 0;
  const outHeight = px ? Math.round(outWidth * (px.h / px.w)) : 0;

  const download = () => {
    if (!work || !px || !file) return;
    const c = document.createElement('canvas');
    c.width = outWidth; c.height = outHeight;
    const ctx = c.getContext('2d')!;
    if (format === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(work, px.x, px.y, px.w, px.h, 0, 0, c.width, c.height);
    c.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = `${file.name.replace(/\.[^.]+$/, '')}-cropped.${format}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, MIME[format], 0.92);
  };

  const chip = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-pink-500 bg-pink-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';
  const handle = (h: Handle, style: React.CSSProperties) => (
    <div onPointerDown={startDrag(h)} onPointerMove={onMove} onPointerUp={endDrag} aria-label={`Resize ${h}`}
      className="absolute w-4 h-4 bg-white border-2 border-pink-500 rounded-sm" style={{ ...style, touchAction: 'none', cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize' }} />
  );

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path="/crop-image"
      eyebrow="Image Utility" eyebrowIcon={CropIcon}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={940}
    >
      {!work && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors p-8"
          style={{ borderColor: dragOver ? ACCENT.from : 'rgba(255,255,255,0.15)', background: dragOver ? ACCENT.soft : 'rgba(255,255,255,0.03)' }}
        >
          <Upload className="w-8 h-8 mx-auto" style={{ color: ACCENT.to }} />
          <p className="text-white font-semibold mt-3">Choose an image or drop it here</p>
          <p className="text-xs mt-1 text-white/45">JPG, PNG or WebP · cropped on your device, never uploaded</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      {work && rect && (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {ASPECTS.map(([l], i) => <button key={l} onClick={() => chooseAspect(i)} className={chip(aspectIdx === i)}>{l}</button>)}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => transform('left')}><RotateCcw className="w-3.5 h-3.5 mr-1" />Rotate left</Button>
            <Button variant="outline" size="sm" onClick={() => transform('right')}><RotateCw className="w-3.5 h-3.5 mr-1" />Rotate right</Button>
            <Button variant="outline" size="sm" onClick={() => transform('h')}><FlipHorizontal className="w-3.5 h-3.5 mr-1" />Flip</Button>
            <Button variant="outline" size="sm" onClick={() => transform('v')}><FlipVertical className="w-3.5 h-3.5 mr-1" />Flip vertical</Button>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Other image</Button>
          </div>

          <div ref={stageRef} className="w-full flex justify-center">
            <div className="relative select-none" style={{ width: W * scale, height: H * scale }}>
              {workUrl && <img src={workUrl} alt="Image to crop" draggable={false} className="w-full h-full block" />}
              {/* Crop box; the huge shadow darkens everything outside it. */}
              <div
                onPointerDown={startDrag('move')} onPointerMove={onMove} onPointerUp={endDrag}
                className="absolute border-2 border-white cursor-move"
                style={{ left: rect.x * scale, top: rect.y * scale, width: rect.w * scale, height: rect.h * scale, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', touchAction: 'none' }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '33.333% 33.333%' }} />
                {handle('nw', { left: -8, top: -8 })}
                {handle('ne', { right: -8, top: -8 })}
                {handle('sw', { left: -8, bottom: -8 })}
                {handle('se', { right: -8, bottom: -8 })}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 grid sm:grid-cols-3 gap-4 items-end">
            <div>
              <span className={label}>Crop area</span>
              <p className="text-white font-semibold">{px?.w} × {px?.h} px</p>
            </div>
            <label className="block">
              <span className={label}>Output width (px, optional)</span>
              <input type="number" min={16} placeholder={String(px?.w ?? '')} value={outW} onChange={e => setOutW(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white text-sm outline-none focus:border-pink-500" />
              {outW !== '' && <span className="text-xs text-white/45">→ {outWidth} × {outHeight} px</span>}
            </label>
            <div>
              <span className={label}>Format</span>
              <div className="flex gap-2">{(['jpg', 'png', 'webp'] as Fmt[]).map(f => <button key={f} onClick={() => setFormat(f)} className={chip(format === f)}>{f.toUpperCase()}</button>)}</div>
            </div>
            <Button onClick={download} className="sm:col-span-3 h-11" style={{ background: `linear-gradient(135deg,${ACCENT.from},#7c3aed)`, color: '#fff' }}>
              <Download className="w-4 h-4 mr-2" />Download cropped image
            </Button>
          </div>
          <p className="text-xs text-white/40 mt-3 text-center">
            Need it under a size limit like 50 KB? Run it through the <Link to="/photo-resizer-in-kb" className="underline">photo resizer in KB</Link>.
          </p>
        </>
      )}
    </ToolLayout>
  );
}
