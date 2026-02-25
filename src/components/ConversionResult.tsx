import { Download, FileCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversionResult as ConversionResultType } from '@/types/conversion';

interface ConversionResultProps {
  results: ConversionResultType[];
  originalFileNames: string[];
  onReset: () => void;
}

export function ConversionResult({ results, originalFileNames, onReset }: ConversionResultProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-up">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-success via-success to-secondary flex items-center justify-center shadow-lg">
          <FileCheck className="w-10 h-10 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center text-foreground mb-2">
        Conversion Complete! 🎉
      </h2>
      <p className="text-center text-muted-foreground mb-6">
        {results.length === 1 ? 'Your file has been successfully converted to PDF' : `${results.length} files successfully converted to PDF`}
      </p>

      <div className="space-y-3 mb-6">
        {results.map((result, index) => (
          <div key={index} className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Original:</span>
              <span className="text-sm font-medium text-foreground truncate flex-1">{originalFileNames[index]}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Converted:</span>
              <span className="text-sm font-medium text-foreground truncate flex-1">{result.fileName}</span>
              <span className="text-xs text-muted-foreground">{formatFileSize(result.fileSize)}</span>
            </div>
            <Button
              asChild
              size="sm"
              className="w-full mt-3 bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity text-white font-semibold"
            >
              <a href={result.downloadUrl} download={result.fileName}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </a>
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="lg" onClick={onReset} className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" />
        Convert More Files
      </Button>
    </div>
  );
}
