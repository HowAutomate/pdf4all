import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import unicodeFontUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import unicodeBoldFontUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';
import {
  FilePenLine, Upload, Type, MousePointerClick, Eraser, Highlighter, PenLine, ImagePlus,
  Download, Loader2, FileX, Info,
} from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import {
  PageView, runKey, BASELINE_EM, LINE_HEIGHT,
  type Tool, type RunInfo, type RunEdit, type PageObject, type PendingImage,
} from '@/components/pdfEdit/PageView';
import { SignaturePad } from '@/components/pdfEdit/SignaturePad';
import type { Edit, EditReport } from '@/lib/pdfEdit/applyEdits';
import { hexToRgb } from '@/lib/pdfEdit/sampleColors';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ACCENT = { from: '#7c3aed', to: '#c4b5fd', soft: 'rgba(124,58,237,0.18)' };
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 300;

const TOOLS: { id: Tool; label: string; icon: typeof Type; hint: string }[] = [
  { id: 'edit', label: 'Edit text', icon: MousePointerClick, hint: 'Click any line of existing text to change it. Enter to finish, Esc to cancel.' },
  { id: 'text', label: 'Add text', icon: Type, hint: 'Click anywhere on the page to add a new text box.' },
  { id: 'whiteout', label: 'White-out', icon: Eraser, hint: 'Drag a box over anything you want to hide on the page.' },
  { id: 'highlight', label: 'Highlight', icon: Highlighter, hint: 'Drag a box over text to highlight it.' },
  { id: 'sign', label: 'Sign', icon: PenLine, hint: 'Draw or type your signature, then click where it goes.' },
  { id: 'image', label: 'Image', icon: ImagePlus, hint: 'Pick an image (logo, stamp, photo), then click where it goes.' },
];

const FAQS = [
  {
    q: 'Can I edit the existing text in my PDF?',
    a: 'Yes. Choose "Edit text" and click any line — it becomes editable in place. Edits work one line at a time: if your new text is longer, it extends to the right rather than re-flowing the paragraph, which is how most free PDF editors behave.',
  },
  {
    q: 'Does the edited text keep the original font?',
    a: 'Yes, whenever the PDF\'s own font contains every character you typed: the old text is deleted and your new text is written with the same font, size, spacing and colour. PDFs usually embed only the letters they use, so if you type a character the document never used, that line is written in the closest standard font instead. The text in the on-screen edit box is only a preview — the downloaded file uses the real font.',
  },
  {
    q: 'Is the original text deleted?',
    a: 'Yes, in most PDFs: the old text is removed from the file, not just hidden, so it can\'t be copied or extracted afterwards. For a few layouts (unusual fonts, text inside embedded graphics, some letter-spaced headings) a line can\'t be cut out safely; those lines are covered with a patch matching the background instead, and the message after downloading tells you how many. If you are removing confidential information, check that message says nothing was covered.',
  },
  {
    q: 'Can I sign a PDF with this?',
    a: 'Yes. Choose "Sign", draw your signature with a mouse or finger (or type it), then click where it should go. You can drag and resize it before downloading. This adds a visual signature, not a certificate-based digital signature (DSC).',
  },
  {
    q: 'Is my PDF uploaded to a server?',
    a: 'No. The PDF is opened, edited and saved entirely in your browser. Unlike most online PDF editors, nothing is sent to a server, so it is safe for invoices, bank statements and other private documents.',
  },
  {
    q: 'Why can\'t I click the text in my scanned PDF?',
    a: 'A scanned PDF is a picture of a page, with no real text inside. You can still use White-out, Add text, Highlight, Sign and Image on it.',
  },
];

let objSeq = 1;

function dataUrlToBytes(dataUrl: string) {
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Any browser-readable image → PNG/JPEG data URL plus its pixel size. */
function readImage(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image the browser can open'));
      img.onload = () => {
        let dataUrl = reader.result as string;
        if (!/^data:image\/(png|jpeg)/.test(dataUrl)) {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d')!.drawImage(img, 0, 0);
          dataUrl = c.toDataURL('image/png');
        }
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function EditPdf() {
  const [fileName, setFileName] = useState('');
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<Tool>('edit');
  const [runsByPage, setRunsByPage] = useState<Record<number, RunInfo[]>>({});
  const [runEdits, setRunEdits] = useState<Record<string, RunEdit>>({});
  const [objects, setObjects] = useState<PageObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImage | null>(null);
  const [showSign, setShowSign] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [width, setWidth] = useState(820);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const changeCount = Object.keys(runEdits).length + objects.length;

  // Fit pages to the available width.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.min(900, Math.max(280, Math.floor(e.contentRect.width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!changeCount) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [changeCount]);

  // Delete key removes the selected box/image (not while typing).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!selectedId || (e.key !== 'Delete' && e.key !== 'Backspace')) return;
      const t = e.target as HTMLElement;
      if (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      setObjects(prev => prev.filter(o => o.id !== selectedId));
      setSelectedId(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedId]);

  const reset = () => {
    doc?.destroy();
    setDoc(null); setPages([]); setBytes(null); setFileName('');
    setRunsByPage({}); setRunEdits({}); setObjects([]); setSelectedId(null); setPending(null); setTool('edit');
  };

  const open = async (file: File) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { toast.error('Please choose a PDF file.'); return; }
    if (file.size > MAX_BYTES) { toast.error('That PDF is over 50 MB — too large to edit in the browser.'); return; }
    if (changeCount && !window.confirm('Discard your edits to the current PDF?')) return;
    reset();
    setLoading(true);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      // pdf.js takes ownership of the buffer it's given, so it gets a copy.
      const pdf = await pdfjs.getDocument({ data: data.slice(), isEvalSupported: false }).promise;
      if (pdf.numPages > MAX_PAGES) { toast.error(`This PDF has ${pdf.numPages} pages — the editor handles up to ${MAX_PAGES}.`); pdf.destroy(); return; }
      const ps = await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)));
      setBytes(data); setDoc(pdf); setPages(ps); setFileName(file.name);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      toast.error(name === 'PasswordException'
        ? 'This PDF is password-protected. Remove the password first, then open it here.'
        : 'Could not open that PDF — it may be damaged.');
    } finally {
      setLoading(false);
    }
  };

  const onRuns = useCallback((index: number, runs: RunInfo[]) => setRunsByPage(prev => ({ ...prev, [index]: runs })), []);
  const onRunEdit = useCallback((key: string, edit: RunEdit | null) => setRunEdits(prev => {
    const next = { ...prev };
    if (edit) next[key] = edit; else delete next[key];
    return next;
  }), []);
  const onAdd = useCallback((o: Omit<PageObject, 'id'>) => {
    const id = `o${objSeq++}`;
    setObjects(prev => [...prev, { ...o, id }]);
    setSelectedId(id);
    return id;
  }, []);
  const onUpdate = useCallback((id: string, patch: Partial<PageObject>) =>
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o))), []);
  const onDelete = useCallback((id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(s => (s === id ? null : s));
  }, []);
  const onPlacePending = useCallback((page: number, x: number, y: number) => {
    if (!pending) return;
    // Signatures default to ~160pt wide; other images to their natural size, capped.
    const target = tool === 'sign' ? 160 : Math.min(220, pending.width);
    const w = target, h = target * (pending.height / pending.width);
    onAdd({ page, kind: 'image', x: x - w / 2, y: y - h / 2, w, h, src: pending.dataUrl });
    setPending(null);
    setTool('edit');
  }, [pending, tool, onAdd]);

  const pickTool = (t: Tool) => {
    setSelectedId(null);
    setTool(t);
    setPending(null);
    if (t === 'sign') setShowSign(true);
    if (t === 'image') imageInput.current?.click();
  };

  const objectsByPage = useMemo(() => {
    const m: Record<number, PageObject[]> = {};
    for (const o of objects) (m[o.page] ??= []).push(o);
    return m;
  }, [objects]);

  const download = async () => {
    if (!bytes || !pages.length) return;
    // Let a text box that's still focused commit its value first.
    (document.activeElement as HTMLElement | null)?.blur();
    await new Promise(r => setTimeout(r, 0));
    setSaving(true);
    try {
      const edits: Edit[] = [];
      for (const [key, e] of Object.entries(runEdits)) {
        const [p] = key.split(':');
        const page = Number(p);
        const run = runsByPage[page]?.find(r => runKey(page, r.id) === key);
        if (!run) continue;
        // Cover (fallback only) reaches the measured glyph band, so descenders don't peek out.
        const ascent = Math.max(run.ascent, (e.coverTop ?? -Infinity) - run.y);
        const descent = Math.max(run.descent, run.y - (e.coverBottom ?? Infinity));
        edits.push({
          kind: 'replace', page, x: run.x, y: run.y, width: run.width, ascent, descent,
          fontSize: run.fontSize, text: e.text, font: run.font, color: e.color, background: e.background,
        });
      }
      for (const o of objects) {
        const vp = pages[o.page].getViewport({ scale: 1 });
        const toPdf = (x: number, y: number) => vp.convertToPdfPoint(x, y) as [number, number];
        if (o.kind === 'whiteout' || o.kind === 'highlight') {
          const [ax, ay] = toPdf(o.x, o.y);
          const [bx, by] = toPdf(o.x + o.w, o.y + o.h);
          edits.push({
            kind: 'rect', page: o.page, x: Math.min(ax, bx), y: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay),
            color: o.kind === 'whiteout' ? [1, 1, 1] : [0.98, 0.8, 0.08], opacity: o.kind === 'whiteout' ? 1 : 0.4,
          });
        } else if (o.kind === 'text') {
          const size = o.fontSize ?? 12;
          const family = o.family ?? 'sans';
          const lines = (o.text ?? '').split('\n').map((text, i) => {
            const [x, y] = toPdf(o.x, o.y + (i * LINE_HEIGHT + BASELINE_EM[family]) * size);
            return { text, x, y };
          });
          edits.push({
            kind: 'text', page: o.page, lines, fontSize: size, font: { family, bold: false, italic: false },
            color: hexToRgb(o.color ?? '#000000'), rotation: vp.rotation,
          });
        } else if (o.kind === 'image' && o.src) {
          const [x, y] = toPdf(o.x, o.y + o.h); // bottom-left as the reader sees it
          edits.push({
            kind: 'image', page: o.page, x, y, width: o.w, height: o.h,
            bytes: dataUrlToBytes(o.src), format: o.src.startsWith('data:image/png') ? 'png' : 'jpg', rotation: vp.rotation,
          });
        }
      }
      // pdf-lib + fontkit are only needed to save, so they load on first download.
      const { applyEdits } = await import('@/lib/pdfEdit/applyEdits');
      const report: EditReport = { originalFont: 0, substituteFont: 0, covered: 0 };
      const out = await applyEdits(bytes.slice(), edits, {
        report,
        loadUnicodeFont: weight => fetch(weight === 'bold' ? unicodeBoldFontUrl : unicodeFontUrl).then(r => r.arrayBuffer()),
      });
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, '') + '-edited.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      const lines = report.originalFont + report.substituteFont + report.covered;
      if (!lines) toast.success('Edited PDF downloaded.');
      else {
        const parts = [
          report.originalFont && `${report.originalFont} in the PDF's own font`,
          report.substituteFont && `${report.substituteFont} in a similar font (a character wasn't in the original font)`,
          report.covered && `${report.covered} covered instead of deleted (that part of the PDF couldn't be edited safely)`,
        ].filter(Boolean);
        toast.success(`Edited PDF downloaded. ${lines} line${lines === 1 ? '' : 's'} changed: ${parts.join(', ')}.`, { duration: 8000 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(/encrypt/i.test(msg)
        ? 'This PDF is encrypted, so it can\'t be saved with changes.'
        : `Could not save the PDF${msg ? ` — ${msg}` : ''}.`);
    } finally {
      setSaving(false);
    }
  };

  const activeHint = pending
    ? 'Now click on the page where it should go.'
    : TOOLS.find(t => t.id === tool)?.hint;

  return (
    <ToolLayout
      seoTitle="Edit PDF Online Free — Edit Existing Text, Sign & White-out | HowAutomate Tools"
      seoDescription="Free online PDF editor that runs in your browser: click to edit existing text, add text, white-out, highlight, sign and add images. No upload, no watermark, no sign-up."
      path="/edit-pdf"
      eyebrow="PDF Editor"
      eyebrowIcon={FilePenLine}
      title="Edit PDF"
      subtitle="Click any line to change its text, or add text, signatures, images, highlights and white-out — then download. No watermark, no sign-up."
      note="Old text is deleted and rewritten in the PDF's own font where possible. One line at a time; paragraphs don't re-flow. Your PDF never leaves your browser."
      accent={ACCENT}
      faqs={FAQS}
      maxWidth={1000}
    >
      <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = ''; }} />
      <input ref={imageInput} type="file" accept="image/*" className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) { setTool('edit'); return; }
          try { setPending(await readImage(f)); } catch (err) { toast.error((err as Error).message); setTool('edit'); }
        }} />

      {!doc && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) open(f); }}
          onClick={() => fileInput.current?.click()}
          className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors"
          style={{ borderColor: dragOver ? ACCENT.from : 'rgba(255,255,255,0.15)', background: dragOver ? ACCENT.soft : 'rgba(255,255,255,0.03)', padding: '56px 24px' }}
        >
          {loading
            ? <Loader2 className="w-10 h-10 mx-auto animate-spin" style={{ color: ACCENT.to }} />
            : <Upload className="w-10 h-10 mx-auto" style={{ color: ACCENT.to }} />}
          <p className="text-white font-semibold text-lg mt-4">{loading ? 'Opening…' : 'Drop a PDF here or click to choose'}</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Up to 50 MB · opened in your browser, never uploaded</p>
        </div>
      )}

      {doc && (
        <>
          <div className="sticky top-[72px] z-30 -mx-2 px-2 py-2 mb-3 rounded-xl" style={{ background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(16px)' }}>
            <div className="flex flex-wrap items-center gap-1.5">
              {TOOLS.map(t => {
                const Icon = t.icon;
                const active = tool === t.id;
                return (
                  <button
                    key={t.id} onClick={() => pickTool(t.id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                    style={{
                      background: active ? ACCENT.soft : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? ACCENT.from : 'rgba(255,255,255,0.1)'}`,
                      color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
              <div className="flex-1" />
              <button onClick={() => { if (!changeCount || window.confirm('Discard your edits and close this PDF?')) reset(); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <FileX className="w-4 h-4" /> Close
              </button>
              <Button onClick={download} disabled={saving || !changeCount}
                style={{ background: changeCount ? `linear-gradient(135deg,${ACCENT.from},#2563eb)` : undefined, color: '#fff' }}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download{changeCount ? ` (${changeCount} change${changeCount === 1 ? '' : 's'})` : ''}
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Info className="w-3.5 h-3.5 shrink-0" /> {activeHint}
            </p>
          </div>

          <p className="text-xs mb-3 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {fileName} · {pages.length} page{pages.length === 1 ? '' : 's'}
          </p>

          <div ref={stageRef} className="space-y-6 pb-8">
            {pages.map((p, i) => (
              <div key={i}>
                <PageView
                  page={p} index={i} displayWidth={width} tool={tool}
                  runs={runsByPage[i]} onRuns={onRuns}
                  runEdits={runEdits} onRunEdit={onRunEdit}
                  objects={objectsByPage[i] ?? []} selectedId={selectedId} onSelect={setSelectedId}
                  onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete}
                  pending={pending} onPlacePending={onPlacePending}
                />
                <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Page {i + 1}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {showSign && (
        <SignaturePad
          onCancel={() => { setShowSign(false); setTool('edit'); }}
          onDone={png => { setShowSign(false); setPending({ dataUrl: png.dataUrl, width: png.width, height: png.height }); }}
        />
      )}
    </ToolLayout>
  );
}
