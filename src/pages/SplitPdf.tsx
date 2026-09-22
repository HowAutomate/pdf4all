import { useState, useCallback, useRef, useMemo } from 'react';
import { Scissors, Upload, Download, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { ToolLayout } from '@/components/ToolLayout';
import { parsePageRanges } from '@/lib/pageRanges';
import { Button } from '@/components/ui/button';

const ACCENT = { from: '#e11d48', to: '#fb7185', soft: 'rgba(225,29,72,0.16)' };
const MAX_SIZE = 100 * 1024 * 1024;

type Mode = 'extract' | 'each' | 'every';

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'extract', label: 'Extract pages', desc: 'Pick pages → one PDF' },
  { id: 'each', label: 'Every page separately', desc: 'One PDF per page → ZIP' },
  { id: 'every', label: 'Split every N pages', desc: 'Fixed-size chunks → ZIP' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<Mode>('extract');
  const [ranges, setRanges] = useState('');
  const [chunkSize, setChunkSize] = useState(1);
  const [working, setWorking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setPageCount(0); setRanges(''); };

  const handleFile = async (f: File) => {
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { toast.error('Please choose a PDF file.'); return; }
    if (f.size > MAX_SIZE) { toast.error('File must be under 100 MB.'); return; }
    try {
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const count = doc.getPageCount();
      if (count < 2) { toast.error('This PDF has only one page — there is nothing to split.'); return; }
      setFile(f);
      setPageCount(count);
      setRanges(`1-${Math.min(count, 1)}`);
      setChunkSize(1);
    } catch {
      toast.error('Could not read this PDF. It may be password-protected or corrupted.');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const parsed = useMemo(
    () => mode === 'extract' && pageCount ? parsePageRanges(ranges, pageCount) : { indices: [] as number[], error: undefined },
    [mode, ranges, pageCount],
  );

  const outputCount = mode === 'each'
    ? pageCount
    : mode === 'every'
      ? Math.ceil(pageCount / Math.max(1, chunkSize))
      : 1;

  const canRun = !!file && !working && (mode !== 'extract' || (!parsed.error && parsed.indices.length > 0));

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Builds a new PDF containing exactly `indices` (zero-based) from `src`. */
  const buildPdf = async (src: PDFDocument, indices: number[]) => {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, indices);
    copied.forEach(p => out.addPage(p));
    return out.save({ useObjectStreams: true, addDefaultPage: false });
  };

  const run = async () => {
    if (!file) return;
    setWorking(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const base = file.name.replace(/\.pdf$/i, '');

      if (mode === 'extract') {
        const bytes = await buildPdf(src, parsed.indices);
        download(new Blob([bytes], { type: 'application/pdf' }), `${base}-extracted.pdf`);
        toast.success(`Extracted ${parsed.indices.length} page${parsed.indices.length === 1 ? '' : 's'}.`);
      } else {
        const size = mode === 'each' ? 1 : Math.max(1, Math.min(chunkSize, pageCount));
        const zip = new JSZip();
        const pad = String(Math.ceil(pageCount / size)).length;

        for (let start = 0, part = 1; start < pageCount; start += size, part++) {
          const indices = Array.from(
            { length: Math.min(size, pageCount - start) },
            (_, k) => start + k,
          );
          const bytes = await buildPdf(src, indices);
          const label = size === 1
            ? `page-${String(start + 1).padStart(pad, '0')}`
            : `part-${String(part).padStart(pad, '0')}_pages-${start + 1}-${start + indices.length}`;
          zip.file(`${base}-${label}.pdf`, bytes);
        }

        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        download(blob, `${base}-split.zip`);
        toast.success(`Split into ${outputCount} PDF${outputCount === 1 ? '' : 's'}, zipped.`);
      }
    } catch {
      toast.error('Could not split this PDF. It may be encrypted or corrupted.');
    } finally {
      setWorking(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 11,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.11)',
    color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <ToolLayout
      seoTitle="Split PDF — Extract or Separate PDF Pages Free | HowAutomate"
      seoDescription="Split a PDF into separate files or extract specific pages, free and in your browser. No upload, no signup, no watermark."
      path="/split-pdf"
      eyebrow="PDF Utility"
      eyebrowIcon={Scissors}
      title="Split PDF"
      subtitle="Pull out the pages you need, or break one PDF into many — in seconds."
      note="Everything runs in your browser. Your document is never uploaded to a server."
      accent={ACCENT}
      faqs={[
        { q: 'How do I extract just a few pages?', a: 'Choose "Extract pages" and type the pages you want, for example 1-3, 7, 10-12. You get a single PDF containing those pages in the order you listed them, and duplicates are ignored.' },
        { q: 'Why do I get a ZIP file?', a: 'When a split produces more than one PDF, browsers block downloading many files at once. Packing them into a single ZIP is the reliable way — open it with the built-in unzip tool on Windows, Mac, Android, or iOS.' },
        { q: 'What does "Split every N pages" do?', a: 'It cuts the document into equal chunks. With N set to 10, a 95-page PDF becomes ten files: nine of 10 pages and one final file with the remaining 5.' },
        { q: 'Are my files uploaded anywhere?', a: 'No. The split happens entirely inside your browser using pdf-lib. No server receives, stores, or sees your document.' },
        { q: 'Does the output have a watermark?', a: 'No. Each output PDF contains exactly the pages you selected, with nothing added.' },
        { q: 'It says my PDF cannot be read — why?', a: 'The file is almost certainly password-protected. Open it in a PDF reader, enter the password, save an unprotected copy, and split that copy instead.' },
      ]}
    >
      {/* Drop zone */}
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? `${ACCENT.from}b0` : 'rgba(255,255,255,0.12)'}`, borderRadius: 18, padding: '64px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'rgba(225,29,72,0.06)' : 'rgba(255,255,255,0.02)' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg,${ACCENT.from},#f43f5e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Upload size={22} style={{ color: '#fff' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Drop your PDF here</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>or click to browse — max 100 MB</p>
          <input ref={inputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>
      )}

      {file && (
        <>
          {/* Selected file */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${ACCENT.from},#f43f5e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={17} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{formatSize(file.size)} · {pageCount} pages</p>
            </div>
            <button onClick={reset} aria-label="Remove file"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {/* Mode picker */}
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>How should we split it?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {MODES.map(m => {
              const active = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)}
                  style={{ padding: '13px 15px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', border: active ? `1px solid ${ACCENT.from}88` : '1px solid rgba(255,255,255,0.09)', background: active ? 'rgba(225,29,72,0.1)' : 'rgba(255,255,255,0.04)', color: active ? ACCENT.to : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 700 }}>
                  <div style={{ marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: active ? `${ACCENT.to}bb` : 'rgba(255,255,255,0.28)' }}>{m.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Mode-specific input */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
            {mode === 'extract' && (
              <>
                <label htmlFor="ranges" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                  Pages to extract
                </label>
                <input
                  id="ranges" type="text" value={ranges} onChange={e => setRanges(e.target.value)}
                  placeholder={`e.g. 1-3, 7, 10-${pageCount}`}
                  style={{ ...fieldStyle, borderColor: parsed.error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.11)' }}
                />
                <p style={{ fontSize: 12, color: parsed.error ? '#f87171' : 'rgba(255,255,255,0.35)', marginTop: 8, lineHeight: 1.6 }}>
                  {parsed.error
                    ? parsed.error
                    : `${parsed.indices.length} page${parsed.indices.length === 1 ? '' : 's'} selected out of ${pageCount}. Separate pages and ranges with commas.`}
                </p>
              </>
            )}

            {mode === 'each' && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
                Each of the <strong style={{ color: '#fff' }}>{pageCount} pages</strong> becomes its own PDF,
                delivered as a single ZIP file.
              </p>
            )}

            {mode === 'every' && (
              <>
                <label htmlFor="chunk" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                  Pages per file
                </label>
                <input
                  id="chunk" type="number" min={1} max={pageCount} value={chunkSize}
                  onChange={e => setChunkSize(Math.max(1, Math.min(pageCount, Number(e.target.value) || 1)))}
                  style={{ ...fieldStyle, maxWidth: 160 }}
                />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8, lineHeight: 1.6 }}>
                  {pageCount} pages ÷ {chunkSize} = <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{outputCount} file{outputCount === 1 ? '' : 's'}</strong>, delivered as a ZIP.
                </p>
              </>
            )}
          </div>

          <Button
            onClick={run} disabled={!canRun}
            style={{ width: '100%', background: canRun ? `linear-gradient(135deg,${ACCENT.from},#f43f5e)` : 'rgba(255,255,255,0.07)', color: canRun ? '#fff' : 'rgba(255,255,255,0.35)', height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12, border: 'none', cursor: working ? 'wait' : canRun ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {working
              ? <><Loader2 size={16} className="animate-spin" /> Splitting…</>
              : mode === 'extract'
                ? <><Download size={16} /> Extract {parsed.indices.length || ''} page{parsed.indices.length === 1 ? '' : 's'}</>
                : <><Download size={16} /> Split into {outputCount} files (ZIP)</>}
          </Button>
        </>
      )}
    </ToolLayout>
  );
}
