import { FileText, Image, Video, Music, Code, Archive, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const tools = [
  {
    title: 'File to PDF Converter',
    description: 'Convert documents, images, spreadsheets and more to perfectly formatted PDFs instantly.',
    icon: FileText,
    path: '/pdf-converter',
    gradient: 'from-violet-500 to-blue-500',
    available: true,
  },
  {
    title: 'Image Compressor',
    description: 'Compress images without losing quality. Supports PNG, JPG, WebP and more.',
    icon: Image,
    path: '#',
    gradient: 'from-emerald-500 to-teal-500',
    available: false,
  },
  {
    title: 'Video Converter',
    description: 'Convert videos between formats. MP4, AVI, MOV, WebM and more supported.',
    icon: Video,
    path: '#',
    gradient: 'from-orange-500 to-red-500',
    available: false,
  },
  {
    title: 'Audio Converter',
    description: 'Convert audio files between MP3, WAV, FLAC, AAC and other formats.',
    icon: Music,
    path: '#',
    gradient: 'from-pink-500 to-rose-500',
    available: false,
  },
  {
    title: 'Code Formatter',
    description: 'Format and beautify your code. Supports JavaScript, Python, HTML, CSS and more.',
    icon: Code,
    path: '#',
    gradient: 'from-cyan-500 to-blue-500',
    available: false,
  },
  {
    title: 'File Compressor',
    description: 'Compress files into ZIP, RAR or 7z archives quickly and efficiently.',
    icon: Archive,
    path: '#',
    gradient: 'from-amber-500 to-yellow-500',
    available: false,
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">HowAutomate Tools</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-5">
              Free Online{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Tools
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A collection of powerful, free tools to convert, compress, and transform your files — right in your browser.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const content = (
                <div
                  key={tool.title}
                  className={`group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 ${
                    tool.available
                      ? 'hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer'
                      : 'opacity-60 cursor-default'
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.gradient} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    {tool.title}
                    {!tool.available && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Coming Soon
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                  {tool.available && (
                    <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      Open Tool <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  )}
                </div>
              );

              return tool.available ? (
                <Link key={tool.title} to={tool.path} className="no-underline">
                  {content}
                </Link>
              ) : (
                <div key={tool.title}>{content}</div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Free online tools by HowAutomate
        </div>
      </footer>
    </div>
  );
};

export default Home;
