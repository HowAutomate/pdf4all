import { useState, useCallback } from 'react';
import { Lock, RefreshCw, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

function generate(length: number, opts: Record<string, boolean>): string {
  const pool = [
    opts.upper   ? CHARS.upper   : '',
    opts.lower   ? CHARS.lower   : '',
    opts.numbers ? CHARS.numbers : '',
    opts.symbols ? CHARS.symbols : '',
  ].join('');
  if (!pool) return '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => pool[n % pool.length]).join('');
}

function strength(pw: string): { label: string; color: string; pct: number } {
  if (!pw) return { label: '', color: '#374151', pct: 0 };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 16) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  if (s <= 2) return { label: 'Weak',        color: '#ef4444', pct: 25 };
  if (s === 3) return { label: 'Fair',        color: '#f97316', pct: 50 };
  if (s === 4) return { label: 'Good',        color: '#eab308', pct: 70 };
  if (s === 5) return { label: 'Strong',      color: '#22c55e', pct: 85 };
  return              { label: 'Very Strong', color: '#10b981', pct: 100 };
}

const PasswordGenerator = () => {
  const [length,  setLength]  = useState(16);
  const [opts,    setOpts]    = useState({ upper: true, lower: true, numbers: true, symbols: true });
  const [pw,      setPw]      = useState(() => generate(16, { upper: true, lower: true, numbers: true, symbols: true }));
  const [copied,  setCopied]  = useState(false);

  const regenerate = useCallback(() => setPw(generate(length, opts)), [length, opts]);

  const toggle = (key: string) => {
    const next = { ...opts, [key]: !opts[key] };
    if (!Object.values(next).some(Boolean)) return; // keep at least one
    setOpts(next);
    setPw(generate(length, next));
  };

  const changeLength = (v: number) => {
    setLength(v);
    setPw(generate(v, opts));
  };

  const copy = async () => {
    if (!pw) return;
    await navigator.clipboard.writeText(pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const str = strength(pw);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Password Generator - HowAutomate Tools"
        description="Generate strong, random passwords with custom length, uppercase, lowercase, numbers and symbols. Free, in-browser, no data sent anywhere."
        path="/password-generator"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Password Generator',
          url: 'https://tools.howautomate.com/password-generator',
          applicationCategory: 'SecurityApplication',
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
        </div>
      </header>

      <div style={{ position:'relative', overflow:'hidden', background:'#07040f', padding:'72px 32px 64px', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(220,38,38,0.2) 0%, transparent 65%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize:'52px 52px' }}/>
        </div>
        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', padding:14, borderRadius:18, background:'linear-gradient(135deg,#dc2626,#ea580c)', boxShadow:'0 8px 28px rgba(220,38,38,0.45)', marginBottom:20 }}>
            <Lock style={{ width:30, height:30, color:'#fff' }} />
          </div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,2.8rem)', fontWeight:900, color:'#fff', margin:'0 0 14px', letterSpacing:'-0.03em' }}>Password Generator</h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.48)', lineHeight:1.7, margin:0 }}>
            Generate strong, random passwords instantly. Everything runs in your browser — nothing is sent anywhere.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Password display */}
          <Card className="shadow-lg">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-base font-mono bg-muted rounded-lg px-4 py-3 overflow-x-auto whitespace-nowrap select-all tracking-wider">
                  {pw || <span className="text-muted-foreground">Select options below</span>}
                </code>
                <Button variant="outline" size="icon" onClick={copy} title="Copy password">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={regenerate} title="Generate new">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Strength bar */}
              {pw && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Strength</span>
                    <span style={{ color: str.color }} className="font-semibold">{str.label}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${str.pct}%`, background: str.color }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="shadow-lg">
            <CardContent className="pt-5 space-y-5">

              {/* Length slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold">Length</label>
                  <span className="text-sm font-bold text-primary">{length}</span>
                </div>
                <input
                  type="range" min={6} max={64} value={length}
                  onChange={e => changeLength(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>6</span><span>64</span>
                </div>
              </div>

              {/* Character set toggles */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['upper',   'Uppercase (A–Z)'],
                  ['lower',   'Lowercase (a–z)'],
                  ['numbers', 'Numbers (0–9)'],
                  ['symbols', 'Symbols (!@#…)'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      opts[key]
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-muted/40 border-border text-muted-foreground'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${opts[key] ? 'bg-primary border-primary text-white' : 'border-muted-foreground'}`}>
                      {opts[key] ? '✓' : ''}
                    </span>
                    {label}
                  </button>
                ))}
              </div>

              <Button onClick={regenerate} className="w-full" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" /> Generate Password
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Security tips:</strong> Use a unique password for every account. Passwords are generated using <code>crypto.getRandomValues()</code> — cryptographically secure and never transmitted. Use a password manager to store them safely.
              </p>
            </CardContent>
          </Card>

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

export default PasswordGenerator;
