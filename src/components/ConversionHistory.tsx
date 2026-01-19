import { Download, Clock, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversionHistoryItem } from '@/types/conversion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversionHistoryProps {
  history: ConversionHistoryItem[];
  onClear: () => void;
}

export function ConversionHistory({ history, onClear }: ConversionHistoryProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (history.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Conversion History</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          Your converted files will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Conversion History</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
            {history.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-3 pr-4">
          {history.map((item, index) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.originalFileName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    → {item.convertedFileName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(item.fileSize)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <a href={item.downloadUrl} download={item.convertedFileName} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
