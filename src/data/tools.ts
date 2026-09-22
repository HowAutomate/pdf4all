import {
  FileText, HeartPulse, Clock, Sparkles, Lock, BookOpen, Code2, Receipt,
  Combine, Scissors, Briefcase, Wrench, Megaphone, Terminal, Activity,
  type LucideIcon,
} from 'lucide-react';

export type CategoryId = 'Business' | 'PDF' | 'Developer' | 'Marketing' | 'Utilities' | 'Health';

export interface Category {
  id: CategoryId;
  label: string;
  /** Shown under the section heading — also the honest "what's in here" line. */
  desc: string;
  icon: LucideIcon;
  accent: string;
}

/** Display order on the home page: money-making tools first, novelties last. */
export const CATEGORIES: Category[] = [
  { id: 'Business',  label: 'Business & GST',   desc: 'Invoices and compliance paperwork for Indian businesses.', icon: Briefcase, accent: '#2563eb' },
  { id: 'PDF',       label: 'PDF Tools',        desc: 'Merge, split, compress and convert — all inside your browser.', icon: FileText,  accent: '#7c3aed' },
  { id: 'Developer', label: 'Developer',        desc: 'Everyday helpers for people who write code.', icon: Terminal,  accent: '#0ea5e9' },
  { id: 'Marketing', label: 'Marketing',        desc: 'Create content and creatives for campaigns.', icon: Megaphone, accent: '#059669' },
  { id: 'Utilities', label: 'Everyday Utilities', desc: 'Small tools that save a search and a download.', icon: Wrench, accent: '#16a34a' },
  { id: 'Health',    label: 'Health',           desc: 'Quick personal health calculators.', icon: Activity,  accent: '#db2777' },
];

export interface Tool {
  title: string;
  /** Card copy — one sentence, plain language, no marketing filler. */
  desc: string;
  icon: LucideIcon;
  path: string;
  category: CategoryId;
  from: string;
  to: string;
  glow: string;
  badge?: 'Popular' | 'New' | null;
  /** Extra words the search box should match (synonyms people actually type). */
  keywords?: string;
}

export const TOOLS: Tool[] = [
  {
    title: 'GST Invoice Generator',
    desc: 'Create a GST-compliant tax invoice with automatic CGST/SGST/IGST split, HSN codes and amount in words.',
    icon: Receipt, path: '/gst-invoice-generator', category: 'Business',
    from: '#2563eb', to: '#0ea5e9', glow: 'rgba(37,99,235,0.45)', badge: 'Popular',
    keywords: 'tax bill billing gstin hsn sac invoice india',
  },
  {
    title: 'Merge PDF',
    desc: 'Combine several PDFs into one file and reorder them before you download.',
    icon: Combine, path: '/merge-pdf', category: 'PDF',
    from: '#7c3aed', to: '#a78bfa', glow: 'rgba(124,58,237,0.45)', badge: 'New',
    keywords: 'combine join append pdf together',
  },
  {
    title: 'Split PDF',
    desc: 'Extract the pages you need, or break one PDF into separate files.',
    icon: Scissors, path: '/split-pdf', category: 'PDF',
    from: '#e11d48', to: '#fb7185', glow: 'rgba(225,29,72,0.45)', badge: 'New',
    keywords: 'separate extract pages cut divide pdf',
  },
  {
    title: 'PDF Compressor',
    desc: 'Reduce PDF file size by stripping metadata and optimising the internal structure.',
    icon: FileText, path: '/pdf-compressor', category: 'PDF',
    from: '#0284c7', to: '#0ea5e9', glow: 'rgba(2,132,199,0.45)',
    keywords: 'shrink reduce size smaller compress pdf',
  },
  {
    title: 'File to PDF',
    desc: 'Convert documents, images and spreadsheets into properly formatted PDFs.',
    icon: FileText, path: '/pdf-converter', category: 'PDF',
    from: '#7c3aed', to: '#2563eb', glow: 'rgba(124,58,237,0.45)',
    keywords: 'word docx excel xlsx jpg png convert to pdf',
  },
  {
    title: 'JSON → TS & Zod',
    desc: 'Turn any JSON sample into TypeScript interfaces, Zod schemas or JSON Schema.',
    icon: Code2, path: '/json-to-typescript-zod', category: 'Developer',
    from: '#0ea5e9', to: '#7c3aed', glow: 'rgba(14,165,233,0.45)',
    keywords: 'typescript types schema validation generator',
  },
  {
    title: 'Password Generator',
    desc: 'Generate strong random passwords with custom length, symbols and numbers.',
    icon: Lock, path: '/password-generator', category: 'Developer',
    from: '#dc2626', to: '#ea580c', glow: 'rgba(220,38,38,0.45)',
    keywords: 'secure random strong passphrase',
  },
  {
    title: 'DateTime ↔ Epoch',
    desc: 'Convert between human-readable dates and Unix timestamps, with a live clock.',
    icon: Clock, path: '/datetime-converter', category: 'Developer',
    from: '#d97706', to: '#ea580c', glow: 'rgba(217,119,6,0.45)',
    keywords: 'unix timestamp epoch time converter utc',
  },
  {
    title: 'UGC Creator',
    desc: 'Build social media and ad creatives for marketing campaigns.',
    icon: Sparkles, path: '/ugc-content', category: 'Marketing',
    from: '#059669', to: '#0891b2', glow: 'rgba(5,150,105,0.45)',
    keywords: 'social ads creative content instagram',
  },
  {
    title: 'Word Counter',
    desc: 'Count words, characters, sentences and paragraphs, plus reading time.',
    icon: BookOpen, path: '/word-counter', category: 'Utilities',
    from: '#16a34a', to: '#059669', glow: 'rgba(22,163,74,0.45)',
    keywords: 'character count letters reading time essay',
  },
  {
    title: 'BMI Calculator',
    desc: 'Calculate Body Mass Index with a visual gauge and instant health insight.',
    icon: HeartPulse, path: '/bmi-calculator', category: 'Health',
    from: '#db2777', to: '#e11d48', glow: 'rgba(219,39,119,0.45)',
    keywords: 'body mass index weight height health',
  },
];

export const toolsByCategory = (id: CategoryId) => TOOLS.filter(t => t.category === id);
