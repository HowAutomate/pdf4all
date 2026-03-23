import { FileText, Sparkles, HeartPulse, Clock, ArrowRight, BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const tools = [
  {
    title: 'File to PDF Converter',
    description: 'Convert documents, images, spreadsheets and more to perfectly formatted PDFs instantly.',
    icon: FileText,
    path: '/pdf-converter',
    gradient: 'from-violet-500 to-blue-500',
    external: false,
  },
  {
    title: 'UGC Content Creation',
    description: 'Create stunning user-generated content for social media, ads, and marketing campaigns.',
    icon: Sparkles,
    path: 'https://lovable.dev/projects/379e3402-3c22-48f9-8e56-4371016e0fe8',
    gradient: 'from-emerald-500 to-teal-500',
    external: true,
  },
  {
    title: 'BMI Calculator',
    description: 'Calculate your Body Mass Index quickly. Get instant health insights based on your height and weight.',
    icon: HeartPulse,
    path: '/bmi-calculator',
    gradient: 'from-pink-500 to-rose-500',
    external: false,
  },
  {
    title: 'DateTime ↔ Epoch Converter',
    description: 'Convert between human-readable dates and Unix epoch timestamps instantly.',
    icon: Clock,
    path: '/datetime-converter',
    gradient: 'from-amber-500 to-orange-500',
    external: false,
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">HowAutomate Tools</span>
          </div>
          <a
            href="https://howautomate.com/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Blog
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-5">
              Free Online{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Tools
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A collection of powerful, free tools to convert, calculate, and automate — right in your browser.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const card = (
                <div
                  className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.gradient} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    {tool.title}
                    {tool.external && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                  <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    Open Tool <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              );

              if (tool.external) {
                return (
                  <a key={tool.title} href={tool.path} target="_blank" rel="noopener noreferrer" className="no-underline">
                    {card}
                  </a>
                );
              }

              return (
                <Link key={tool.title} to={tool.path} className="no-underline">
                  {card}
                </Link>
              );
            })}
          </div>
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

export default Home;
