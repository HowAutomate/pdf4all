import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import ThemeToggle from '@/components/ThemeToggle';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { FileDropZone } from '@/components/FileDropZone';
import { ConversionProgress } from '@/components/ConversionProgress';
import { ConversionResult } from '@/components/ConversionResult';
import { ConversionHistory } from '@/components/ConversionHistory';
import { SupportedFormats } from '@/components/SupportedFormats';
import { useConversion } from '@/hooks/useConversion';
import { PAGES } from '@/data/pages';

const Index = () => {
  // One converter, several landing pages (/word-to-pdf, /excel-to-pdf, …).
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/pdf-converter';
  const meta = PAGES[route];
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { status, progress, error, results, history, convertFiles, reset, clearHistory, currentFileIndex, totalFiles } = useConversion();

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleClearFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = () => {
    if (selectedFiles.length > 0) {
      convertFiles(selectedFiles);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    reset();
  };

  const isProcessing = status === 'uploading' || status === 'converting';

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={meta.title}
        description={meta.description}
        path={route}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: meta.h1,
          url: `https://tools.howautomate.com${route}`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <header style={{ position:'sticky', top:0, zIndex:10, background:'rgba(7,4,15,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 40px', height:80, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', textDecoration:'none', opacity:1, transition:'opacity 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.opacity='0.82')}
            onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
            <img src={logo} alt="HowAutomate" style={{ height:56, width:'auto', display:'block' }} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{meta.h1}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{meta.intro}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="p-8 rounded-3xl bg-card border border-border shadow-lg">
                {status === 'idle' && (
                  <>
                    <FileDropZone
                      onFilesSelect={handleFilesSelect}
                      selectedFiles={selectedFiles}
                      onClearFile={handleClearFile}
                      onClearAll={() => setSelectedFiles([])}
                      disabled={isProcessing}
                    />

                    {selectedFiles.length > 0 && (
                      <div className="mt-6 animate-fade-in-up">
                        <Button
                          onClick={handleConvert}
                          size="lg"
                          className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity text-white font-semibold h-14 text-lg"
                        >
                          Convert {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} to PDF
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {isProcessing && (
                  <div>
                    <ConversionProgress status={status} progress={progress} />
                    {totalFiles > 1 && (
                      <p className="text-center text-sm text-muted-foreground mt-3">
                        Processing file {currentFileIndex} of {totalFiles}
                      </p>
                    )}
                  </div>
                )}

                {status === 'success' && results.length > 0 && (
                  <ConversionResult
                    results={results}
                    originalFileNames={selectedFiles.map(f => f.name)}
                    onReset={handleReset}
                  />
                )}

                {status === 'error' && (
                  <div className="text-center py-8 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Conversion Failed</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={handleReset} variant="outline">Try Again</Button>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <SupportedFormats />
              </div>
            </div>

            <div className="lg:col-span-1">
              <ConversionHistory history={history} onClear={clearHistory} />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Convert documents, images, and more to PDF instantly
          <div className="mt-2 text-xs">
            For genuine, lawful use only. <a href="/terms" className="underline">Terms of use</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
