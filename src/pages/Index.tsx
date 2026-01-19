import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileDropZone } from '@/components/FileDropZone';
import { ConversionProgress } from '@/components/ConversionProgress';
import { ConversionResult } from '@/components/ConversionResult';
import { ConversionHistory } from '@/components/ConversionHistory';
import { SupportedFormats } from '@/components/SupportedFormats';
import { useConversion } from '@/hooks/useConversion';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { status, progress, error, result, history, convertFile, reset, clearHistory } = useConversion();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleConvert = () => {
    if (selectedFile) {
      convertFile(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    reset();
  };

  const isProcessing = status === 'uploading' || status === 'converting';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">FileToPDF</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Convert Any File to{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                PDF
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your documents, images, spreadsheets, and more. Get a perfectly formatted PDF in seconds.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main converter area */}
            <div className="lg:col-span-2">
              <div className="p-8 rounded-3xl bg-card border border-border shadow-lg">
                {status === 'idle' && (
                  <>
                    <FileDropZone
                      onFileSelect={handleFileSelect}
                      selectedFile={selectedFile}
                      onClearFile={() => setSelectedFile(null)}
                      disabled={isProcessing}
                    />

                    {selectedFile && (
                      <div className="mt-6 animate-fade-in-up">
                        <Button
                          onClick={handleConvert}
                          size="lg"
                          className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity text-white font-semibold h-14 text-lg"
                        >
                          Convert to PDF
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {isProcessing && (
                  <ConversionProgress status={status} progress={progress} />
                )}

                {status === 'success' && result && selectedFile && (
                  <ConversionResult
                    result={result}
                    originalFileName={selectedFile.name}
                    onReset={handleReset}
                  />
                )}

                {status === 'error' && (
                  <div className="text-center py-8 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Conversion Failed
                    </h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={handleReset} variant="outline">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              {/* Supported formats */}
              <div className="mt-6">
                <SupportedFormats />
              </div>
            </div>

            {/* History sidebar */}
            <div className="lg:col-span-1">
              <ConversionHistory history={history} onClear={clearHistory} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Convert documents, images, and more to PDF instantly
        </div>
      </footer>
    </div>
  );
};

export default Index;
