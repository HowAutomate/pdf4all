import { useState } from 'react';
import { Clock, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DateTimeConverter = () => {
  const [dateInput, setDateInput] = useState('');
  const [epochInput, setEpochInput] = useState('');
  const [dateResult, setDateResult] = useState('');
  const [epochResult, setEpochResult] = useState('');

  const handleDateToEpoch = () => {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) throw new Error();
      const epochSeconds = Math.floor(date.getTime() / 1000);
      setEpochResult(`${epochSeconds} (seconds)\n${date.getTime()} (milliseconds)`);
    } catch {
      setEpochResult('Invalid date input');
    }
  };

  const handleEpochToDate = () => {
    try {
      let ts = parseInt(epochInput, 10);
      if (isNaN(ts)) throw new Error();
      // Auto-detect seconds vs milliseconds
      if (ts < 1e12) ts *= 1000;
      const date = new Date(ts);
      if (isNaN(date.getTime())) throw new Error();
      setDateResult(
        `UTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString()}\nISO: ${date.toISOString()}`
      );
    } catch {
      setDateResult('Invalid epoch timestamp');
    }
  };

  const handleNow = () => {
    const now = new Date();
    setDateInput(now.toISOString().slice(0, 16));
    setEpochInput(Math.floor(now.getTime() / 1000).toString());
    setEpochResult(`${Math.floor(now.getTime() / 1000)} (seconds)\n${now.getTime()} (milliseconds)`);
    setDateResult(`UTC: ${now.toUTCString()}\nLocal: ${now.toLocaleString()}\nISO: ${now.toISOString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="HowAutomate" className="h-12 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              DateTime{' '}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">↔ Epoch</span>{' '}
              Converter
            </h1>
            <p className="text-muted-foreground">Convert between human-readable dates and Unix timestamps.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleNow}>
              <Clock className="w-4 h-4 mr-1" /> Use Current Time
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" /> Date → Epoch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dateInput">Date & Time</Label>
                  <Input
                    id="dateInput"
                    type="datetime-local"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleDateToEpoch} className="w-full" disabled={!dateInput}>
                  Convert to Epoch
                </Button>
                {epochResult && (
                  <div className="p-4 rounded-xl bg-muted animate-fade-in-up">
                    <p className="text-xs text-muted-foreground mb-1">Epoch Timestamp</p>
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">{epochResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" /> Epoch → Date
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="epochInput">Epoch Timestamp</Label>
                  <Input
                    id="epochInput"
                    type="number"
                    placeholder="e.g. 1700000000"
                    value={epochInput}
                    onChange={(e) => setEpochInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleEpochToDate} className="w-full" disabled={!epochInput}>
                  Convert to Date
                </Button>
                {dateResult && (
                  <div className="p-4 rounded-xl bg-muted animate-fade-in-up">
                    <p className="text-xs text-muted-foreground mb-1">Date Result</p>
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">{dateResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Free online tools by{' '}
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            HowAutomate
          </a>
        </div>
      </footer>
    </div>
  );
};

export default DateTimeConverter;
