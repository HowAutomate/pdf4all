import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eraser, Upload, Download, Loader2, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import type { Cutout } from '@/lib/bgRemoval';

const ACCENT = { from: '#9333ea', to: '#d8b4fe', soft: 'rgba(147,51,234,0.18)' };
const BACKGROUNDS: [string | null, string][] = [
  [null, 'Transparent'], ['#ffffff', 'White'], ['#dbeafe', 'Light blue'], ['#1d4ed8', 'Blue'], ['#dc2626', 'Red'], ['#111827', 'Black'],
];
const CHECKER = 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px';

export default function RemoveBackground() {
  const meta = PAGES['/remove-background'];
  const [file, setFile] = useState<File | null>(null);
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [bg, setBg] = useState<string | null>(null);
  const [custom, setCustom] = useState('#22c55e');
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lib = useRef<typeof import('@/lib/bgRemoval') | null>(null);

  const getLib = async () => (lib.current ??= await import('@/lib/bgRemoval'));

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(f.name)) { toast.error('Please choose a photo (JPG, PNG or WebP).'); return; }
    setFile(f); setCutout(null); setBusy(true);
    try {
      const m = await getLib();
      setStatus('Loading the AI model…');
      const c = await m.cutOut(f, p => setStatus(p < 1 ? `Downloading the AI model (one time only) — ${Math.round(p * 100)}%` : 'Removing background…'));
      setCutout(c);
    } catch (e) {
      console.error(e);
      toast.error(/download/i.test((e as Error).message) ? 'Couldn’t download the AI model — check your connection and try again.' : 'Couldn’t process this photo. iPhone HEIC photos: share as JPG first.');
      setFile(null);
    } finally {
      setBusy(false); setStatus('');
    }
  };

  // Re-render the preview when the background changes.
  useEffect(() => {
    if (!cutout || !lib.current) return;
    const canvas = lib.current.renderCutout(cutout, bg);
    let url: string | null = null;
    canvas.toBlob(b => { if (b) { url = URL.createObjectURL(b); setPreview(url); } }, 'image/png');
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [cutout, bg]);

  const download = (format: 'png' | 'jpg') => {
    if (!cutout || !lib.current || !file) return;
    const canvas = lib.current.renderCutout(cutout, format === 'jpg' ? (bg ?? '#ffffff') : bg);
    canvas.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^.]+$/, '')}-no-bg.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, format === 'png' ? 'image/png' : 'image/jpeg', 0.92);
  };

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path="/remove-background"
      eyebrow="AI · Runs on your device" eyebrowIcon={Eraser}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={860}
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
        <p className="text-white font-semibold mt-3">{busy ? status : file ? 'Choose another photo' : 'Choose a photo of a person or drop it here'}</p>
        <p className="text-xs mt-1 text-white/45">JPG, PNG or WebP · processed on your device, never uploaded</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {cutout && preview && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: bg ?? CHECKER, maxHeight: 520 }}>
            <img src={preview} alt="Photo with background removed" className="max-w-full object-contain" style={{ maxHeight: 520 }} />
          </div>
          <div className="mt-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Background</span>
            <div className="flex flex-wrap gap-2 items-center">
              {BACKGROUNDS.map(([v, l]) => (
                <button key={l} onClick={() => setBg(v)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border ${bg === v ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/10 text-white/60 hover:text-white'}`}>
                  <span className="w-3.5 h-3.5 rounded-sm border border-white/30" style={{ background: v ?? CHECKER }} />{l}
                </button>
              ))}
              <label className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border cursor-pointer ${bg === custom ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/10 text-white/60'}`}>
                <input type="color" value={custom} onChange={e => { setCustom(e.target.value); setBg(e.target.value); }} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
                Any colour
              </label>
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Button onClick={() => download('png')} className="flex-1 h-11" style={{ background: `linear-gradient(135deg,${ACCENT.from},#2563eb)`, color: '#fff' }}>
              <Download className="w-4 h-4 mr-2" />Download PNG{bg ? '' : ' (transparent)'}
            </Button>
            <Button onClick={() => download('jpg')} variant="outline" className="h-11">
              <Download className="w-4 h-4 mr-2" />Download JPG
            </Button>
          </div>
          <Link to="/passport-size-photo" className="mt-4 flex items-center justify-center gap-2 text-sm text-purple-300 hover:text-white">
            <IdCard className="w-4 h-4" /> Need a passport-size photo? Make one with a white background →
          </Link>
        </div>
      )}
    </ToolLayout>
  );
}
