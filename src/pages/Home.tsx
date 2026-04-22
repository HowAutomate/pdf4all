import { useState, useMemo } from 'react';
import { FileText, Sparkles, HeartPulse, Clock, ArrowRight, BookOpen, Search, Zap, Lock, Gift, Smartphone } from 'lucide-react';
import logo from '@/assets/logo-transparent.png';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { SEO } from '@/components/SEO';

const allTools = [
  {
    title: 'File to PDF Converter',
    description: 'Convert documents, images, and spreadsheets to perfectly formatted PDFs instantly.',
    icon: FileText,
    path: '/pdf-converter',
    gradient: 'from-violet-500 to-blue-500',
    category: 'PDF',
    badge: 'Popular',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    live: true,
  },
  {
    title: 'BMI Calculator',
    description: 'Calculate your Body Mass Index and get instant health insights from height and weight.',
    icon: HeartPulse,
    path: '/bmi-calculator',
    gradient: 'from-pink-500 to-rose-500',
    category: 'Health',
    badge: null,
    badgeColor: '',
    live: true,
  },
  {
    title: 'DateTime \u2194 Epoch Converter',
    description: 'Convert between human-readable dates and Unix epoch timestamps in one click.',
    icon: Clock,
    path: '/datetime-converter',
    gradient: 'from-amber-500 to-orange-500',
    category: 'Developer',
    badge: null,
    badgeColor: '',
    live: true,
  },
  {
    title: 'UGC Content Creator',
    description: 'Create stunning user-generated content for social media ads and marketing campaigns.',
    icon: Sparkles,
    path: '/ugc-content',
    gradient: 'from-emerald-500 to-teal-500',
    category: 'Marketing',
    badge: 'New',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    live: true,
  },
  {
    title: 'PDF Compressor',
    description: 'Compress PDF files to a fraction of their size without losing quality.',
    icon: FileText,
    path: null,
    gradient: 'from-blue-400 to-cyan-400',
    category: 'PDF',
    badge: 'Coming Soon',
    badgeColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    live: false,
  },
  {
    title: 'Image to PDF',
    description: 'Batch convert JPG, PNG, and WebP images into a single polished PDF.',
    icon: FileText,
    path: null,
    gradient: 'from-purple-400 to-fuchsia-400',
    category: 'PDF',
    badge: 'Coming Soon',
    badgeColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    live: false,
  },
  {
    title: 'Password Generator',
    description: 'Generate strong, random passwords with custom length and character sets.',
    icon: Lock,
    path: null,
    gradient: 'from-red-400 to-orange-400',
    category: 'Developer',
    badge: 'Coming Soon',
    badgeColor: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    live: false,
  },
  {
    title: 'Word Counter',
    description: 'Count words, characters, sentences, and estimate reading time instantly.',
    icon: BookOpen,
    path: null,
    gradient: 'from-green-400 to-emerald-400',
    category: 'Utilities',
    badge: 'Coming Soon',
    badgeColor: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    live: false,
  },
];

const categories = ['All', 'PDF', 'Health', 'Developer', 'Marketing', 'Utilities'];

const features = [
  {
    icon: Zap,
    title: 'Instant Results',
    description: 'All tools run directly in your browser — no uploads, no waiting, no server round trips.',
    gradient: 'from-yellow-400 to-orange-400',
  },
  {
    icon: Lock,
    title: '100% Private',
    description: 'Your files and data never leave your device. We have zero access to your information.',
    gradient: 'from-blue-400 to-violet-400',
  },
  {
    icon: Gift,
    title: 'Always Free',
    description: 'No subscriptions, no credits, no hidden fees. Free forever — no account needed.',
    gradient: 'from-emerald-400 to-teal-400',
  },
  {
    icon: Smartphone,
    title: 'Works Everywhere',
    description: 'Fully responsive and optimized for all devices — desktop, tablet, and mobile.',
    gradient: 'from-pink-400 to-rose-400',
  },
];

const Home = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    return allTools.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Free Online Tools — HowAutomate"
        description="100% free online tools: PDF converter, BMI calculator, datetime converter and more. No signup, no limits, works in your browser."
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'HowAutomate Free Tools',
          url: 'https://tools.howautomate.com',
          description: 'Free online tools for everyone — convert, calculate, and create in your browser.',
        }}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <a
            href="https://howautomate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="HowAutomate" className="h-10 w-auto" />
          </a>
          <div className="flex items-center gap-4">
            <a
              href="https://howautomate.com/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Blog
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-950 text-white py-20 md:py-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-400/10 rounded-full blur-2xl animate-pulse animation-delay-500" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            100% Free &middot; No Signup &middot; Privacy First
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-5 leading-tight tracking-tight">
            Free Online Tools
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              for Everyone
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Convert, calculate, and create &mdash; powerful tools that run entirely in your browser.
            Fast, private, and always free.
          </p>

          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all text-base"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-8 md:gap-14 mt-12 text-white/60 text-sm">
            {([['4+', 'Live Tools'], ['0', 'Signups Needed'], ['\u221e', 'Free Usage'], ['100%', 'Browser-based']] as const).map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold text-white leading-none mb-1">{num}</div>
                <div className="text-xs uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={
                'px-4 py-2 rounded-full text-sm font-medium transition-all border ' +
                (activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card')
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {search && (
          <p className="text-center text-sm text-muted-foreground mb-6">
            {filtered.length} tool{filtered.length !== 1 ? 's' : ''} found for{' '}
            <span className="text-foreground font-medium">"{search}"</span>
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto">
          {filtered.map((tool) => {
            const Icon = tool.icon;
            const card = (
              <div
                className={
                  'group relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 flex flex-col h-full ' +
                  (tool.live
                    ? 'border-border hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer'
                    : 'border-border/50 opacity-55 cursor-default select-none')
                }
              >
                {tool.badge && (
                  <span className={'absolute top-4 right-4 text-xs font-semibold px-2.5 py-0.5 rounded-full ' + tool.badgeColor}>
                    {tool.badge}
                  </span>
                )}
                <div className={'inline-flex p-3 rounded-xl bg-gradient-to-br ' + tool.gradient + ' mb-4 self-start shadow-sm'}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-base font-semibold text-foreground mb-2 pr-16">{tool.title}</h2>
                <p className="text-sm text-muted-foreground flex-1 mb-4 leading-relaxed">{tool.description}</p>
                {tool.live && (
                  <div className="flex items-center text-sm font-semibold text-primary gap-1 group-hover:gap-2 transition-all duration-200">
                    Open Tool <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );

            if (!tool.live) return <div key={tool.title}>{card}</div>;
            return (
              <Link key={tool.title} to={tool.path!} className="no-underline flex">
                {card}
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl font-semibold text-foreground mb-2">No tools found</p>
            <p className="text-sm">Try a different search or select &ldquo;All&rdquo;</p>
          </div>
        )}

        {/* Why us */}
        <div className="mt-20 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why use our tools?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built with speed, privacy, and simplicity in mind.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const FIcon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-border bg-card text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className={'inline-flex p-3 rounded-xl bg-gradient-to-br ' + f.gradient + ' mb-4 shadow-sm'}>
                    <FIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="max-w-xs">
              <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer">
                <img src={logo} alt="HowAutomate" className="h-10 w-auto mb-3" />
              </a>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Free tools for everyone, built by the{' '}
                <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  HowAutomate
                </a>{' '}
                team.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-10 text-sm">
              <div>
                <p className="font-semibold text-foreground mb-3">Tools</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link to="/pdf-converter" className="hover:text-foreground transition-colors">PDF Converter</Link></li>
                  <li><Link to="/bmi-calculator" className="hover:text-foreground transition-colors">BMI Calculator</Link></li>
                  <li><Link to="/datetime-converter" className="hover:text-foreground transition-colors">DateTime Converter</Link></li>
                  <li><Link to="/ugc-content" className="hover:text-foreground transition-colors">UGC Creator</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-3">Company</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li><a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">HowAutomate.com</a></li>
                  <li><a href="https://howautomate.com/blog" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Blog</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} HowAutomate &middot; All tools are free and privacy-first
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
