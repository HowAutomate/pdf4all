import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';
import { TERMS, TERMS_CONTACT, TERMS_EFFECTIVE_DATE, TERMS_SUMMARY } from '@/data/terms';

const Terms = () => (
  <div style={{ minHeight: '100vh', background: '#07040f', color: '#fff', fontFamily: "'Inter','system-ui',sans-serif", display: 'flex', flexDirection: 'column' }}>
    <SEO
      title="Terms of Use & Disclaimer — HowAutomate Tools"
      description="Terms of use for the free tools on tools.howautomate.com."
      path="/terms"
      jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Terms of Use & Disclaimer', url: 'https://tools.howautomate.com/terms' }}
    />

    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logo} alt="HowAutomate Tools" style={{ height: 52, width: 'auto' }} />
        </Link>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> All Tools
        </Link>
      </div>
    </header>

    <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 80px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 15px', borderRadius: 100, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        <ShieldCheck size={11} /> Legal
      </div>
      <h1 style={{ fontSize: 'clamp(1.9rem,5vw,2.8rem)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Terms of Use &amp; Disclaimer</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 28px' }}>Last updated: {TERMS_EFFECTIVE_DATE}</p>

      <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', fontSize: 14.5, lineHeight: 1.75, color: 'rgba(255,255,255,0.8)', marginBottom: 36 }}>
        <strong style={{ color: '#fff' }}>In short:</strong> {TERMS_SUMMARY}
      </div>

      {TERMS.map(s => (
        <section key={s.h} style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>{s.h}</h2>
          {s.p.map(p => (
            <p key={p} style={{ fontSize: 14.5, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)', margin: p.startsWith('•') ? '0 0 6px 8px' : '0 0 12px' }}>{p}</p>
          ))}
        </section>
      ))}

      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 40 }}>
        Contact: <a href={`mailto:${TERMS_CONTACT}`} style={{ color: '#a78bfa', textDecoration: 'none' }}>{TERMS_CONTACT}</a>
      </p>
    </main>
  </div>
);

export default Terms;
