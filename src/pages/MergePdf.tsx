import { useState, useCallback, useRef } from 'react';
import { Combine, Upload, Download, X, ArrowUp, ArrowDown, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';

const ACCENT = { from: '#7c3aed', to: '#a78bfa', soft: 'rgba(124,58,237,0.16)' };
const MAX_FILES = 25;
const MAX_TOTAL = 100 * 1024 * 1024;

interface Entry {
  id: number;
  file: File;
  pages: number | null;
  error?: string;
}

let nextId = 1;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

export default function MergePdf() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [merging, setMerging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    const rejected = files.length - pdfs.length;
    if (rejected > 0) toast.error(`${rejected} file${rejected > 1 ? 's were' : ' was'} skipped — PDFs only.`);
    if (!pdfs.length) return;

    let accepted: Entry[] = [];
    setEntries(prev => {
      const room = MAX_FILES - prev.length;
      if (room <= 0) { toast.error(`You can merge up to ${MAX_FILES} files at once.`); return prev; }
      if (pdfs.length > room) toast.error(`Only the first ${room} file${room > 1 ? 's' : ''} were added — ${MAX_FILES} max.`);
      accepted = pdfs.slice(0, room).map(file => ({ id: nextId++, file, pages: null }));
      return [...prev, ...accepted];
    });

    // Read the page count of each new file so the user can sanity-check the order.
    for (const entry of accepted) {
      try {
        const doc = await PDFDocument.load(await entry.file.arrayBuffer(), { ignoreEncryption: true });
        const pages = doc.getPageCount();
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, pages } : e));
      } catch {
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, error: 'Unreadable — likely password-protected' } : e));
      }
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const move = (index: number, delta: number) => setEntries(prev => {
    const target = index + delta;
    if (target < 0 || target >= prev.length) return prev;
    const next = [...prev];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const remove = (id: number) => setEntries(prev => prev.filter(e => e.id !== id));

  const usable = entries.filter(e => !e.error);
  const totalSize = entries.reduce((s, e) => s + e.file.size, 0);
  const totalPages = usable.reduce((s, e) => s + (e.pages ?? 0), 0);
  const stillReading = usable.some(e => e.pages === null);

  const merge = async () => {
    if (usable.length < 2) return;
    if (totalSize > MAX_TOTAL) { toast.error('Combined size must be under 100 MB.'); return; }
    setMerging(true);
    try {
      const out = await PDFDocument.create();
      for (const entry of usable) {
        const doc = await PDFDocument.load(await entry.file.arrayBuffer(), { ignoreEncryption: true });
        const copied = await out.copyPages(doc, doc.getPageIndices());
        copied.forEach(page => out.addPage(page));
      }
      const bytes = await out.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([bytes], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Merged ${usable.length} files into one PDF.`);
    } catch {
      toast.error('Could not merge these files. One of them may be encrypted or corrupted.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <ToolLayout
      seoTitle="Merge PDF — Combine PDF Files Online Free | HowAutomate"
      seoDescription="Combine multiple PDF files into one, free and in your browser. Reorder pages before merging, no upload, no signup, no watermark."
      path="/merge-pdf"
      eyebrow="PDF Utility"
      eyebrowIcon={Combine}
      title="Merge PDF"
      subtitle="Combine several PDFs into a single file — reorder them first, then download."
      note="Everything runs in your browser. Your documents are never uploaded to a server."
      accent={ACCENT}
      faqs={[
        { q: 'How many PDFs can I merge at once?', a: `Up to ${MAX_FILES} files, with a combined size of 100 MB. There is no limit on how many times you can use the tool.` },
        { q: 'Can I change the order of the files?', a: 'Yes. Each file in the list has up and down arrows. The merged PDF follows the order shown on screen, top to bottom, and the running page count tells you how long the result will be.' },
        { q: 'Are my files uploaded anywhere?', a: 'No. The merge happens entirely inside your browser using pdf-lib, a JavaScript library. No server receives, stores, or sees your documents.' },
        { q: 'Does the merged PDF have a watermark?', a: 'No. The output is a clean PDF containing exactly the pages of your source files, with no branding added.' },
        { q: 'Why does one of my files say it is unreadable?', a: 'That usually means the PDF is password-protected. Open it in a PDF reader, enter the password, save an unprotected copy, and merge that copy instead.' },
        { q: 'Are bookmarks and form fields kept?', a: 'Page content, text, and images are copied exactly. Document-level extras such as bookmarks, form fields, and attachments are not carried across — this is a page merger, not a full PDF editor.' },
      ]}
    >
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${dragOver ? `${ACCENT.from}b0` : 'rgba(255,255,255,0.12)'}`, borderRadius: 18, padding: entries.length ? '32px 24px' : '64px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)' }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg,${ACCENT.from},#2563eb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Upload size={22} style={{ color: '#fff' }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {entries.length ? 'Add more PDFs' : 'Drop your PDFs here'}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          or click to browse — up to {MAX_FILES} files, 100 MB total
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
        />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Merge order
            </p>
            <button
              onClick={() => setEntries([])}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              Clear all
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${entry.error ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 12, padding: '12px 14px' }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: 20, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: entry.error ? 'rgba(248,113,113,0.15)' : `linear-gradient(135deg,${ACCENT.from},#2563eb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={15} style={{ color: entry.error ? '#f87171' : '#fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.file.name}</p>
                  <p style={{ fontSize: 11, color: entry.error ? '#f87171' : 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {entry.error
                      ? entry.error
                      : `${formatSize(entry.file.size)}${entry.pages === null ? ' · reading…' : ` · ${entry.pages} page${entry.pages === 1 ? '' : 's'}`}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                    style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', padding: 5, display: 'flex' }}>
                    <ArrowUp size={15} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label="Move down"
                    style={{ background: 'none', border: 'none', cursor: i === entries.length - 1 ? 'default' : 'pointer', color: i === entries.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', padding: 5, display: 'flex' }}>
                    <ArrowDown size={15} />
                  </button>
                  <button onClick={() => remove(entry.id)} aria-label="Remove"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 5, display: 'flex' }}>
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + action */}
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              <span>{usable.length} file{usable.length === 1 ? '' : 's'} · {formatSize(totalSize)}</span>
              <span>{stillReading ? 'Counting pages…' : `${totalPages} page${totalPages === 1 ? '' : 's'} in output`}</span>
            </div>
            <Button
              onClick={merge}
              disabled={usable.length < 2 || merging}
              style={{ width: '100%', background: usable.length < 2 ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg,${ACCENT.from},#2563eb)`, color: usable.length < 2 ? 'rgba(255,255,255,0.35)' : '#fff', height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12, border: 'none', cursor: merging ? 'wait' : usable.length < 2 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {merging
                ? <><Loader2 size={16} className="animate-spin" /> Merging…</>
                : usable.length < 2
                  ? 'Add at least 2 PDFs to merge'
                  : <><Download size={16} /> Merge {usable.length} PDFs &amp; Download</>}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
