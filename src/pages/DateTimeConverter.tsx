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
      <header style={{ position:'sticky', top:0, zIndex:20, background:'rgba(7,4,15,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 40px', height:80, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', textDecoration:'none', opacity:1, transition:'opacity 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.opacity='0.82')}
            onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
            <img src={logo} alt="HowAutomate" style={{ height:56, width:'auto', display:'block' }} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Tool hero with live clock */}
      <div style={{ position:'relative', overflow:'hidden', background:'#07040f', padding:'72px 32px 64px', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(217,119,6,0.2) 0%, transparent 65%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize:'52px 52px' }}/>
        </div>
        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', padding:14, borderRadius:18, background:'linear-gradient(135deg,#d97706,#ea580c)', boxShadow:'0 8px 28px rgba(217,119,6,0.45)', marginBottom:20 }}>
            <Clock style={{ width:30, height:30, color:'#fff' }} />
          </div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,2.8rem)', fontWeight:900, color:'#fff', margin:'0 0 14px', letterSpacing:'-0.03em' }}>DateTime &#8596; Epoch</h1>
          <div style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.9)', letterSpacing:'0.04em' }}>
            {now.toLocaleTimeString()}
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:6, marginBottom:20 }}>
            {now.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
          <button onClick={handleNow} style={{ fontSize:13, fontWeight:600, padding:'9px 22px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.8)', cursor:'pointer', transition:'background 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.13)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.07)')}>
            Use Current Time
          </button>
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
