import React, { useState, useMemo, useRef } from 'react';
import { ArrowRight, BookOpen, Search, Zap, Lock, Gift, Smartphone, ExternalLink } from 'lucide-react';
import logo from '@/assets/logo-transparent.png';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { TOOLS, CATEGORIES, type Tool } from '@/data/tools';

/* ── 3-D tilt card — properly forwards style prop ───────────────────── */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', style = {} }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 20;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -20;
    ref.current.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(10px)`;
    ref.current.style.transition = 'transform 0.06s ease-out';
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={className}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform', ...style }}>
      {children}
    </div>
  );
};

const features = [
  { icon: Zap, title: 'Instant', desc: 'Runs entirely in your browser — no upload, no waiting.', from: '#d97706', to: '#f59e0b' },
  { icon: Lock, title: '100% Private', desc: 'Files never leave your device. We have zero access.', from: '#7c3aed', to: '#6366f1' },
  { icon: Gift, title: 'Always Free', desc: 'No credits, no subscriptions, no hidden tricks — ever.', from: '#059669', to: '#10b981' },
  { icon: Smartphone, title: 'Any Device', desc: 'Perfectly responsive on mobile, tablet, and desktop.', from: '#db2777', to: '#ec4899' },
];

/* ── shared styles ──────────────────────────────────────────────────── */
const PAGE_BG = '#07040f';
const CARD_BG = 'rgba(255,255,255,0.04)';
const CARD_BDR = '1px solid rgba(255,255,255,0.09)';
const CARD_SHAD = '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)';

/* ── tool card ──────────────────────────────────────────────────────── */
const ToolCard = ({ tool }: { tool: Tool }) => {
  const Icon = tool.icon;
  return (
    <Link to={tool.path} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
      <TiltCard
        className="glass-card-hover"
        style={{
          borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', height: '100%',
          boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
          background: CARD_BG, border: CARD_BDR, boxShadow: CARD_SHAD,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}
      >
        <div style={{ position: 'absolute', top: -50, left: -50, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${tool.glow} 0%,transparent 70%)`, pointerEvents: 'none' }} />

        {tool.badge && (
          <span style={{
            position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 700,
            padding: '3px 10px', borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: tool.badge === 'Popular' ? 'rgba(124,58,237,0.28)' : 'rgba(5,150,105,0.28)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
          }}>
            {tool.badge}
          </span>
        )}

        <div style={{ width: 50, height: 50, borderRadius: 13, background: `linear-gradient(135deg,${tool.from},${tool.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, flexShrink: 0, boxShadow: `0 6px 20px ${tool.glow}` }}>
          <Icon style={{ width: 21, height: 21, color: '#fff' }} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px', paddingRight: tool.badge ? 52 : 0, lineHeight: 1.3 }}>{tool.title}</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, margin: '0 0 20px', flex: 1 }}>{tool.desc}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, backgroundImage: `linear-gradient(90deg,${tool.from},${tool.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: 'auto' }}>
          Open Tool <ArrowRight style={{ width: 13, height: 13, flexShrink: 0, color: tool.to }} />
        </div>
      </TiltCard>
    </Link>
  );
};

const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: 18, alignItems: 'stretch' };

/* ── component ──────────────────────────────────────────────────────── */
const Home = () => {
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return TOOLS.filter(t =>
      `${t.title} ${t.desc} ${t.keywords ?? ''} ${t.category}`.toLowerCase().includes(query),
    );
  }, [query]);

  const scrollToCategory = (id: string) => {
    setSearch('');
    // Let the sections re-render before measuring the scroll target.
    requestAnimationFrame(() => {
      document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', color: '#fff', fontFamily: "'Inter','system-ui',sans-serif" }}>
      <SEO
        title="Free Online Tools for Business & PDF — HowAutomate"
        description="Free browser-based tools: GST invoice generator, merge PDF, split PDF, PDF compressor, word counter and more. No signup, no upload, no limits."
        path="/"
        jsonLd={[
          { '@context': 'https://schema.org', '@type': 'WebSite', name: 'HowAutomate Free Tools', url: 'https://tools.howautomate.com' },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Free online tools by HowAutomate',
            itemListElement: TOOLS.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.title,
              url: `https://tools.howautomate.com${t.path}`,
            })),
          },
        ]}
      />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
            <img src={logo} alt="HowAutomate" style={{ height: 56, width: 'auto', display: 'block' }} />
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="https://howautomate.com/blog" target="_blank" rel="noopener noreferrer"
              className="hide-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              <BookOpen size={15} /> Blog <ExternalLink size={11} />
            </a>
            <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, padding: '10px 22px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', textDecoration: 'none', letterSpacing: '0.02em', boxShadow: '0 4px 16px rgba(124,58,237,0.45)', transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Visit HowAutomate
            </a>
          </nav>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '88px 24px 56px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="animate-orb-1" style={{ position: 'absolute', top: '-8%', left: '-4%', width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%)' }} />
          <div className="animate-orb-2" style={{ position: 'absolute', top: '15%', right: '-8%', width: 540, height: 540, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)' }} />
          <div className="animate-orb-3" style={{ position: 'absolute', bottom: '-5%', left: '28%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 740, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.03em', marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', display: 'inline-block' }} />
            100% Free &nbsp;&middot;&nbsp; No Signup &nbsp;&middot;&nbsp; Privacy First
          </div>

          <h1 style={{ fontSize: 'clamp(2.6rem,6vw,4.6rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.035em', margin: '0 0 20px' }}>
            Free Online Tools
            <br />
            <span className="animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg,#a78bfa,#60a5fa,#f472b6,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              for Everyone
            </span>
          </h1>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.48)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.75 }}>
            Invoices, PDFs, and everyday utilities — right in your browser. No uploads. No accounts. Always free.
          </p>

          <div style={{ position: 'relative', maxWidth: 440, margin: '0 auto 44px' }}>
            <Search style={{ position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search tools…" aria-label="Search tools"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '14px 17px 14px 48px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s,box-shadow 0.2s' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '20px 52px' }}>
            {[[`${TOOLS.length}`, 'Live Tools'], [`${CATEGORIES.length}`, 'Categories'], ['0', 'Signups Needed'], ['100%', 'In-Browser']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, backgroundImage: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY JUMP NAV ─────────────────────────────────────────── */}
      <nav aria-label="Tool categories" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '0 24px 44px', maxWidth: 1200, margin: '0 auto' }}>
        {CATEGORIES.map(c => {
          const CIcon = c.icon;
          const count = TOOLS.filter(t => t.category === c.id).length;
          return (
            <button key={c.id} onClick={() => scrollToCategory(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = `${c.accent}77`; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}>
              <CIcon size={14} style={{ color: c.accent }} />
              {c.label}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{count}</span>
            </button>
          );
        })}
      </nav>

      {/* ── TOOLS ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        {query ? (
          <>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for <strong style={{ color: 'rgba(255,255,255,0.7)' }}>"{search.trim()}"</strong>
            </p>
            {results.length > 0 ? (
              <div style={GRID}>
                {results.map(tool => <ToolCard key={tool.path} tool={tool} />)}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '72px 0', color: 'rgba(255,255,255,0.25)' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>No tools found</p>
                <p style={{ fontSize: 14 }}>Try a different word, or clear the search to browse by category.</p>
              </div>
            )}
          </>
        ) : (
          CATEGORIES.map(cat => {
            const list = TOOLS.filter(t => t.category === cat.id);
            if (!list.length) return null;
            const CIcon = cat.icon;
            return (
              <section key={cat.id} id={`cat-${cat.id}`} style={{ marginBottom: 64, scrollMarginTop: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: `${cat.accent}22`, border: `1px solid ${cat.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CIcon size={18} style={{ color: cat.accent }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{cat.label}</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>{cat.desc}</p>
                  </div>
                </div>
                <div style={GRID}>
                  {list.map(tool => <ToolCard key={tool.path} tool={tool} />)}
                </div>
              </section>
            );
          })
        )}

        {/* ── WHY US ── */}
        <div style={{ marginTop: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, margin: '0 0 12px' }}>Why use our tools?</h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', maxWidth: 400, margin: '0 auto', fontSize: 15, lineHeight: 1.65 }}>Built for speed, privacy, and zero friction.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16, alignItems: 'stretch' }}>
            {features.map(f => {
              const FIcon = f.icon;
              return (
                <TiltCard key={f.title}
                  style={{ borderRadius: 16, padding: 26, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: CARD_BG, border: CARD_BDR, boxShadow: CARD_SHAD, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxSizing: 'border-box' }}
                  className="glass-card-hover">
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `linear-gradient(135deg,${f.from},${f.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: `0 6px 18px ${f.from}55` }}>
                    <FIcon style={{ width: 19, height: 19, color: '#fff' }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 24px 40px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, marginBottom: 40 }}>
            <div style={{ maxWidth: 280, flex: '1 1 240px' }}>
              <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer">
                <img src={logo} alt="HowAutomate" style={{ height: 48, marginBottom: 14, display: 'block' }} />
              </a>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', lineHeight: 1.75 }}>
                Free tools for everyone, by the{' '}
                <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'none' }}>HowAutomate</a> team.
              </p>
            </div>

            {/* One column per category — kept in sync with the tool list automatically */}
            <div style={{ display: 'flex', gap: 44, flexWrap: 'wrap', flex: '2 1 480px' }}>
              {CATEGORIES.map(cat => {
                const list = TOOLS.filter(t => t.category === cat.id);
                if (!list.length) return null;
                return (
                  <div key={cat.id} style={{ minWidth: 140 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>{cat.label}</p>
                    {list.map(t => (
                      <div key={t.path} style={{ marginBottom: 9 }}>
                        <Link to={t.path} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.42)')}>
                          {t.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div style={{ minWidth: 140 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Company</p>
                {[['HowAutomate.com', 'https://howautomate.com'], ['Blog', 'https://howautomate.com/blog']].map(([lbl, href]) => (
                  <div key={href} style={{ marginBottom: 9 }}>
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.42)')}>
                      {lbl}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>
            &copy; {new Date().getFullYear()} HowAutomate &middot; All tools are free and privacy-first
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
