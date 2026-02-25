import { useState, useCallback } from 'react';
import { ConversionResult, ConversionHistoryItem, ConversionStatus } from '@/types/conversion';

const WEBHOOK_URL = 'https://n8n.srv1198552.hstgr.cloud/webhook/019ac7ab-9cd8-49a7-b638-5af54736536a';

export function useConversion() {
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);

  const convertFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 30) {
            clearInterval(progressInterval);
            return 30;
          }
          return prev + 5;
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      setStatus('converting');
      
      // Update progress during "conversion"
      const conversionInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(conversionInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      clearInterval(conversionInterval);

      if (!response.ok) {
        throw new Error('Conversion failed. Please try again.');
      }

      const data: ConversionResult[] = await response.json();
      
      if (!data?.[0]?.Files?.[0]?.Url) {
        throw new Error('Invalid response from conversion service.');
      }

      setProgress(100);
      setResult(data[0]);
      setStatus('success');

      // Add to history
      const historyItem: ConversionHistoryItem = {
        id: crypto.randomUUID(),
        originalFileName: file.name,
        convertedFileName: data[0].Files[0].FileName,
        downloadUrl: data[0].Files[0].Url,
        fileSize: data[0].Files[0].FileSize,
        timestamp: new Date(),
      };

      setHistory((prev) => [historyItem, ...prev]);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    status,
    progress,
    error,
    result,
    history,
    convertFile,
    reset,
    clearHistory,
  };
}
