import React, { useState, useMemo, useRef } from 'react';
import { FileText, Sparkles, HeartPulse, Clock, ArrowRight, BookOpen, Search, Zap, Lock, Gift, Smartphone, ExternalLink } from 'lucide-react';
import logo from '@/assets/logo-transparent.png';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

/* ── 3-D tilt card — properly forwards style prop ───────────────────── */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}
const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', style = {}, disabled = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left)  / r.width  - 0.5) * 20;
    const y = ((e.clientY - r.top)   / r.height - 0.5) * -20;
    ref.current.style.transform  = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(10px)`;
    ref.current.style.transition = 'transform 0.06s ease-out';
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform  = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform', ...style }}
    >
      {children}
    </div>
  );
};

/* ── data ───────────────────────────────────────────────────────────── */
const allTools = [
  { title:'File to PDF',        desc:'Convert documents, images & spreadsheets to perfectly formatted PDFs instantly.', icon:FileText,  path:'/pdf-converter',      from:'#7c3aed', to:'#2563eb', glow:'rgba(124,58,237,0.45)',  category:'PDF',       badge:'Popular', live:true  },
  { title:'BMI Calculator',     desc:'Calculate Body Mass Index with a visual gauge and get instant health insights.',  icon:HeartPulse,path:'/bmi-calculator',    from:'#db2777', to:'#e11d48', glow:'rgba(219,39,119,0.45)',  category:'Health',    badge:null,      live:true  },
  { title:'DateTime \u2194 Epoch', desc:'Switch between human-readable dates and Unix timestamps with a live clock.',    icon:Clock,     path:'/datetime-converter', from:'#d97706', to:'#ea580c', glow:'rgba(217,119,6,0.45)',   category:'Developer', badge:null,      live:true  },
  { title:'UGC Creator',        desc:'Build stunning social media and ad creatives for marketing campaigns.',           icon:Sparkles,  path:'/ugc-content',        from:'#059669', to:'#0891b2', glow:'rgba(5,150,105,0.45)',   category:'Marketing', badge:'New',     live:true  },
  { title:'PDF Compressor',     desc:'Compress PDF files to a fraction of their size without losing quality.',         icon:FileText,  path:null,                  from:'#0284c7', to:'#0ea5e9', glow:'rgba(2,132,199,0.25)',   category:'PDF',       badge:'Soon',    live:false },
  { title:'Image to PDF',       desc:'Batch convert JPG, PNG, and WebP images into a single polished PDF.',            icon:FileText,  path:null,                  from:'#7c3aed', to:'#a855f7', glow:'rgba(124,58,237,0.25)',  category:'PDF',       badge:'Soon',    live:false },
  { title:'Password Generator', desc:'Generate strong random passwords with custom length and character sets.',        icon:Lock,      path:null,                  from:'#dc2626', to:'#ea580c', glow:'rgba(220,38,38,0.25)',   category:'Developer', badge:'Soon',    live:false },
  { title:'Word Counter',       desc:'Count words, characters, sentences, and estimate reading time instantly.',       icon:BookOpen,  path:null,                  from:'#16a34a', to:'#059669', glow:'rgba(22,163,74,0.25)',   category:'Utilities', badge:'Soon',    live:false },
];

const cats     = ['All','PDF','Health','Developer','Marketing','Utilities'];
const features = [
  { icon:Zap,        title:'Instant',       desc:'Runs entirely in your browser — no upload, no waiting.',        from:'#d97706', to:'#f59e0b' },
  { icon:Lock,       title:'100% Private',  desc:'Files never leave your device. We have zero access.',           from:'#7c3aed', to:'#6366f1' },
  { icon:Gift,       title:'Always Free',   desc:'No credits, no subscriptions, no hidden tricks — ever.',        from:'#059669', to:'#10b981' },
  { icon:Smartphone, title:'Any Device',    desc:'Perfectly responsive on mobile, tablet, and desktop.',          from:'#db2777', to:'#ec4899' },
];

/* ── shared styles ──────────────────────────────────────────────────── */
const PAGE_BG   = '#07040f';
const CARD_BG   = 'rgba(255,255,255,0.04)';
const CARD_BDR  = '1px solid rgba(255,255,255,0.09)';
const CARD_SHAD = '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)';

/* ── component ──────────────────────────────────────────────────────── */
const Home = () => {
  const [search, setSearch] = useState('');
  const [cat, setCat]       = useState('All');

  const filtered = useMemo(() =>
    allTools.filter(t =>
      (cat === 'All' || t.category === cat) &&
      (t.title.toLowerCase().includes(search.toLowerCase()) ||
       t.desc.toLowerCase().includes(search.toLowerCase()))
    ), [search, cat]);

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', color: '#fff', fontFamily: "'Inter','system-ui',sans-serif" }}>
      <SEO
        title="Free Online Tools — HowAutomate"
        description="100% free browser-based tools: PDF converter, BMI calculator, epoch converter and more. No signup, no limits."
        path="/"
        jsonLd={{ '@context':'https://schema.org','@type':'WebSite', name:'HowAutomate Free Tools', url:'https://tools.howautomate.com' }}
      />

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(7,4,15,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 40px', height:80, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          {/* logo */}
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none' }}>
            <img
              src={logo}
              alt="HowAutomate"
              style={{ height:56, width:'auto', display:'block' }}
            />
          </a>

          {/* nav */}
          <nav style={{ display:'flex', alignItems:'center', gap:28 }}>
            <a href="https://howautomate.com/blog" target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.55)', textDecoration:'none', transition:'color 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
              onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.55)')}>
              <BookOpen size={15}/> Blog <ExternalLink size={11}/>
            </a>
            <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:13, fontWeight:700, padding:'10px 22px', borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', textDecoration:'none', letterSpacing:'0.02em', boxShadow:'0 4px 16px rgba(124,58,237,0.45)', transition:'opacity 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.opacity='0.82')}
              onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
              Visit HowAutomate
            </a>
          </nav>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', overflow:'hidden', padding:'96px 32px 72px', textAlign:'center' }}>
        {/* background orbs */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div className="animate-orb-1" style={{ position:'absolute', top:'-8%',  left:'-4%',  width:640, height:640, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%)' }}/>
          <div className="animate-orb-2" style={{ position:'absolute', top:'15%',  right:'-8%', width:540, height:540, borderRadius:'50%', background:'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)' }}/>
          <div className="animate-orb-3" style={{ position:'absolute', bottom:'-5%',left:'28%',  width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 65%)' }}/>
          {/* grid */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize:'56px 56px' }}/>
        </div>

        <div style={{ position:'relative', maxWidth:740, margin:'0 auto' }}>
          {/* badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px', borderRadius:100, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.7)', letterSpacing:'0.03em', marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#34d399', boxShadow:'0 0 8px #34d399', display:'inline-block' }}/>
            100% Free &nbsp;&middot;&nbsp; No Signup &nbsp;&middot;&nbsp; Privacy First
          </div>

          {/* headline */}
          <h1 style={{ fontSize:'clamp(2.8rem,6vw,5rem)', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.035em', margin:'0 0 20px' }}>
            Free Online Tools
            <br/>
            <span className="animate-shimmer" style={{ backgroundImage:'linear-gradient(90deg,#a78bfa,#60a5fa,#f472b6,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              for Everyone
            </span>
          </h1>

          <p style={{ fontSize:17, color:'rgba(255,255,255,0.48)', maxWidth:500, margin:'0 auto 40px', lineHeight:1.75 }}>
            Convert, calculate, and create — right in your browser. No uploads. No accounts. Always free.
          </p>

          {/* search */}
          <div style={{ position:'relative', maxWidth:440, margin:'0 auto 48px' }}>
            <Search style={{ position:'absolute', left:17, top:'50%', transform:'translateY(-50%)', width:17, height:17, color:'rgba(255,255,255,0.28)', pointerEvents:'none' }}/>
            <input
              type="text" placeholder="Search tools..."
              value={search} onChange={e=>setSearch(e.target.value)}
              style={{ width:'100%', padding:'14px 17px 14px 48px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.11)', color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', backdropFilter:'blur(8px)', transition:'border-color 0.2s,box-shadow 0.2s' }}
              onFocus={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,0.55)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(124,58,237,0.12)';}}
              onBlur={e =>{e.currentTarget.style.borderColor='rgba(255,255,255,0.11)'; e.currentTarget.style.boxShadow='none';}}
            />
          </div>

          {/* stats */}
          <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'20px 52px' }}>
            {[['4+','Live Tools'],['0','Signups Needed'],['\u221e','Free Usage'],['100%','In-Browser']].map(([n,l])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:30, fontWeight:900, lineHeight:1, backgroundImage:'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{n}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.12em', marginTop:5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY TABS ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', padding:'0 32px 36px', maxWidth:1200, margin:'0 auto' }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            style={{ padding:'8px 22px', borderRadius:100, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', outline:'none', transition:'all 0.2s',
              background: cat===c ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'rgba(255,255,255,0.06)',
              color:       cat===c ? '#fff' : 'rgba(255,255,255,0.45)',
              boxShadow:   cat===c ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── TOOL GRID ─────────────────────────────────────────────────── */}
      <main style={{ maxWidth:1200, margin:'0 auto', padding:'0 32px 80px' }}>
        {search && filtered.length > 0 && (
          <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:24 }}>
            {filtered.length} result{filtered.length!==1?'s':''} for <strong style={{ color:'rgba(255,255,255,0.7)' }}>"{search}"</strong>
          </p>
        )}

        {/* grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))', gap:18, alignItems:'stretch' }}>
          {filtered.map(tool => {
            const Icon = tool.icon;

            const inner = (
              <TiltCard
                disabled={!tool.live}
                style={{
                  borderRadius:18,
                  padding:26,
                  display:'flex',
                  flexDirection:'column',
                  height:'100%',
                  boxSizing:'border-box',
                  position:'relative',
                  overflow:'hidden',
                  background: CARD_BG,
                  border: CARD_BDR,
                  boxShadow: CARD_SHAD,
                  backdropFilter:'blur(16px)',
                  WebkitBackdropFilter:'blur(16px)',
                  opacity: tool.live ? 1 : 0.5,
                  transition:'border-color 0.25s, box-shadow 0.25s',
                }}
                className={tool.live ? 'glass-card-hover' : ''}
              >
                {/* corner glow */}
                {tool.live && (
                  <div style={{ position:'absolute', top:-50, left:-50, width:130, height:130, borderRadius:'50%', background:`radial-gradient(circle,${tool.glow} 0%,transparent 70%)`, pointerEvents:'none' }}/>
                )}

                {/* badge */}
                {tool.badge && (
                  <span style={{
                    position:'absolute', top:16, right:16,
                    fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100, letterSpacing:'0.06em', textTransform:'uppercase',
                    background: tool.badge==='Popular' ? 'rgba(124,58,237,0.28)' : tool.badge==='New' ? 'rgba(5,150,105,0.28)' : 'rgba(255,255,255,0.07)',
                    color:       tool.badge==='Soon' ? 'rgba(255,255,255,0.35)' : '#fff',
                    border:      `1px solid ${tool.badge==='Soon' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)'}`,
                  }}>
                    {tool.badge}
                  </span>
                )}

                {/* icon */}
                <div style={{ width:50, height:50, borderRadius:13, background:`linear-gradient(135deg,${tool.from},${tool.to})`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, flexShrink:0, boxShadow:`0 6px 20px ${tool.glow}` }}>
                  <Icon style={{ width:21, height:21, color:'#fff' }}/>
                </div>

                <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 8px', paddingRight: tool.badge ? 52 : 0, lineHeight:1.3 }}>{tool.title}</h2>
                <p  style={{ fontSize:13, color:'rgba(255,255,255,0.42)', lineHeight:1.65, margin:'0 0 20px', flex:1 }}>{tool.desc}</p>

                {tool.live && (
                  <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, backgroundImage:`linear-gradient(90deg,${tool.from},${tool.to})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginTop:'auto' }}>
                    Open Tool <ArrowRight style={{ width:13, height:13, flexShrink:0, color:tool.to }}/>
                  </div>
                )}
              </TiltCard>
            );

            return tool.live
              ? <Link key={tool.title} to={tool.path!} style={{ textDecoration:'none', display:'flex', flexDirection:'column' }}>{inner}</Link>
              : <div  key={tool.title}                  style={{ display:'flex', flexDirection:'column' }}>{inner}</div>;
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 0', color:'rgba(255,255,255,0.25)' }}>
            <p style={{ fontSize:20, fontWeight:700, color:'rgba(255,255,255,0.55)', marginBottom:8 }}>No tools found</p>
            <p style={{ fontSize:14 }}>Try a different search or select "All"</p>
          </div>
        )}

        {/* ── WHY US ── */}
        <div style={{ marginTop:80 }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:800, margin:'0 0 12px' }}>Why use our tools?</h2>
            <p style={{ color:'rgba(255,255,255,0.38)', maxWidth:400, margin:'0 auto', fontSize:15, lineHeight:1.65 }}>Built for speed, privacy, and zero friction.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16, alignItems:'stretch' }}>
            {features.map(f => {
              const FIcon = f.icon;
              return (
                <TiltCard key={f.title}
                  style={{ borderRadius:16, padding:26, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', background:CARD_BG, border:CARD_BDR, boxShadow:CARD_SHAD, backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', boxSizing:'border-box' }}
                  className="glass-card-hover">
                  <div style={{ width:46, height:46, borderRadius:12, background:`linear-gradient(135deg,${f.from},${f.to})`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, boxShadow:`0 6px 18px ${f.from}55` }}>
                    <FIcon style={{ width:19, height:19, color:'#fff' }}/>
                  </div>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 8px' }}>{f.title}</h3>
                  <p  style={{ fontSize:13, color:'rgba(255,255,255,0.38)', lineHeight:1.65, margin:0 }}>{f.desc}</p>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'52px 32px 40px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:40, marginBottom:40 }}>
            <div style={{ maxWidth:280 }}>
              <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer">
                <img src={logo} alt="HowAutomate" style={{ height:48, marginBottom:14, display:'block' }}/>
              </a>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.32)', lineHeight:1.75 }}>
                Free tools for everyone, by the{' '}
                <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ color:'#a78bfa', textDecoration:'none' }}>HowAutomate</a> team.
              </p>
            </div>
            <div style={{ display:'flex', gap:56, flexWrap:'wrap' }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 16px' }}>Tools</p>
                {[['PDF Converter','/pdf-converter'],['BMI Calculator','/bmi-calculator'],['DateTime Converter','/datetime-converter'],['UGC Creator','/ugc-content']].map(([lbl,to])=>(
                  <div key={to} style={{ marginBottom:10 }}>
                    <Link to={to} style={{ fontSize:14, color:'rgba(255,255,255,0.42)', textDecoration:'none', transition:'color 0.15s' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
                      onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.42)')}>
                      {lbl}
                    </Link>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 16px' }}>Company</p>
                {[['HowAutomate.com','https://howautomate.com'],['Blog','https://howautomate.com/blog']].map(([lbl,href])=>(
                  <div key={href} style={{ marginBottom:10 }}>
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize:14, color:'rgba(255,255,255,0.42)', textDecoration:'none', transition:'color 0.15s' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
                      onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.42)')}>
                      {lbl}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24, textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.18)' }}>
            &copy; {new Date().getFullYear()} HowAutomate &middot; All tools are free and privacy-first
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
