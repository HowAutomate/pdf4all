import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutGrid, Upload, Download, Loader2, RotateCcw, RotateCw, Trash2, Undo2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';

const ACCENT = { from: '#7c3aed', to: '#c4b5fd', soft: 'rgba(124,58,237,0.18)' };
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_PAGES = 300;

interface Card { key: number; src: number; rotate: number; deleted: boolean }

const LINKS: [string, string][] = [['/organize-pdf', 'Organize PDF'], ['/rotate-pdf', 'Rotate PDF'], ['/delete-pdf-pages', 'Delete pages'], ['/merge-pdf', 'Merge'], ['/split-pdf', 'Split']];

export default function OrganizePdf() {
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/organize-pdf';
  const meta = PAGES[route];

  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadId = useRef(0);

  useEffect(() => () => Object.values(thumbs).forEach(URL.revokeObjectURL), []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { toast.error('Please choose a PDF file.'); return; }
    if (f.size > MAX_BYTES) { toast.error('That PDF is over 100 MB — too large to handle in the browser.'); return; }
    const id = ++loadId.current;
    const data = new Uint8Array(await f.arrayBuffer());
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      const pdf = await pdfjs.getDocument({ data: data.slice(), isEvalSupported: false }).promise;
      if (pdf.numPages > MAX_PAGES) { toast.error(`This PDF has ${pdf.numPages} pages — up to ${MAX_PAGES} are supported.`); pdf.destroy(); return; }
      setFile(f); setBytes(data); setThumbs({});
      setCards(Array.from({ length: pdf.numPages }, (_, i) => ({ key: i, src: i, rotate: 0, deleted: false })));
      // Thumbnails render progressively in the background.
      const canvas = document.createElement('canvas');
      for (let i = 1; i <= pdf.numPages && id === loadId.current; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const s = page.getViewport({ scale: 180 / Math.max(vp.width, vp.height) });
        canvas.width = Math.round(s.width); canvas.height = Math.round(s.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: s }).promise;
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.8));
        if (blob && id === loadId.current) setThumbs(t => ({ ...t, [i - 1]: URL.createObjectURL(blob) }));
      }
      pdf.destroy();
    } catch (e) {
      toast.error((e as { name?: string })?.name === 'PasswordException' ? 'This PDF is password-protected.' : 'Could not open that PDF.');
    }
  };

  const update = (key: number, patch: Partial<Card>) => setCards(cs => cs.map(c => (c.key === key ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) => setCards(cs => {
    const j = i + d;
    if (j < 0 || j >= cs.length) return cs;
    const next = [...cs];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const rotateAll = (deg: number) => setCards(cs => cs.map(c => ({ ...c, rotate: (c.rotate + deg + 360) % 360 })));

  const kept = cards.filter(c => !c.deleted);
  const changed = cards.some((c, i) => c.deleted || c.rotate || c.src !== i);

  const save = async () => {
    if (!bytes || !kept.length) return;
    setBusy(true);
    try {
      const { organize } = await import('@/lib/pdfPages');
      const out = await organize(bytes, kept.map(c => ({ src: c.src, rotate: c.rotate })));
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${file!.name.replace(/\.pdf$/i, '')}-organized.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`Saved — ${kept.length} page${kept.length === 1 ? '' : 's'}.`);
    } catch (e) {
      console.error(e);
      toast.error(/encrypt/i.test((e as Error).message) ? 'This PDF is encrypted and can’t be changed.' : 'Could not save the PDF.');
    } finally {
      setBusy(false);
    }
  };

  const iconBtn = 'p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25';

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={route}
      eyebrow="PDF Utility" eyebrowIcon={LayoutGrid}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={1000}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {LINKS.map(([to, l]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-violet-500 bg-violet-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>{l}</Link>
        ))}
      </div>

      {!file && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors p-8"
          style={{ borderColor: dragOver ? ACCENT.from : 'rgba(255,255,255,0.15)', background: dragOver ? ACCENT.soft : 'rgba(255,255,255,0.03)' }}
        >
          <Upload className="w-8 h-8 mx-auto" style={{ color: ACCENT.to }} />
          <p className="text-white font-semibold mt-3">Choose a PDF or drop it here</p>
          <p className="text-xs mt-1 text-white/45">Up to 100 MB · edited on your device, never uploaded</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      {file && (
        <>
          <div className="sticky top-[72px] z-20 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 mb-4" style={{ background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(16px)' }}>
            <span className="text-sm text-white/70 truncate max-w-[40%]">{file.name}</span>
            <span className="text-xs text-white/40">{kept.length} of {cards.length} pages</span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => rotateAll(-90)}><RotateCcw className="w-3.5 h-3.5 mr-1" />Rotate all</Button>
            <Button variant="outline" size="sm" onClick={() => rotateAll(90)}><RotateCw className="w-3.5 h-3.5 mr-1" />Rotate all</Button>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Other PDF</Button>
            <Button size="sm" onClick={save} disabled={busy || !kept.length || !changed}
              style={{ background: changed && kept.length ? `linear-gradient(135deg,${ACCENT.from},#2563eb)` : undefined, color: '#fff' }}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}Download
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {cards.map((c, i) => (
              <div key={c.key} className={`rounded-xl border p-2 ${c.deleted ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 bg-white/[0.04]'}`}>
                <div className="aspect-square rounded-lg bg-white/90 flex items-center justify-center overflow-hidden relative">
                  {thumbs[c.src]
                    ? <img src={thumbs[c.src]} alt={`Page ${c.src + 1}`} className="max-w-[88%] max-h-[88%] shadow transition-transform" style={{ transform: `rotate(${c.rotate}deg)`, opacity: c.deleted ? 0.25 : 1 }} />
                    : <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                  {c.deleted && <span className="absolute text-[11px] font-bold text-red-600 bg-white/90 rounded px-1.5">Removed</span>}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-white/50 font-semibold">{c.src + 1}</span>
                  <span className="flex">
                    <button className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier"><ArrowLeft className="w-3.5 h-3.5" /></button>
                    <button className={iconBtn} onClick={() => move(i, 1)} disabled={i === cards.length - 1} aria-label="Move later"><ArrowRight className="w-3.5 h-3.5" /></button>
                    <button className={iconBtn} onClick={() => update(c.key, { rotate: (c.rotate + 270) % 360 })} disabled={c.deleted} aria-label="Rotate left"><RotateCcw className="w-3.5 h-3.5" /></button>
                    <button className={iconBtn} onClick={() => update(c.key, { rotate: (c.rotate + 90) % 360 })} disabled={c.deleted} aria-label="Rotate right"><RotateCw className="w-3.5 h-3.5" /></button>
                    <button className={`${iconBtn} ${c.deleted ? '' : 'hover:text-red-400'}`} onClick={() => update(c.key, { deleted: !c.deleted })} aria-label={c.deleted ? 'Restore page' : 'Delete page'}>
                      {c.deleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolLayout>
  );
}
