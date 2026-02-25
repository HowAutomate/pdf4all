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
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 30) { clearInterval(progressInterval); return 30; }
          return prev + 5;
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      setStatus('converting');

      const conversionInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) { clearInterval(conversionInterval); return 90; }
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

      // Get the response as a blob (raw PDF binary)
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      // Try to extract filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      let fileName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) {
          fileName = match[1].replace(/['"]/g, '');
        }
      }

      const fileSize = blob.size;

      setProgress(100);
      const conversionResult: ConversionResult = { fileName, fileSize, downloadUrl };
      setResult(conversionResult);
      setStatus('success');

      setHistory((prev) => [{
        id: crypto.randomUUID(),
        originalFileName: file.name,
        convertedFileName: fileName,
        downloadUrl,
        fileSize,
        timestamp: new Date(),
      }, ...prev]);

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

  return { status, progress, error, result, history, convertFile, reset, clearHistory };
}
