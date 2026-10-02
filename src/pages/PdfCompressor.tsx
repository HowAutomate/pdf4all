import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FileDown, Upload, Download, Loader2, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';

const ACCENT = { from: '#0284c7', to: '#7dd3fc', soft: 'rgba(2,132,199,0.18)' };
const KB = 1024;
const MAX_BYTES = 100 * 1024 * 1024;

type Level = 'light' | 'medium' | 'strong';
const LEVEL_INFO: Record<Level, { label: string; desc: string }> = {
  light: { label: 'Light', desc: 'Best quality, smaller saving' },
  medium: { label: 'Recommended', desc: 'Good quality, good saving' },
  strong: { label: 'Strong', desc: 'Smallest file, lower image quality' },
};

const SIZE_LINKS: [string, string][] = [
  ['/pdf-compressor', 'Compress PDF'], ['/compress-pdf-to-100kb', '100 KB'], ['/compress-pdf-to-200kb', '200 KB'],
  ['/compress-pdf-to-500kb', '500 KB'], ['/compress-pdf-to-1mb', '1 MB'],
];

const fmt = (b: number) => (b < KB * KB ? `${(b / KB).toFixed(b < 10 * KB ? 1 : 0)} KB` : `${(b / KB / KB).toFixed(2)} MB`);

interface Outcome {
  bytes: Uint8Array;
  textKept: boolean;
  fits?: boolean;
  images?: { found: number; recompressed: number };
  /** Best text-keeping result when the main result had to rasterise. */
  alternative?: Uint8Array;
}

export default function PdfCompressor() {
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/pdf-compressor';
  const meta = PAGES[route];
  const presetKb = meta.pdfTargetKb;

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'reduce' | 'target'>(presetKb ? 'target' : 'reduce');
  const [level, setLevel] = useState<Level>('medium');
  const [targetKb, setTargetKb] = useState(presetKb ?? 200);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Bumped on every new run, file or setting change: a slower, older run must
  // never overwrite the result shown for the current file.
  const runId = useRef(0);
  const show = (id: number, o: Outcome) => { if (id === runId.current) setOutcome(o); };

  useEffect(() => {
    setMode(presetKb ? 'target' : 'reduce');
    if (presetKb) setTargetKb(presetKb);
    setOutcome(null);
  }, [presetKb]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { toast.error('Please choose a PDF file.'); return; }
    if (f.size > MAX_BYTES) { toast.error('That PDF is over 100 MB — too large to process in the browser.'); return; }
    runId.current++;
    setFile(f); setOutcome(null); setBusy(false); setProgress('');
  };

  const run = async () => {
    if (!file) return;
    const id = ++runId.current;
    setBusy(true); setOutcome(null); setProgress('Reading PDF…');
    try {
      const original = new Uint8Array(await file.arrayBuffer());
      const lib = await import('@/lib/pdfCompress/browser');
      if (mode === 'reduce') {
        setProgress('Compressing images…');
        const r = await lib.compressKeepText(original, lib.LEVELS[level]);
        show(id, { bytes: r.bytes, textKept: true, images: r.report });
      } else {
        const target = Math.round(targetKb * KB);
        if (original.length <= target) {
          show(id, { bytes: original, textKept: true, fits: true });
          return;
        }
        const kept = await lib.compressKeepTextToTarget(original, target, (i, n) => { if (id === runId.current) setProgress(`Compressing images (step ${i} of ${n})…`); });
        if (kept.fits) {
          show(id, { bytes: kept.result.bytes, textKept: true, fits: true, images: kept.result.report });
        } else {
          const raster = await lib.rasterizeToTarget(original, target, m => { if (id === runId.current) setProgress(m); });
          if (raster && raster.bytes.length < kept.result.bytes.length) {
            show(id, { bytes: raster.bytes, textKept: false, fits: raster.fits, alternative: kept.result.bytes, images: kept.result.report });
          } else {
            show(id, { bytes: kept.result.bytes, textKept: true, fits: false, images: kept.result.report });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (id === runId.current) toast.error(/encrypt/i.test(msg) ? 'This PDF is password-protected. Remove the password first.' : 'Could not compress this PDF — it may be damaged.');
      console.error(err);
    } finally {
      if (id === runId.current) { setBusy(false); setProgress(''); }
    }
  };

  const save = (bytes: Uint8Array, suffix: string) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file!.name.replace(/\.pdf$/i, '')}-${suffix}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const orig = file?.size ?? 0;
  const got = outcome?.bytes.length ?? 0;
  // Never offer a file that isn't meaningfully smaller than the original.
  const noGain = !!outcome && mode === 'reduce' && got >= orig * 0.98;
  const alreadyUnder = !!outcome && mode === 'target' && outcome.bytes.length === orig && orig <= targetKb * KB;
  // Floor, so 99.6% never reads as a misleading "100%".
  const saving = orig ? Math.floor((1 - got / orig) * 100) : 0;

  const pill = (active: boolean) =>
    `rounded-xl border px-3 py-2.5 text-left transition-colors ${active ? 'border-sky-500 bg-sky-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white'}`;

  return (
    <ToolLayout
      seoTitle={meta.title}
      seoDescription={meta.description}
      path={route}
      eyebrow="PDF Utility"
      eyebrowIcon={FileDown}
      title={meta.h1}
      subtitle={meta.intro}
      accent={ACCENT}
      faqs={meta.faqs}
      maxWidth={760}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {SIZE_LINKS.map(([to, label]) => (
          <Link key={to} to={to}
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-sky-500 bg-sky-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>
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
        <p className="text-white font-semibold mt-3">{file ? `${file.name} · ${fmt(file.size)}` : 'Choose a PDF or drop it here'}</p>
        <p className="text-xs mt-1 text-white/45">Up to 100 MB · compressed on your device, never uploaded</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex gap-2 mb-4">
          {(['reduce', 'target'] as const).map(m => (
            <button key={m} onClick={() => { runId.current++; setBusy(false); setMode(m); setOutcome(null); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border ${mode === m ? 'border-sky-500 bg-sky-500/15 text-white' : 'border-white/10 text-white/55'}`}>
              {m === 'reduce' ? 'Reduce size' : 'Exact size'}
            </button>
          ))}
        </div>
        {mode === 'reduce' ? (
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LEVEL_INFO) as Level[]).map(l => (
              <button key={l} onClick={() => { runId.current++; setBusy(false); setLevel(l); setOutcome(null); }} className={pill(level === l)}>
                <span className="block text-sm font-bold">{LEVEL_INFO[l].label}</span>
                <span className="block text-[11px] opacity-70 mt-0.5">{LEVEL_INFO[l].desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <label htmlFor="target-kb" className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Maximum size (KB)</label>
            <div className="flex flex-wrap gap-2 items-center">
              <input id="target-kb" type="number" min={10} value={targetKb} onChange={e => { setTargetKb(Number(e.target.value)); setOutcome(null); }}
                className="w-32 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white text-sm outline-none focus:border-sky-500" />
              {[100, 200, 500, 1024].map(k => (
                <button key={k} onClick={() => { setTargetKb(k); setOutcome(null); }}
                  className={`rounded-full px-3 py-1 text-xs border ${targetKb === k ? 'border-sky-500 text-white' : 'border-white/10 text-white/55'}`}>
                  {k === 1024 ? '1 MB' : `${k} KB`}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button onClick={run} disabled={!file || busy || (mode === 'target' && !(targetKb >= 10))} className="w-full mt-5 h-11"
          style={{ background: file ? `linear-gradient(135deg,${ACCENT.from},#2563eb)` : undefined, color: '#fff' }}>
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{progress || 'Working…'}</> : file ? 'Compress PDF' : 'Choose a PDF first'}
        </Button>
      </div>

      {outcome && file && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {noGain || alreadyUnder ? (
            <p className="flex gap-2 text-sm text-white/80">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-300" />
              {alreadyUnder
                ? `Your PDF is already ${fmt(orig)} — under the ${targetKb >= 1024 ? targetKb / 1024 + ' MB' : targetKb + ' KB'} limit, so it doesn’t need compressing.`
                : `This PDF is already about as small as it gets at this level (${fmt(orig)} → ${fmt(got)}). ${level !== 'strong' ? 'Try "Strong", or ' : ''}use "Exact size" if you need it under a specific limit.`}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-black/20 p-3"><p className="text-lg font-black text-white/60">{fmt(orig)}</p><p className="text-[11px] uppercase tracking-wider text-white/40">Original</p></div>
                <div className="rounded-xl bg-black/20 p-3"><p className="text-lg font-black text-sky-300">{fmt(got)}</p><p className="text-[11px] uppercase tracking-wider text-white/40">Compressed</p></div>
                <div className="rounded-xl bg-black/20 p-3"><p className="text-lg font-black text-emerald-300">−{saving}%</p><p className="text-[11px] uppercase tracking-wider text-white/40">Saved</p></div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {outcome.textKept ? (
                  <p className="flex gap-2 text-white/75"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    Text, links and layout kept exactly{outcome.images ? ` · ${outcome.images.recompressed} of ${outcome.images.found} images recompressed` : ''}.</p>
                ) : (
                  <p className="flex gap-2 text-amber-200"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    To fit the limit, pages were converted to images — the text can no longer be selected or searched. Fine for most upload portals.</p>
                )}
                {mode === 'target' && outcome.fits === false && (
                  <p className="flex gap-2 text-amber-200"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    Couldn’t get this PDF under the limit at a readable quality — this is the smallest version possible. Try splitting it into fewer pages.</p>
                )}
              </div>
              <Button onClick={() => save(outcome.bytes, mode === 'target' ? `${Math.ceil(got / KB)}kb` : 'compressed')} className="w-full mt-4 h-11"
                style={{ background: `linear-gradient(135deg,${ACCENT.from},#2563eb)`, color: '#fff' }}>
                <Download className="w-4 h-4 mr-2" /> Download compressed PDF
              </Button>
              {outcome.alternative && outcome.alternative.length < orig && (
                <button onClick={() => save(outcome.alternative!, 'compressed-text')} className="w-full mt-2 text-xs text-white/55 hover:text-white underline underline-offset-2">
                  Or download the best version that keeps text ({fmt(outcome.alternative.length)} — over the limit)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
