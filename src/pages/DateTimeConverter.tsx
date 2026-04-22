import { useState, useEffect } from 'react';
import { Clock, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import ThemeToggle from '@/components/ThemeToggle';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DateTimeConverter = () => {
  const [now, setNow] = useState(new Date());
  const [dateInput, setDateInput] = useState('');
  const [epochInput, setEpochInput] = useState('');
  const [dateResult, setDateResult] = useState('');
  const [epochResult, setEpochResult] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleDateToEpoch = () => {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) throw new Error();
      setEpochResult(Math.floor(date.getTime() / 1000) + ' (seconds)\n' + date.getTime() + ' (milliseconds)');
    } catch {
      setEpochResult('Invalid date input');
    }
  };

  const handleEpochToDate = () => {
    try {
      let ts = parseInt(epochInput, 10);
      if (isNaN(ts)) throw new Error();
      if (ts < 1e12) ts *= 1000;
      const date = new Date(ts);
      if (isNaN(date.getTime())) throw new Error();
      setDateResult('UTC: ' + date.toUTCString() + '\nLocal: ' + date.toLocaleString() + '\nISO: ' + date.toISOString());
    } catch {
      setDateResult('Invalid epoch timestamp');
    }
  };

  const handleNow = () => {
    const n = new Date();
    setDateInput(n.toISOString().slice(0, 16));
    setEpochInput(String(Math.floor(n.getTime() / 1000)));
    setEpochResult(Math.floor(n.getTime() / 1000) + ' (seconds)\n' + n.getTime() + ' (milliseconds)');
    setDateResult('UTC: ' + n.toUTCString() + '\nLocal: ' + n.toLocaleString() + '\nISO: ' + n.toISOString());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="DateTime \u2194 Epoch Converter - HowAutomate Tools"
        description="Convert between human-readable dates and Unix epoch timestamps instantly. Free online datetime converter."
        path="/datetime-converter"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'DateTime to Epoch Converter',
          url: 'https://tools.howautomate.com/datetime-converter',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="HowAutomate" className="h-10 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Tool hero with live clock */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">DateTime &#8596; Epoch</h1>
          <div className="font-mono text-white/90 text-lg font-semibold tabular-nums">
            {now.toLocaleTimeString()}
          </div>
          <div className="text-white/60 text-sm mt-1">
            {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <Button variant="outline" size="sm" className="mt-4 text-white border-white/30 bg-white/10 hover:bg-white/20 hover:text-white" onClick={handleNow}>
            Use Current Time
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Date &rarr; Epoch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dateInput">Date &amp; Time</Label>
                  <Input id="dateInput" type="datetime-local" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
                </div>
                <Button onClick={handleDateToEpoch} className="w-full" disabled={!dateInput}>
                  Convert to Epoch
                </Button>
                {epochResult && (
                  <div className="p-4 rounded-xl bg-muted animate-in fade-in duration-200">
                    <p className="text-xs text-muted-foreground mb-1">Epoch Timestamp</p>
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">{epochResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Epoch &rarr; Date
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="epochInput">Epoch Timestamp</Label>
                  <Input id="epochInput" type="number" placeholder="e.g. 1700000000" value={epochInput} onChange={(e) => setEpochInput(e.target.value)} />
                </div>
                <Button onClick={handleEpochToDate} className="w-full" disabled={!epochInput}>
                  Convert to Date
                </Button>
                {dateResult && (
                  <div className="p-4 rounded-xl bg-muted animate-in fade-in duration-200">
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
