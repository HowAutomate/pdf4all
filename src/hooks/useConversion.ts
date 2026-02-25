import { useState, useCallback } from 'react';
import { ConversionResult, ConversionHistoryItem, ConversionStatus } from '@/types/conversion';

const WEBHOOK_URL = 'https://n8n.srv1198552.hstgr.cloud/webhook/019ac7ab-9cd8-49a7-b638-5af54736536a';

export function useConversion() {
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const convertFiles = useCallback(async (files: File[]) => {
    setStatus('uploading');
    setProgress(0);
    setError(null);
    setResults([]);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);

    const completedResults: ConversionResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        const baseProgress = (i / files.length) * 100;
        const fileWeight = 100 / files.length;

        setProgress(Math.round(baseProgress));
        setStatus(i === 0 ? 'uploading' : 'converting');

        const formData = new FormData();
        formData.append('file', file);

        setProgress(Math.round(baseProgress + fileWeight * 0.3));
        setStatus('converting');

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Conversion failed for ${file.name}. Please try again.`);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        const disposition = response.headers.get('Content-Disposition');
        let fileName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
        if (disposition) {
          const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match?.[1]) fileName = match[1].replace(/['"]/g, '');
        }

        const result: ConversionResult = { fileName, fileSize: blob.size, downloadUrl };
        completedResults.push(result);

        setHistory((prev) => [{
          id: crypto.randomUUID(),
          originalFileName: file.name,
          convertedFileName: fileName,
          downloadUrl,
          fileSize: blob.size,
          timestamp: new Date(),
        }, ...prev]);

        setProgress(Math.round(baseProgress + fileWeight));
      }

      setProgress(100);
      setResults(completedResults);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResults([]);
    setCurrentFileIndex(0);
    setTotalFiles(0);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { status, progress, error, results, history, convertFiles, reset, clearHistory, currentFileIndex, totalFiles };
}
