import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const Index = () => {
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
        title="File to PDF Converter - HowAutomate Tools"
        description="Free online file to PDF converter. Convert documents, images, spreadsheets and more to PDF instantly in your browser."
        path="/pdf-converter"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'File to PDF Converter',
          url: 'https://tools.howautomate.com/pdf-converter',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="HowAutomate" className="h-12 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Convert Any File to{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                PDF
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your documents, images, spreadsheets, and more. Get perfectly formatted PDFs in seconds.
            </p>
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
        </div>
      </footer>
    </div>
  );
};

export default Index;
