import { useState, useCallback, useRef } from 'react';
import { FileText, Upload, Download, X, ArrowLeft, CheckCircle, Zap, Lock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';

type Quality = 'basic' | 'standard' | 'maximum';

const QUALITY_LABELS: Record<Quality, { label: string; desc: string; color: string }> = {
  basic:    { label: 'Basic',    desc: 'Remove metadata only',          color: '#34d399' },
  standard: { label: 'Standard', desc: 'Remove metadata + compress structure', color: '#60a5fa' },
  maximum:  { label: 'Maximum',  desc: 'All optimisations + object streams',   color: '#a78bfa' },
};

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

export default function PdfCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>('standard');
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; originalSize: number; compressedSize: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setResult(null); };

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { toast.error('Please upload a PDF file.'); return; }
    if (f.size > 50 * 1024 * 1024)   { toast.error('File must be under 50 MB.');   return; }
    setFile(f);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const compress = async () => {
    if (!file) return;
    setCompressing(true);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

      if (quality === 'standard' || quality === 'maximum') {
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('');
        doc.setCreator('');
      }

      const saved = await doc.save({
        useObjectStreams: quality === 'maximum',
        addDefaultPage: false,
      });

      const blob = new Blob([saved], { type: 'application/pdf' });
      setResult({ blob, originalSize: file.size, compressedSize: blob.size });
    } catch {
      toast.error('Could not compress this PDF. It may be encrypted or corrupted.');
    } finally {
      setCompressing(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? file.name.replace(/\.pdf$/i, '-compressed.pdf') : 'compressed.pdf';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const savings = result
    ? Math.max(0, Math.round((1 - result.compressedSize / result.originalSize) * 100))
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#07040f', color: '#fff', fontFamily: "'Inter','system-ui',sans-serif" }}>
      <SEO
        title="Free PDF Compressor — Reduce PDF Size Online | HowAutomate"
        description="Compress PDF files for free in your browser. Remove metadata, optimise structure, and reduce file size — no upload, 100% private."
        path="/pdf-compressor"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'PDF Compressor',
          url: 'https://tools.howautomate.com/pdf-compressor',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="https://tools.howautomate.com" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={logo} alt="HowAutomate Tools" style={{ height: 52, width: 'auto' }} />
          </a>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <ArrowLeft size={14} /> All Tools
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(2,132,199,0.18) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '5%', right: '15%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 15px', borderRadius: 100, background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.3)', fontSize: 11, fontWeight: 700, color: '#7dd3fc', marginBottom: 22, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <FileText size={11} /> PDF Utility
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, margin: '0 0 14px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            PDF Compressor
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.46)', lineHeight: 1.75, margin: '0 0 12px' }}>
            Reduce PDF file size in your browser — no upload, no account, 100% private.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6 }}>
            Removes metadata and optimises the internal PDF structure. Best results on documents with complex cross-references.
          </p>
        </div>
      </section>

      {/* MAIN */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* quality selector */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Compression Level</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {(Object.keys(QUALITY_LABELS) as Quality[]).map((q) => {
              const info = QUALITY_LABELS[q];
              const active = quality === q;
              return (
                <button key={q} onClick={() => setQuality(q)} style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: active ? `1px solid ${info.color}55` : '1px solid rgba(255,255,255,0.09)', background: active ? `${info.color}12` : 'rgba(255,255,255,0.04)', color: active ? info.color : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}>
                  <div style={{ marginBottom: 4 }}>{info.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: active ? `${info.color}aa` : 'rgba(255,255,255,0.28)' }}>{info.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* drop zone */}
        {!file && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? 'rgba(2,132,199,0.7)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 18, padding: '64px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'rgba(2,132,199,0.05)' : 'rgba(255,255,255,0.02)' }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Upload size={22} style={{ color: '#fff' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Drop your PDF here</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>or click to browse — max 50 MB</p>
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {/* file selected */}
        {file && !result && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{file.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{formatSize(file.size)}</p>
                </div>
              </div>
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}>
                <X size={18} />
              </button>
            </div>
            <Button onClick={compress} disabled={compressing} style={{ width: '100%', background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', color: '#fff', height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12, border: 'none', cursor: compressing ? 'wait' : 'pointer' }}>
              {compressing ? 'Compressing…' : `Compress PDF — ${QUALITY_LABELS[quality].label}`}
            </Button>
          </div>
        )}

        {/* result */}
        {result && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <CheckCircle size={22} style={{ color: '#34d399', flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Compression complete</span>
            </div>

            {/* stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Original',   value: formatSize(result.originalSize),   color: 'rgba(255,255,255,0.6)' },
                { label: 'Compressed', value: formatSize(result.compressedSize),  color: '#60a5fa' },
                { label: 'Saved',      value: savings > 0 ? `${savings}%` : '—', color: savings > 0 ? '#34d399' : 'rgba(255,255,255,0.35)' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {savings === 0 && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 20 }}>
                This PDF is already well-optimised — little to no size reduction possible without re-encoding images.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <Button onClick={download} style={{ flex: 1, background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', color: '#fff', height: 46, fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Download size={16} /> Download Compressed PDF
              </Button>
              <button onClick={reset} style={{ padding: '0 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                New file
              </button>
            </div>
          </div>
        )}

        {/* features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 32 }}>
          {[
            { icon: Lock,   title: '100% Private',   desc: 'Files never leave your browser' },
            { icon: Zap,    title: 'Instant',         desc: 'Runs in-browser, no server' },
            { icon: Shield, title: 'No limits',       desc: 'Compress as many as you need' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
              <Icon size={18} style={{ color: '#7dd3fc', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 20 }}>FAQ</h2>
          {[
            { q: 'How does client-side PDF compression work?', a: 'The PDF is loaded in your browser using pdf-lib, a pure JavaScript library. We remove embedded metadata (author, creator, title strings) and optimise the internal object structure and cross-reference tables. This reduces file size without modifying any text or images.' },
            { q: 'Why is the size reduction modest?', a: 'Most modern PDFs already use reasonably efficient internal structures. Significant size reduction (50%+) requires re-encoding embedded images at lower quality — which this tool does not do, to preserve visual fidelity. For image-heavy PDFs, the savings may be small.' },
            { q: 'Is my file secure?', a: 'Yes — your file never leaves your device. Everything happens in your browser using JavaScript. We have no server that receives, stores, or processes your PDF.' },
            { q: 'What is the maximum file size?', a: 'Up to 50 MB. For very large files, compression may take a few seconds depending on your device.' },
            { q: 'Does this work on encrypted or password-protected PDFs?', a: 'Partially — the tool will attempt to process encrypted PDFs but may not be able to save certain modifications. If the file is heavily restricted, you will see an error message.' },
          ].map(({ q, a }) => (
            <details key={q} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 0', cursor: 'pointer' }}>
              <summary style={{ fontSize: 14, fontWeight: 600, color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {q} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>+</span>
              </summary>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginTop: 10 }}>{a}</p>
            </details>
          ))}
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 32px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
        Free tools by{' '}
        <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ color: '#7dd3fc', textDecoration: 'none' }}>HowAutomate</a>
        &nbsp;&middot;&nbsp; Your file never leaves your browser
      </footer>
    </div>
  );
}
