import React, { useState, useMemo, useRef } from 'react';
import { FileText, Sparkles, HeartPulse, Clock, ArrowRight, BookOpen, Search, Zap, Lock, Gift, Smartphone, ExternalLink } from 'lucide-react';
import logo from '@/assets/logo-transparent.png';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

/* ── 3-D tilt card ──────────────────────────────────────────────────── */
const TiltCard: React.FC<{ children: React.ReactNode; className?: string; disabled?: boolean }> = ({
  children, className = '', disabled = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 22;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * -22;
    ref.current.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(12px)`;
    ref.current.style.transition = 'transform 0.05s ease-out';
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={className} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
      {children}
    </div>
  );
};

/* ── data ───────────────────────────────────────────────────────────── */
const allTools = [
  {
    title: 'File to PDF', desc: 'Convert documents, images & spreadsheets to PDFs instantly.',
    icon: FileText, path: '/pdf-converter',
    from: '#7c3aed', to: '#2563eb', glow: 'rgba(124,58,237,0.5)',
    category: 'PDF', badge: 'Popular', live: true,
  },
  {
    title: 'BMI Calculator', desc: 'Calculate Body Mass Index with a visual gauge and instant insights.',
    icon: HeartPulse, path: '/bmi-calculator',
    from: '#db2777', to: '#e11d48', glow: 'rgba(219,39,119,0.5)',
    category: 'Health', badge: null, live: true,
  },
  {
    title: 'DateTime \u2194 Epoch', desc: 'Switch between human dates and Unix timestamps with a live clock.',
    icon: Clock, path: '/datetime-converter',
    from: '#d97706', to: '#ea580c', glow: 'rgba(217,119,6,0.5)',
    category: 'Developer', badge: null, live: true,
  },
  {
    title: 'UGC Creator', desc: 'Build stunning social media & ad creatives in seconds.',
    icon: Sparkles, path: '/ugc-content',
    from: '#059669', to: '#0891b2', glow: 'rgba(5,150,105,0.5)',
    category: 'Marketing', badge: 'New', live: true,
  },
  {
    title: 'PDF Compressor', desc: 'Shrink PDFs without quality loss.',
    icon: FileText, path: null, from: '#0284c7', to: '#0ea5e9', glow: 'rgba(2,132,199,0.3)',
    category: 'PDF', badge: 'Soon', live: false,
  },
  {
    title: 'Image to PDF', desc: 'Batch convert JPG / PNG / WebP into one PDF.',
    icon: FileText, path: null, from: '#7c3aed', to: '#a855f7', glow: 'rgba(124,58,237,0.3)',
    category: 'PDF', badge: 'Soon', live: false,
  },
  {
    title: 'Password Gen', desc: 'Strong random passwords, custom length & charset.',
    icon: Lock, path: null, from: '#dc2626', to: '#ea580c', glow: 'rgba(220,38,38,0.3)',
    category: 'Developer', badge: 'Soon', live: false,
  },
  {
    title: 'Word Counter', desc: 'Words, chars, sentences & reading time — instant.',
    icon: BookOpen, path: null, from: '#16a34a', to: '#059669', glow: 'rgba(22,163,74,0.3)',
    category: 'Utilities', badge: 'Soon', live: false,
  },
];

const cats = ['All', 'PDF', 'Health', 'Developer', 'Marketing', 'Utilities'];

const features = [
  { icon: Zap,        title: 'Instant',      desc: 'Runs in your browser — no upload, no wait.',      from: '#d97706', to: '#f59e0b' },
  { icon: Lock,       title: '100% Private', desc: 'Files never leave your device, ever.',              from: '#7c3aed', to: '#6366f1' },
  { icon: Gift,       title: 'Always Free',  desc: 'No credits, no subscriptions, no tricks.',          from: '#059669', to: '#10b981' },
  { icon: Smartphone, title: 'Any Device',   desc: 'Perfectly responsive on mobile, tablet & desktop.', from: '#db2777', to: '#ec4899' },
];

/* ── component ──────────────────────────────────────────────────────── */
const Home = () => {
  const [search, setSearch]   = useState('');
  const [cat, setCat]         = useState('All');

  const filtered = useMemo(() =>
    allTools.filter(t =>
      (cat === 'All' || t.category === cat) &&
      (t.title.toLowerCase().includes(search.toLowerCase()) ||
       t.desc.toLowerCase().includes(search.toLowerCase()))
    ), [search, cat]);

  return (
    <div style={{ background: '#06030f', minHeight: '100vh', color: '#fff', fontFamily: 'inherit' }}>
      <SEO
        title="Free Online Tools — HowAutomate"
        description="100% free browser-based tools: PDF converter, BMI calculator, epoch converter and more. No signup, no limits."
        path="/"
        jsonLd={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'HowAutomate Free Tools', url: 'https://tools.howautomate.com' }}
      />

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,3,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 1, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <img src={logo} alt="HowAutomate" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </a>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="https://howautomate.com/blog" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              <BookOpen style={{ width: 15, height: 15 }} /> Blog <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
            <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', textDecoration: 'none', transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Visit HowAutomate
            </a>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 80px', textAlign: 'center' }}>
        {/* animated bg orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="animate-orb-1" style={{ position: 'absolute', top: '-10%', left: '-5%',  width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
          <div className="animate-orb-2" style={{ position: 'absolute', top: '20%',  right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)' }} />
          <div className="animate-orb-3" style={{ position: 'absolute', bottom: '-5%',left: '30%',  width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)' }} />
          {/* grid overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          {/* live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            100% Free &nbsp;&middot;&nbsp; No Signup &nbsp;&middot;&nbsp; Privacy First
          </div>

          {/* headline */}
          <h1 style={{ fontSize: 'clamp(2.6rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20 }}>
            Free Online Tools
            <br />
            <span className="animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #60a5fa, #f472b6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              for Everyone
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Convert, calculate, and create &mdash; right in your browser. No uploads. No accounts. Always free.
          </p>

          {/* search */}
          <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto 48px' }}>
            <Search style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search tools..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '15px 18px 15px 50px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* stats */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '24px 48px' }}>
            {[['4+','Live Tools'],['0','Signups'],['\u221e','Free Usage'],['100%','In-Browser']].map(([n,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY FILTER ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 32px', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: cat === c ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'rgba(255,255,255,0.06)',
              color: cat === c ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: cat === c ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── TOOL GRID ── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
        {search && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            {filtered.length} tool{filtered.length !== 1 ? 's' : ''} for <strong style={{ color: '#fff' }}>"{search}"</strong>
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {filtered.map(tool => {
            const Icon = tool.icon;
            const card = (
              <TiltCard disabled={!tool.live}
                className={'glass-card glass-card-hover gradient-border'}
                style={{ borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', opacity: tool.live ? 1 : 0.45 } as React.CSSProperties}>
                {/* glow top-left */}
                {tool.live && (
                  <div style={{ position: 'absolute', top: -40, left: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${tool.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
                )}

                {/* badge */}
                {tool.badge && (
                  <span style={{ position: 'absolute', top: 18, right: 18, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase',
                    background: tool.badge === 'Soon' ? 'rgba(255,255,255,0.08)' : tool.badge === 'Popular' ? 'rgba(124,58,237,0.3)' : 'rgba(5,150,105,0.3)',
                    color: tool.badge === 'Soon' ? 'rgba(255,255,255,0.4)' : '#fff',
                    border: `1px solid ${tool.badge === 'Soon' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                  }}>
                    {tool.badge}
                  </span>
                )}

                {/* icon */}
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${tool.from}, ${tool.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: `0 8px 24px ${tool.glow}`, flexShrink: 0 }}>
                  <Icon style={{ width: 22, height: 22, color: '#fff' }} />
                </div>

                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8, marginRight: 40 }}>{tool.title}</h2>
                <p  style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, flex: 1, marginBottom: 20 }}>{tool.desc}</p>

                {tool.live && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, background: `linear-gradient(90deg, ${tool.from}, ${tool.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Open Tool <ArrowRight style={{ width: 14, height: 14, color: tool.to, WebkitTextFillColor: tool.to }} />
                  </div>
                )}
              </TiltCard>
            );

            return tool.live
              ? <Link key={tool.title} to={tool.path!} style={{ textDecoration: 'none', display: 'flex' }}>{card}</Link>
              : <div key={tool.title} style={{ display: 'flex' }}>{card}</div>;
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>No tools found</p>
            <p style={{ fontSize: 14 }}>Try a different search or select "All"</p>
          </div>
        )}

        {/* ── WHY US ── */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, marginBottom: 12 }}>Why use our tools?</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 420, margin: '0 auto', fontSize: 15 }}>Built for speed, privacy, and zero friction.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {features.map(f => {
              const FIcon = f.icon;
              return (
                <TiltCard key={f.title} className="glass-card gradient-border" style={{ borderRadius: 18, padding: 28, textAlign: 'center' } as React.CSSProperties}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg,${f.from},${f.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 8px 20px ${f.from}55` }}>
                    <FIcon style={{ width: 20, height: 20, color: '#fff' }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
                  <p  style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{f.desc}</p>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40, marginBottom: 40 }}>
            <div style={{ maxWidth: 280 }}>
              <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer">
                <img src={logo} alt="HowAutomate" style={{ height: 34, marginBottom: 14, filter: 'brightness(0) invert(1)' }} />
              </a>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                Free tools for everyone, by the{' '}
                <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'none' }}>HowAutomate</a> team.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Tools</p>
                {[['PDF Converter','/pdf-converter'],['BMI Calculator','/bmi-calculator'],['DateTime Converter','/datetime-converter'],['UGC Creator','/ugc-content']].map(([label,to]) => (
                  <div key={to} style={{ marginBottom: 10 }}>
                    <Link to={to} style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                      {label}
                    </Link>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Company</p>
                {[['HowAutomate.com','https://howautomate.com'],['Blog','https://howautomate.com/blog']].map(([label,href]) => (
                  <div key={href} style={{ marginBottom: 10 }}>
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                      {label}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            &copy; {new Date().getFullYear()} HowAutomate &middot; All tools are free and privacy-first
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
