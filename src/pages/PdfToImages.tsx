import { useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FileImage, Upload, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import { parsePageRanges } from '@/lib/pageRanges';

const ACCENT = { from: '#ea580c', to: '#fdba74', soft: 'rgba(234,88,12,0.18)' };
const MAX_BYTES = 100 * 1024 * 1024;
const DPI_OPTIONS: [number, string][] = [[72, 'Screen (72 DPI)'], [150, 'Standard (150 DPI)'], [300, 'Print (300 DPI)']];

export default function PdfToImages() {
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/pdf-to-jpg';
  const meta = PAGES[route];

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [format, setFormat] = useState<'jpg' | 'png'>(route === '/pdf-to-png' ? 'png' : 'jpg');
  const [dpi, setDpi] = useState(150);
  const [which, setWhich] = useState<'all' | 'some'>('all');
  const [ranges, setRanges] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pdfjsReady = async () => {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    return pdfjs;
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { toast.error('Please choose a PDF file.'); return; }
    if (f.size > MAX_BYTES) { toast.error('That PDF is over 100 MB — too large to convert in the browser.'); return; }
    try {
      const pdfjs = await pdfjsReady();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false }).promise;
      setPageCount(pdf.numPages);
      pdf.destroy();
      setFile(f);
    } catch (e) {
      toast.error((e as { name?: string })?.name === 'PasswordException' ? 'This PDF is password-protected.' : 'Could not open that PDF.');
    }
  };

  const selection = which === 'all'
    ? { indices: Array.from({ length: pageCount }, (_, i) => i) }
    : parsePageRanges(ranges, pageCount);

  const convert = async () => {
    if (!file || selection.error || !selection.indices.length) return;
    setBusy(true);
    try {
      const pdfjs = await pdfjsReady();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
      const base = file.name.replace(/\.pdf$/i, '');
      const outputs: { name: string; blob: Blob }[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      for (let k = 0; k < selection.indices.length; k++) {
        const n = selection.indices[k] + 1;
        setProgress(`Converting page ${n} (${k + 1} of ${selection.indices.length})…`);
        const page = await pdf.getPage(n);
        let vp = page.getViewport({ scale: dpi / 72 });
        // Browsers can't make canvases much over ~16k px or ~268M pixels.
        const cap = Math.min(1, 12000 / Math.max(vp.width, vp.height), Math.sqrt(120e6 / (vp.width * vp.height)));
        if (cap < 1) vp = page.getViewport({ scale: (dpi / 72) * cap });
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); // JPG has no transparency
        await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
        const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), format === 'png' ? 'image/png' : 'image/jpeg', 0.92));
        outputs.push({ name: `${base}-page-${String(n).padStart(String(pageCount).length, '0')}.${format}`, blob });
        page.cleanup();
      }
      pdf.destroy();

      let blob: Blob, name: string;
      if (outputs.length === 1) {
        ({ blob, name } = outputs[0]);
      } else {
        setProgress('Packing ZIP…');
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        outputs.forEach(o => zip.file(o.name, o.blob));
        blob = await zip.generateAsync({ type: 'blob' });
        name = `${base}-${format}.zip`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`${outputs.length} page${outputs.length === 1 ? '' : 's'} converted to ${format.toUpperCase()}.`);
    } catch (e) {
      console.error(e);
      toast.error('Could not convert this PDF.');
    } finally {
      setBusy(false); setProgress('');
    }
  };

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-orange-500 bg-orange-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={route}
      eyebrow="PDF Utility" eyebrowIcon={FileImage}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={760}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[['/jpg-to-pdf', 'JPG to PDF'], ['/png-to-pdf', 'PNG to PDF'], ['/pdf-to-jpg', 'PDF to JPG'], ['/pdf-to-png', 'PDF to PNG']].map(([to, l]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-orange-500 bg-orange-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>{l}</Link>
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
        <p className="text-white font-semibold mt-3">{file ? `${file.name} · ${pageCount} page${pageCount === 1 ? '' : 's'}` : 'Choose a PDF or drop it here'}</p>
        <p className="text-xs mt-1 text-white/45">Up to 100 MB · converted on your device, never uploaded</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {file && (
        <>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <span className={label}>Format</span>
              <div className="flex gap-2">
                <button onClick={() => setFormat('jpg')} className={chip(format === 'jpg')}>JPG <span className="font-normal opacity-60">· smaller</span></button>
                <button onClick={() => setFormat('png')} className={chip(format === 'png')}>PNG <span className="font-normal opacity-60">· sharpest</span></button>
              </div>
            </div>
            <div>
              <span className={label}>Quality</span>
              <div className="flex flex-wrap gap-2">{DPI_OPTIONS.map(([v, l]) => <button key={v} onClick={() => setDpi(v)} className={chip(dpi === v)}>{l}</button>)}</div>
            </div>
            <div>
              <span className={label}>Pages</span>
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => setWhich('all')} className={chip(which === 'all')}>All {pageCount}</button>
                <button onClick={() => setWhich('some')} className={chip(which === 'some')}>Choose pages</button>
                {which === 'some' && (
                  <input value={ranges} onChange={e => setRanges(e.target.value)} placeholder="e.g. 1-3, 7"
                    className="w-40 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-white text-sm outline-none focus:border-orange-500" aria-label="Pages to convert" />
                )}
              </div>
              {which === 'some' && ranges && selection.error && <p className="text-xs text-amber-200 mt-1.5">{selection.error}</p>}
            </div>
          </div>
          <Button onClick={convert} disabled={busy || !!selection.error || !selection.indices.length} className="w-full mt-5 h-11"
            style={{ background: `linear-gradient(135deg,${ACCENT.from},#db2777)`, color: '#fff' }}>
            {busy
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{progress}</>
              : <><Download className="w-4 h-4 mr-2" />Convert {selection.indices.length || 0} page{selection.indices.length === 1 ? '' : 's'} to {format.toUpperCase()}{selection.indices.length > 1 ? ' (ZIP)' : ''}</>}
          </Button>
        </>
      )}
    </ToolLayout>
  );
}
