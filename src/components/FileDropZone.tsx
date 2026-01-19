import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_FORMATS } from '@/types/conversion';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  disabled?: boolean;
}

export function FileDropZone({ onFileSelect, selectedFile, onClearFile, disabled }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    e.target.value = '';
  }, [onFileSelect]);

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
      {!selectedFile ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
            "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
            "hover:from-primary/10 hover:via-secondary/10 hover:to-accent/10",
            isDragging && "border-primary bg-primary/10 scale-[1.02]",
            !isDragging && "border-border hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="file"
            className="hidden"
            onChange={handleFileInput}
            accept={acceptFormats}
            disabled={disabled}
          />
          
          <div className={cn(
            "p-4 rounded-full mb-4 transition-all duration-300",
            "bg-gradient-to-br from-primary via-secondary to-accent",
            isDragging && "animate-bounce-gentle"
          )}>
            <Upload className="w-8 h-8 text-white" />
          </div>
          
          <p className="text-lg font-semibold text-foreground mb-1">
            {isDragging ? 'Drop your file here!' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse
          </p>
          
          <div className="flex flex-wrap justify-center gap-1 max-w-md px-4">
            {['.docx', '.xlsx', '.pptx', '.jpg', '.png', '.html'].map((ext) => (
              <span
                key={ext}
                className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {ext}
              </span>
            ))}
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
              +50 more
            </span>
          </div>
        </label>
      ) : (
        <div className="w-full p-6 border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearFile}
              disabled={disabled}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
