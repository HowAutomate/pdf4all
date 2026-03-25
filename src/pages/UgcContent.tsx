import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const UgcContent = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">UGC Content Creation</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <iframe
          src="https://image2media-magic.lovable.app"
          className="w-full h-[calc(100vh-65px)] border-0"
          title="UGC Content Creation"
          allow="clipboard-write; clipboard-read"
        />
      </main>
    </div>
  );
};

export default UgcContent;
