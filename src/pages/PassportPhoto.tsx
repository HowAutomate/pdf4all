import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IdCard, Upload, Download, Loader2, RotateCcw, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import type { Cutout } from '@/lib/bgRemoval';
import { SPECS, SHEETS, DPI, mmToPx, headFromFace, cropForHead, autoCrop, adjustCrop, layoutSheet, type Crop, type Head } from '@/lib/passport';
import { fitToKb } from '@/lib/fitToKb';

const ACCENT = { from: '#2563eb', to: '#93c5fd', soft: 'rgba(37,99,235,0.18)' };
const BG_OPTIONS: [string, string][] = [['#ffffff', 'White'], ['#dbeafe', 'Light blue'], ['#f3f4f6', 'Light grey']];

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), type, q));

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function PassportPhoto() {
  const meta = PAGES['/passport-size-photo'];
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [head, setHead] = useState<Head | null>(null);
  const [faceFound, setFaceFound] = useState(true);
  const [specId, setSpecId] = useState(SPECS[0].id);
  const [bg, setBg] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [guides, setGuides] = useState(true);
  const [maxKb, setMaxKb] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cutCanvas = useRef<HTMLCanvasElement | null>(null);

  const spec = SPECS.find(s => s.id === specId)!;
  const outW = mmToPx(spec.wMm), outH = mmToPx(spec.hMm);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(f.name)) { toast.error('Please choose a photo (JPG, PNG or WebP).'); return; }
    setBusy(true); setCutout(null); setHead(null);
    try {
      const m = await import('@/lib/bgRemoval');
      setStatus('Loading the AI model…');
      const c = await m.cutOut(f, p => setStatus(p < 1 ? `Downloading the AI model (one time only) — ${Math.round(p * 100)}%` : 'Removing background…'));
      setStatus('Finding your face…');
      const face = await m.detectFace(c);
      setFaceFound(!!face);
      const h = face ? headFromFace(c.alpha, c.width, c.height, face) : autoCrop(c.alpha, c.width, c.height, SPECS[0])?.head ?? null;
      if (!h) throw new Error('no subject');
      cutCanvas.current = m.renderCutout(c, null);
      setCutout(c); setHead(h); setZoom(1); setDx(0); setDy(0);
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message === 'no subject' ? 'Couldn’t find a person in this photo.' : 'Couldn’t process this photo. iPhone HEIC photos: share as JPG first.');
    } finally {
      setBusy(false); setStatus('');
    }
  };

  const crop: Crop | null = useMemo(() => (head ? adjustCrop(cropForHead(head, spec), zoom, dx, dy) : null), [head, spec, zoom, dx, dy]);

  /** Renders the finished photo at print resolution. */
  const renderPhoto = (withGuides: boolean) => {
    const c = document.createElement('canvas');
    c.width = outW; c.height = outH;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, outW, outH);
    if (cutCanvas.current && crop) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cutCanvas.current, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
    }
    if (withGuides) {
      ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(37,99,235,0.85)';
      const crownY = outH * spec.topMargin, chinY = outH * (spec.topMargin + spec.headFraction);
      for (const y of [crownY, chinY]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(outW, y); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(outW / 2, 0); ctx.lineTo(outW / 2, outH); ctx.stroke();
    }
    return c;
  };

  useEffect(() => {
    if (!crop) return;
    let url: string | null = null;
    renderPhoto(guides).toBlob(b => { if (b) { url = URL.createObjectURL(b); setPreview(url); } }, 'image/jpeg', 0.9);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [crop, bg, guides, specId]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadPhoto = async () => {
    const c = renderPhoto(false);
    let blob = await toBlob(c, 'image/jpeg', 0.95);
    if (typeof maxKb === 'number' && maxKb > 0 && blob.size > maxKb * 1024) {
      // Exact pixel size must stay, so only the JPEG quality is searched.
      const fit = await fitToKb(async (_s, q) => (await toBlob(c, 'image/jpeg', q)).size, maxKb * 1024, 0, 1);
      blob = await toBlob(c, 'image/jpeg', fit.quality);
      if (!fit.ok) toast.error(`Couldn’t reach ${maxKb} KB at a usable quality — this is the smallest version.`);
    }
    saveBlob(blob, `passport-photo-${spec.wMm}x${spec.hMm}mm.jpg`);
  };

  const sheetCanvas = (sheetId: string) => {
    const sheet = SHEETS.find(s => s.id === sheetId)!;
    const sw = Math.round(sheet.wIn * DPI), sh = Math.round(sheet.hIn * DPI);
    const layout = layoutSheet(sw, sh, outW, outH);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sw, sh);
    const photo = renderPhoto(false);
    ctx.strokeStyle = '#c7c7c7'; ctx.lineWidth = 1;
    for (const cell of layout.cells) {
      ctx.drawImage(photo, cell.x, cell.y);
      ctx.strokeRect(cell.x - 0.5, cell.y - 0.5, outW + 1, outH + 1); // cutting guide
    }
    return { canvas: c, count: layout.cells.length, sheet };
  };

  const downloadSheet = async (sheetId: string, asPdf: boolean) => {
    const { canvas, count, sheet } = sheetCanvas(sheetId);
    const jpg = await toBlob(canvas, 'image/jpeg', 0.95);
    if (!asPdf) { saveBlob(jpg, `passport-photos-${count}-${sheetId}.jpg`); return; }
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const page = doc.addPage([sheet.wIn * 72, sheet.hIn * 72]);
    const img = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
    page.drawImage(img, { x: 0, y: 0, width: sheet.wIn * 72, height: sheet.hIn * 72 });
    saveBlob(new Blob([await doc.save()], { type: 'application/pdf' }), `passport-photos-${count}-${sheetId}.pdf`);
  };

  const counts = useMemo(() => Object.fromEntries(SHEETS.map(s => [s.id, layoutSheet(Math.round(s.wIn * DPI), Math.round(s.hIn * DPI), outW, outH).cells.length])), [outW, outH]);

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-blue-500 bg-blue-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';
  const slider = (name: string, value: number, set: (v: number) => void, min: number, max: number) => (
    <label className="block">
      <span className={label}>{name}</span>
      <input type="range" min={min} max={max} step={0.01} value={value} onChange={e => set(Number(e.target.value))} className="w-full accent-blue-500" />
    </label>
  );

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path="/passport-size-photo"
      eyebrow="AI · Runs on your device" eyebrowIcon={IdCard}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={920}
    >
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
        onClick={() => !busy && inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors p-8"
        style={{ borderColor: dragOver ? ACCENT.from : 'rgba(255,255,255,0.15)', background: dragOver ? ACCENT.soft : 'rgba(255,255,255,0.03)' }}
      >
        {busy ? <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: ACCENT.to }} /> : <Upload className="w-8 h-8 mx-auto" style={{ color: ACCENT.to }} />}
        <p className="text-white font-semibold mt-3">{busy ? status : cutout ? 'Choose another photo' : 'Choose a front-facing photo or drop it here'}</p>
        <p className="text-xs mt-1 text-white/45">Face the camera, even light, no cap or dark glasses · processed on your device, never uploaded</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {cutout && crop && (
        <div className="mt-5 grid md:grid-cols-[minmax(0,300px)_1fr] gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col items-center">
            {preview && <img src={preview} alt="Passport photo preview" className="w-full rounded shadow-lg" style={{ aspectRatio: `${outW} / ${outH}` }} />}
            <label className="mt-3 flex items-center gap-2 text-xs text-white/60 cursor-pointer">
              <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} className="accent-blue-500" />
              Show guides — top of head on the upper line, chin on the lower line
            </label>
            {!faceFound && <p className="text-xs text-amber-200 mt-2">No face detected — framing is estimated. Adjust with the sliders.</p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <span className={label}>Photo size</span>
              <div className="flex flex-col gap-1.5">{SPECS.map(s => <button key={s.id} onClick={() => setSpecId(s.id)} className={`${chip(specId === s.id)} text-left`}>{s.label}</button>)}</div>
            </div>
            <div>
              <span className={label}>Background</span>
              <div className="flex flex-wrap gap-2">{BG_OPTIONS.map(([v, l]) => <button key={v} onClick={() => setBg(v)} className={chip(bg === v)}>{l}</button>)}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {slider('Zoom', zoom, setZoom, 0.7, 1.5)}
              {slider('Up / down', dy, setDy, -0.3, 0.3)}
              {slider('Left / right', dx, setDx, -0.3, 0.3)}
            </div>
            <button onClick={() => { setZoom(1); setDx(0); setDy(0); }} className="flex items-center gap-1 text-xs text-white/55 hover:text-white"><RotateCcw className="w-3 h-3" /> Reset framing</button>

            <div className="border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-end gap-2">
                <label>
                  <span className={label}>Max size (KB, optional)</span>
                  <input type="number" min={5} placeholder="no limit" value={maxKb} onChange={e => setMaxKb(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-32 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                </label>
                <Button onClick={downloadPhoto} className="h-10" style={{ background: `linear-gradient(135deg,${ACCENT.from},#7c3aed)`, color: '#fff' }}>
                  <Download className="w-4 h-4 mr-2" />Download photo ({outW} × {outH} px)
                </Button>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <span className={label}>Print sheet (300 DPI, with cutting guides)</span>
              <div className="flex flex-wrap gap-2">
                {SHEETS.map(s => (
                  <span key={s.id} className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => downloadSheet(s.id, false)}><Printer className="w-3.5 h-3.5 mr-1" />{s.label} · {counts[s.id]} photos (JPG)</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadSheet(s.id, true)}>PDF</Button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-white/35 mt-4 text-center">
        Check the exact requirements of the office or website you’re applying to — sizes and background colours differ. Need just a cut-out? Use the <Link to="/remove-background" className="underline">background remover</Link>.
      </p>
    </ToolLayout>
  );
}
