import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';

const UgcContent = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="HowAutomate" className="h-12 w-auto" />
          </Link>
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
