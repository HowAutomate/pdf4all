import { useEffect, useState } from 'react';
import { Loader2, FileUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { ConversionStatus } from '@/types/conversion';
import { cn } from '@/lib/utils';

interface ConversionProgressProps {
  status: ConversionStatus;
  progress: number;
}

const statusMessages = {
  uploading: ['Uploading your file...', 'Sending to our servers...', 'Almost there...'],
  converting: [
    'Converting to PDF...',
    'Processing document...',
    'Applying magic ✨',
    'Optimizing output...',
    'Nearly done...',
  ],
};

export function ConversionProgress({ status, progress }: ConversionProgressProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (status === 'uploading' || status === 'converting') {
      const messages = statusMessages[status];
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setMessageIndex(0);
    }
  }, [status]);

  const currentMessage = status === 'uploading' || status === 'converting' 
    ? statusMessages[status][messageIndex] 
    : '';

  return (
    <div className="w-full max-w-md mx-auto py-8 animate-fade-in-up">
      {/* Animated icon container */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 animate-pulse-ring" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
          <div className="w-20 h-20 rounded-full bg-secondary/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* Main icon */}
        <div className={cn(
          "relative z-10 w-20 h-20 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary via-secondary to-accent shadow-lg"
        )}>
          {status === 'success' ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : status === 'uploading' ? (
            <FileUp className="w-10 h-10 text-white animate-bounce-gentle" />
          ) : (
            <Sparkles className="w-10 h-10 text-white animate-spin-slow" />
          )}
        </div>
      </div>

      {/* Status message */}
      <p className="text-center text-lg font-medium text-foreground mb-6 h-7 transition-all duration-300">
        {currentMessage}
      </p>

      {/* Progress bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
            "bg-gradient-to-r from-primary via-secondary to-accent",
            "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent",
            "after:animate-shimmer after:bg-[length:200%_100%]"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress percentage */}
      <p className="text-center text-sm text-muted-foreground mt-3">
        {progress}% complete
      </p>

      {/* Decorative dots */}
      <div className="flex justify-center gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full bg-primary",
              "animate-bounce-gentle"
            )}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
