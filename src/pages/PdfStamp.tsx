import { useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Hash, Stamp, Upload, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import type { Position, NumberFormat } from '@/lib/pdfPages';

const ACCENT = { from: '#0891b2', to: '#67e8f9', soft: 'rgba(8,145,178,0.18)' };
const MAX_BYTES = 100 * 1024 * 1024;

const POSITIONS: [Position, string][] = [
  ['top-left', 'Top left'], ['top-center', 'Top centre'], ['top-right', 'Top right'],
  ['bottom-left', 'Bottom left'], ['bottom-center', 'Bottom centre'], ['bottom-right', 'Bottom right'],
];
const FORMATS: [NumberFormat, string][] = [['n', '1'], ['page-n', 'Page 1'], ['n-slash-total', '1 / 10'], ['page-n-of-total', 'Page 1 of 10']];
const COLORS: [string, [number, number, number]][] = [['Grey', [0.5, 0.5, 0.5]], ['Red', [0.86, 0.15, 0.15]], ['Blue', [0.15, 0.39, 0.92]], ['Black', [0, 0, 0]]];

export default function PdfStamp() {
  const { pathname } = useLocation();
  const route = pathname === '/watermark-pdf' ? '/watermark-pdf' : '/add-page-numbers';
  const meta = PAGES[route];
  const isWatermark = route === '/watermark-pdf';

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Page numbers
  const [position, setPosition] = useState<Position>('bottom-center');
  const [format, setFormat] = useState<NumberFormat>('n');
  const [start, setStart] = useState(1);
  const [skipFirst, setSkipFirst] = useState(false);
  const [numSize, setNumSize] = useState(11);
  // Watermark
  const [text, setText] = useState('CONFIDENTIAL');
  const [wmSize, setWmSize] = useState(56);
  const [opacity, setOpacity] = useState(20);
  const [angle, setAngle] = useState(45);
  const [color, setColor] = useState(0);
  const [layout, setLayout] = useState<'center' | 'tile'>('center');

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { toast.error('Please choose a PDF file.'); return; }
    if (f.size > MAX_BYTES) { toast.error('That PDF is over 100 MB.'); return; }
    setFile(f);
  };

  const run = async () => {
    if (!file) return;
    if (isWatermark && !text.trim()) { toast.error('Type the watermark text first.'); return; }
    setBusy(true);
    try {
      const lib = await import('@/lib/pdfPages');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const out = isWatermark
        ? await lib.addWatermark(bytes, { text: text.trim(), fontSize: wmSize, opacity: opacity / 100, angle, color: COLORS[color][1], layout, bold: true })
        : await lib.addPageNumbers(bytes, { position, format, start, skipFirst, fontSize: numSize, margin: 28 });
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${file.name.replace(/\.pdf$/i, '')}-${isWatermark ? 'watermarked' : 'numbered'}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success('Done — your PDF is downloading.');
    } catch (e) {
      const msg = (e as Error).message ?? '';
      toast.error(/encrypt/i.test(msg) ? 'This PDF is encrypted and can’t be changed.' : /WinAnsi|encode/i.test(msg) ? 'The watermark can only use English letters, numbers and common symbols for now.' : 'Could not process this PDF.');
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-cyan-500 bg-cyan-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';
  const field = 'rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-white text-sm outline-none focus:border-cyan-500';

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={route}
      eyebrow="PDF Utility" eyebrowIcon={isWatermark ? Stamp : Hash}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={760}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[['/add-page-numbers', 'Page numbers'], ['/watermark-pdf', 'Watermark'], ['/organize-pdf', 'Organize'], ['/edit-pdf', 'Edit PDF']].map(([to, l]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-cyan-500 bg-cyan-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>{l}</Link>
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
        <p className="text-white font-semibold mt-3">{file ? file.name : 'Choose a PDF or drop it here'}</p>
        <p className="text-xs mt-1 text-white/45">Up to 100 MB · processed on your device, never uploaded</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        {isWatermark ? (
          <>
            <div>
              <label htmlFor="wm-text" className={label}>Watermark text</label>
              <input id="wm-text" value={text} onChange={e => setText(e.target.value)} maxLength={60} className={`${field} w-full`} placeholder="CONFIDENTIAL" />
            </div>
            <div className="flex flex-wrap gap-2">
              {['CONFIDENTIAL', 'DRAFT', 'COPY', 'SAMPLE', 'PAID'].map(t => <button key={t} onClick={() => setText(t)} className={chip(text === t)}>{t}</button>)}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className={label}>Layout</span>
                <div className="flex gap-2">
                  <button onClick={() => setLayout('center')} className={chip(layout === 'center')}>Once, centred</button>
                  <button onClick={() => setLayout('tile')} className={chip(layout === 'tile')}>Repeated</button>
                </div>
              </div>
              <div>
                <span className={label}>Colour</span>
                <div className="flex flex-wrap gap-2">{COLORS.map(([n], i) => <button key={n} onClick={() => setColor(i)} className={chip(color === i)}>{n}</button>)}</div>
              </div>
              <label className="block"><span className={label}>Size: {wmSize} pt</span><input type="range" min={16} max={120} value={wmSize} onChange={e => setWmSize(Number(e.target.value))} className="w-full accent-cyan-500" /></label>
              <label className="block"><span className={label}>Transparency: {opacity}% visible</span><input type="range" min={5} max={80} value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full accent-cyan-500" /></label>
              <div>
                <span className={label}>Angle</span>
                <div className="flex gap-2">{[0, 30, 45, 90].map(a => <button key={a} onClick={() => setAngle(a)} className={chip(angle === a)}>{a}°</button>)}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className={label}>Position</span>
              <div className="grid grid-cols-3 gap-2">{POSITIONS.map(([v, l]) => <button key={v} onClick={() => setPosition(v)} className={chip(position === v)}>{l}</button>)}</div>
            </div>
            <div>
              <span className={label}>Format</span>
              <div className="flex flex-wrap gap-2">{FORMATS.map(([v, l]) => <button key={v} onClick={() => setFormat(v)} className={chip(format === v)}>{l}</button>)}</div>
            </div>
            <div className="flex flex-wrap gap-5 items-end">
              <label><span className={label}>Start at</span><input type="number" min={0} value={start} onChange={e => setStart(Number(e.target.value) || 0)} className={`${field} w-24`} /></label>
              <label><span className={label}>Text size</span><input type="number" min={6} max={36} value={numSize} onChange={e => setNumSize(Number(e.target.value) || 11)} className={`${field} w-24`} /></label>
              <label className="flex items-center gap-2 text-sm text-white/75 cursor-pointer pb-1.5">
                <input type="checkbox" checked={skipFirst} onChange={e => setSkipFirst(e.target.checked)} className="accent-cyan-500" />
                Don’t number the first page (cover)
              </label>
            </div>
          </>
        )}
        <Button onClick={run} disabled={!file || busy} className="w-full h-11" style={{ background: file ? `linear-gradient(135deg,${ACCENT.from},#2563eb)` : undefined, color: '#fff' }}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {file ? (isWatermark ? 'Add watermark & download' : 'Add page numbers & download') : 'Choose a PDF first'}
        </Button>
      </div>
    </ToolLayout>
  );
}
