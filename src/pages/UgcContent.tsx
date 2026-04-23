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
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between" style={{ minHeight: 72 }}>
          <Link to="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
            <img src={logo} alt="HowAutomate" className="h-14 w-auto" />
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
