import {
  FileText, HeartPulse, Clock, Sparkles, Lock, BookOpen, Code2, Receipt,
  Combine, Scissors, Briefcase, Wrench, Megaphone, Terminal, Activity,
  Home, Wallet, Calculator, FilePenLine, Minimize2, PenLine, Images, FileImage, ImageDown, Repeat, Eraser, IdCard,
  type LucideIcon,
} from 'lucide-react';

export type CategoryId = 'Business' | 'PDF' | 'Image' | 'Developer' | 'Marketing' | 'Utilities' | 'Health';

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
  { id: 'Business',  label: 'Business & GST',   desc: 'Invoices, payslips, rent receipts and GST maths for Indian businesses.', icon: Briefcase, accent: '#2563eb' },
  { id: 'PDF',       label: 'PDF Tools',        desc: 'Merge, split, compress and convert — all inside your browser.', icon: FileText,  accent: '#7c3aed' },
  { id: 'Image',     label: 'Photo & Image',    desc: 'Compress, convert and resize photos — including the exact KB sizes forms ask for.', icon: Minimize2, accent: '#16a34a' },
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
    title: 'GST Calculator',
    desc: 'Add GST to a price or remove it from an inclusive amount, with the CGST/SGST or IGST split.',
    icon: Calculator, path: '/gst-calculator', category: 'Business',
    from: '#ea580c', to: '#f59e0b', glow: 'rgba(234,88,12,0.45)', badge: 'New',
    keywords: 'gst inclusive exclusive reverse calculate tax cgst sgst igst 18% 5%',
  },
  {
    title: 'Rent Receipt Generator',
    desc: 'Monthly rent receipts for your HRA claim, with the landlord-PAN check and a revenue-stamp box.',
    icon: Home, path: '/rent-receipt-generator', category: 'Business',
    from: '#2563eb', to: '#60a5fa', glow: 'rgba(37,99,235,0.45)', badge: 'New',
    keywords: 'hra rent receipt house rent allowance landlord pan tax proof',
  },
  {
    title: 'Salary Slip Generator',
    desc: 'A standard Indian payslip with earnings, PF, professional tax, paid days and net pay in words.',
    icon: Wallet, path: '/salary-slip-generator', category: 'Business',
    from: '#0d9488', to: '#2dd4bf', glow: 'rgba(13,148,136,0.45)', badge: 'New',
    keywords: 'payslip pay slip salary slip format payroll pf employee',
  },
  {
    title: 'Edit PDF',
    desc: 'Click to edit existing text, or add text, signatures, images, highlights and white-out.',
    icon: FilePenLine, path: '/edit-pdf', category: 'PDF',
    from: '#7c3aed', to: '#2563eb', glow: 'rgba(124,58,237,0.45)', badge: 'New',
    keywords: 'pdf editor edit text change text sign signature fill whiteout annotate modify',
  },
  {
    title: 'Passport Size Photo Maker',
    desc: 'AI removes the background, frames your face at 35×45 mm and makes a printable 4×6 or A4 sheet.',
    icon: IdCard, path: '/passport-size-photo', category: 'Image',
    from: '#2563eb', to: '#60a5fa', glow: 'rgba(37,99,235,0.45)', badge: 'New',
    keywords: 'passport photo size 35x45 white background print sheet id photo visa 2x2',
  },
  {
    title: 'Remove Background',
    desc: 'Cut a person out of any photo with AI — transparent PNG or any colour, never uploaded.',
    icon: Eraser, path: '/remove-background', category: 'Image',
    from: '#9333ea', to: '#c084fc', glow: 'rgba(147,51,234,0.45)', badge: 'New',
    keywords: 'remove bg background remover transparent png cut out photo ai',
  },
  {
    title: 'Photo Resizer in KB',
    desc: 'Resize a photo to an exact KB size (10, 20, 50, 100 KB…) and pixel size for exam and job forms.',
    icon: Minimize2, path: '/photo-resizer-in-kb', category: 'Image',
    from: '#16a34a', to: '#22c55e', glow: 'rgba(22,163,74,0.45)', badge: 'New',
    keywords: 'resize image kb 20kb 50kb 100kb compress photo size exam form passport reduce',
  },
  {
    title: 'Image Compressor',
    desc: 'Shrink JPG, PNG and WebP images in bulk with a quality slider — PNGs keep transparency.',
    icon: ImageDown, path: '/compress-image', category: 'Image',
    from: '#059669', to: '#34d399', glow: 'rgba(5,150,105,0.45)', badge: 'New',
    keywords: 'compress image jpg compress reduce photo size tinypng optimize png',
  },
  {
    title: 'Image Converter',
    desc: 'Convert WebP to JPG, PNG to JPG, JPG to PNG or WebP — many images at once.',
    icon: Repeat, path: '/webp-to-jpg', category: 'Image',
    from: '#0891b2', to: '#22d3ee', glow: 'rgba(8,145,178,0.45)', badge: 'New',
    keywords: 'webp to jpg png to jpg jpg to png convert image format jpeg webp',
  },
  {
    title: 'Signature Resizer',
    desc: 'Clean up a signature photo and resize it to 10–20 KB for online application forms.',
    icon: PenLine, path: '/signature-resizer', category: 'Image',
    from: '#0d9488', to: '#2dd4bf', glow: 'rgba(13,148,136,0.45)', badge: 'New',
    keywords: 'signature resize kb exam form ssc upsc ibps sign photo',
  },
  {
    title: 'JPG to PDF',
    desc: 'Combine photos and scans into one PDF — reorder pages, pick A4 or Letter. Never uploaded.',
    icon: Images, path: '/jpg-to-pdf', category: 'PDF',
    from: '#e11d48', to: '#fb7185', glow: 'rgba(225,29,72,0.45)', badge: 'New',
    keywords: 'image to pdf photo to pdf png to pdf combine images jpeg',
  },
  {
    title: 'PDF to JPG',
    desc: 'Turn PDF pages into JPG or PNG images at screen or print quality, as a ZIP.',
    icon: FileImage, path: '/pdf-to-jpg', category: 'PDF',
    from: '#ea580c', to: '#fb923c', glow: 'rgba(234,88,12,0.45)', badge: 'New',
    keywords: 'pdf to image pdf to png convert pdf pages jpeg',
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
    title: 'Compress PDF',
    desc: 'Shrink PDFs by recompressing the images inside, keeping text sharp, or fit an exact size like 200 KB.',
    icon: FileText, path: '/pdf-compressor', category: 'PDF',
    from: '#0284c7', to: '#0ea5e9', glow: 'rgba(2,132,199,0.45)',
    keywords: 'shrink reduce size smaller compress pdf 100kb 200kb 500kb 1mb kb',
  },
  {
    title: 'Word to PDF & more',
    desc: 'Convert Word, Excel, PowerPoint, JPG and 40+ formats into properly formatted PDFs.',
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
