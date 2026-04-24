import { useState, useMemo } from 'react';
import { BookOpen, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
  speakingTime: number;
}

function analyze(text: string): Stats {
  const trimmed = text.trim();
  const words         = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const chars         = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const sentences     = trimmed ? (trimmed.match(/[^.!?]*[.!?]+/g) || [trimmed]).length : 0;
  const paragraphs    = trimmed ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
  const readingTime   = Math.max(1, Math.round(words / 200));
  const speakingTime  = Math.max(1, Math.round(words / 130));
  return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime, speakingTime };
}

const STATS_META = [
  { key: 'words',         label: 'Words',                 color: '#7c3aed' },
  { key: 'chars',         label: 'Characters',            color: '#2563eb' },
  { key: 'charsNoSpaces', label: 'Chars (no spaces)',     color: '#0891b2' },
  { key: 'sentences',     label: 'Sentences',             color: '#d97706' },
  { key: 'paragraphs',    label: 'Paragraphs',            color: '#059669' },
  { key: 'readingTime',   label: 'Reading time (min)',    color: '#db2777' },
  { key: 'speakingTime',  label: 'Speaking time (min)',   color: '#dc2626' },
] as const;

const WordCounter = () => {
  const [text, setText] = useState('');
  const stats = useMemo(() => analyze(text), [text]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Word Counter - HowAutomate Tools"
        description="Free online word counter. Count words, characters, sentences, paragraphs and estimate reading time instantly as you type."
        path="/word-counter"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Word Counter',
          url: 'https://tools.howautomate.com/word-counter',
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
        </div>
      </header>

      <div style={{ position:'relative', overflow:'hidden', background:'#07040f', padding:'72px 32px 64px', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(22,163,74,0.2) 0%, transparent 65%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize:'52px 52px' }}/>
        </div>
        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', padding:14, borderRadius:18, background:'linear-gradient(135deg,#16a34a,#059669)', boxShadow:'0 8px 28px rgba(22,163,74,0.45)', marginBottom:20 }}>
            <BookOpen style={{ width:30, height:30, color:'#fff' }} />
          </div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,2.8rem)', fontWeight:900, color:'#fff', margin:'0 0 14px', letterSpacing:'-0.03em' }}>Word Counter</h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.48)', lineHeight:1.7, margin:0 }}>
            Paste or type your text below. Word count, character count, reading time — all calculated live as you type.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS_META.slice(0, 4).map(m => (
              <Card key={m.key} className="shadow-sm">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-extrabold" style={{ color: m.color }}>
                    {stats[m.key]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {STATS_META.slice(4).map(m => (
              <Card key={m.key} className="shadow-sm">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-extrabold" style={{ color: m.color }}>
                    {stats[m.key]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Textarea */}
          <Card className="shadow-lg">
            <CardContent className="pt-4">
              <div className="relative">
                <textarea
                  className="w-full min-h-[260px] p-4 rounded-xl bg-muted/50 border border-border text-foreground text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
                  placeholder="Paste or type your text here…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  spellCheck={false}
                />
                {text && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-7 w-7 opacity-60 hover:opacity-100"
                    onClick={() => setText('')}
                    title="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Reading speed: ~200 wpm &nbsp;·&nbsp; Speaking speed: ~130 wpm
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

export default WordCounter;
