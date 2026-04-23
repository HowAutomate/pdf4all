import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import logo from '@/assets/logo-transparent.png';
import ThemeToggle from '@/components/ThemeToggle';

const UgcContent = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>UGC Content Creation - HowAutomate Tools</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://tools.howautomate.com/ugc-content" />
      </Helmet>
      <header style={{ position:'sticky', top:0, zIndex:10, background:'rgba(7,4,15,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 40px', height:80, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', textDecoration:'none', opacity:1, transition:'opacity 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.opacity='0.82')}
            onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
            <img src={logo} alt="HowAutomate" style={{ height:56, width:'auto', display:'block' }} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <iframe
          src="https://bira.lovable.app"
          className="w-full h-[calc(100vh-65px)] border-0"
          title="UGC Content Creation"
          allow="clipboard-write; clipboard-read"
        />
      </main>
    </div>
  );
};

export default UgcContent;
