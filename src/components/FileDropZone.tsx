import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_FORMATS } from '@/types/conversion';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  onClearFile: (index: number) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export function FileDropZone({ onFilesSelect, selectedFiles = [], onClearFile, onClearAll, disabled }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesSelect(files);
  }, [disabled, onFilesSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesSelect(files);
    e.target.value = '';
  }, [onFilesSelect]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const acceptFormats = SUPPORTED_FORMATS.join(',');

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
          "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
          "hover:from-primary/10 hover:via-secondary/10 hover:to-accent/10",
          isDragging && "border-primary bg-primary/10 scale-[1.02]",
          !isDragging && "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          selectedFiles.length > 0 ? "h-32" : "h-64"
        )}
      >
        <input
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept={acceptFormats}
          disabled={disabled}
          multiple
        />
        
        <div className={cn(
          "p-3 rounded-full mb-2 transition-all duration-300",
          "bg-gradient-to-br from-primary via-secondary to-accent",
          isDragging && "animate-bounce-gentle",
          selectedFiles.length > 0 && "p-2 mb-1"
        )}>
          <Upload className={cn("text-white", selectedFiles.length > 0 ? "w-5 h-5" : "w-8 h-8")} />
        </div>
        
        <p className={cn("font-semibold text-foreground", selectedFiles.length > 0 ? "text-sm mb-0" : "text-lg mb-1")}>
          {isDragging ? 'Drop your files here!' : selectedFiles.length > 0 ? 'Add more files' : 'Drag & drop your files here'}
        </p>
        {selectedFiles.length === 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">or click to browse (multi-select supported)</p>
            <div className="flex flex-wrap justify-center gap-1 max-w-md px-4">
              {['.docx', '.xlsx', '.pptx', '.jpg', '.png', '.html'].map((ext) => (
                <span key={ext} className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">{ext}</span>
              ))}
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">+50 more</span>
            </div>
          </>
        )}
      </label>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</span>
            <Button variant="ghost" size="sm" onClick={onClearAll} disabled={disabled} className="text-muted-foreground hover:text-destructive text-xs">
              Clear all
            </Button>
          </div>
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onClearFile(index)} disabled={disabled} className="text-muted-foreground hover:text-destructive h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
