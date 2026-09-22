import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';

interface ToolLayoutProps {
  /** Browser/SEO title — include the brand suffix. */
  seoTitle: string;
  seoDescription: string;
  /** Route path, e.g. "/merge-pdf". Used for canonical + JSON-LD url. */
  path: string;
  /** Small pill above the headline, e.g. "PDF Utility". */
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  subtitle: string;
  /** Optional third line for caveats or a one-line "how it works". */
  note?: string;
  /** Accent colour pair driving the hero glow and the eyebrow pill. */
  accent: { from: string; to: string; soft: string };
  /** Schema.org applicationCategory, e.g. "UtilitiesApplication". */
  appCategory?: string;
  /** Rendered into the FAQPage schema as well as the visible list. */
  faqs?: { q: string; a: string }[];
  /** Constrains the main column; wider tools can pass more. */
  maxWidth?: number;
  children: React.ReactNode;
}

export const ToolLayout = ({
  seoTitle, seoDescription, path, eyebrow, eyebrowIcon: EyebrowIcon,
  title, subtitle, note, accent, appCategory = 'UtilitiesApplication',
  faqs, maxWidth = 720, children,
}: ToolLayoutProps) => {
  const url = `https://tools.howautomate.com${path}`;
  const jsonLd: Record<string, unknown>[] = [{
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    url,
    applicationCategory: appCategory,
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }];
  if (faqs?.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07040f', color: '#fff', fontFamily: "'Inter','system-ui',sans-serif", display: 'flex', flexDirection: 'column' }}>
      <SEO title={seoTitle} description={seoDescription} path={path} jsonLd={jsonLd} />

      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={logo} alt="HowAutomate Tools" style={{ height: 52, width: 'auto' }} />
          </Link>
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <ArrowLeft size={14} /> All Tools
          </Link>
        </div>
      </header>

      <section style={{ position: 'relative', overflow: 'hidden', padding: '60px 24px 44px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${accent.soft} 0%, transparent 65%)` }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        </div>
        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 15px', borderRadius: 100, background: accent.soft, border: `1px solid ${accent.from}55`, fontSize: 11, fontWeight: 700, color: accent.to, marginBottom: 22, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <EyebrowIcon size={11} /> {eyebrow}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, margin: '0 0 14px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{title}</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.46)', lineHeight: 1.75, margin: note ? '0 0 12px' : 0 }}>{subtitle}</p>
          {note && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6, margin: 0 }}>{note}</p>}
        </div>
      </section>

      <main style={{ maxWidth, margin: '0 auto', padding: '0 20px 72px', width: '100%', boxSizing: 'border-box', flex: 1 }}>
        {children}

        {!!faqs?.length && (
          <section style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 20 }}>Frequently asked questions</h2>
            {faqs.map(({ q, a }) => (
              <details key={q} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 0', cursor: 'pointer' }}>
                <summary style={{ fontSize: 14, fontWeight: 600, color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  {q} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginTop: 10 }}>{a}</p>
              </details>
            ))}
          </section>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 24px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
        Free tools by{' '}
        <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" style={{ color: accent.to, textDecoration: 'none' }}>HowAutomate</a>
        &nbsp;&middot;&nbsp; Your files never leave your browser
      </footer>
    </div>
  );
};

export default ToolLayout;
