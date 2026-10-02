/**
 * Every indexable page on tools.howautomate.com, in one place.
 *
 * Used at runtime by <SEO> (title/description/canonical) and at build time by
 * the static-HTML generator in vite.config.ts, which writes one real HTML file
 * per page so search engines see each page's content without running JS.
 * Pure data — no React imports — so the Vite config can load it.
 */
import {
  EDIT_PDF_FAQS, GST_CALCULATOR_FAQS, RENT_RECEIPT_FAQS, SALARY_SLIP_FAQS, MERGE_PDF_FAQS, SPLIT_PDF_FAQS,
  type Faq,
} from './faqs';

export interface KbPreset {
  /** Largest file size allowed, in KB. */
  maxKb: number;
  /** Smallest file size some forms accept, in KB. */
  minKb?: number;
  mode: 'photo' | 'signature';
}

export interface PageMeta {
  title: string;
  description: string;
  h1: string;
  /** One or two paragraphs shown in the pre-rendered HTML. */
  intro: string;
  faqs?: Faq[];
  /** Kept out of search results. */
  noindex?: boolean;
  /** Settings for the KB resizer pages. */
  kb?: KbPreset;
  /** PDF compressor pages: open in "exact size" mode with this target. */
  pdfTargetKb?: number;
}

const KB_COMMON: Faq[] = [
  {
    q: 'Is my photo uploaded to a server?',
    a: 'No. The image is resized and compressed inside your browser, on your own device. Nothing is uploaded, so it is safe for ID photos and signatures.',
  },
  {
    q: 'What format is the resized file?',
    a: 'JPG (JPEG), which almost every online application form asks for. Transparent areas in PNG images become white.',
  },
  {
    q: 'My form also asks for exact dimensions in pixels. Can I set them?',
    a: 'Yes. Choose "Exact pixels", enter the width and height from the notification (for example 200 × 230), and the photo is cropped to that shape from the centre before it is compressed to the KB limit.',
  },
];

const kbPage = (maxKb: number, h1: string, title: string, description: string, intro: string, extra: Faq[], minKb?: number): PageMeta => ({
  title, description, h1, intro, kb: { maxKb, minKb, mode: 'photo' }, faqs: [...extra, ...KB_COMMON],
});

const CONVERTER_FAQS: Faq[] = [
  { q: 'Is it free?', a: 'Yes — no sign-up, no watermark and no daily limit on normal use.' },
  { q: 'Are my files private?', a: 'Files are sent over an encrypted connection to our conversion server, converted, and removed once the conversion finishes. They are not shared or used for anything else.' },
  { q: 'Which formats are supported?', a: 'Word (DOC, DOCX, ODT, RTF), Excel (XLS, XLSX, CSV, ODS), PowerPoint (PPT, PPTX, ODP), images (JPG, PNG and more), HTML and text files, among 40+ formats.' },
];

const PDF_COMPRESS_FAQS: Faq[] = [
  {
    q: 'Why is my PDF so large?',
    a: 'Almost always because of images: scanned pages, phone photos of documents, and screenshots are stored at full camera resolution. Text itself takes very little space. That is why this tool focuses on recompressing images.',
  },
  {
    q: 'Will the text still be selectable?',
    a: 'Yes, in normal mode — only images are recompressed, so text, links and vector graphics are unchanged. In "Exact size" mode, if a very small limit cannot be met that way, pages are converted to images to fit; the result tells you clearly when this happened and also offers the best text-keeping version.',
  },
  {
    q: 'Why did my PDF not get smaller?',
    a: 'If a PDF is mostly text, or its images are already well compressed, there is little left to remove. The tool never gives you a file larger than the original — it tells you instead.',
  },
  {
    q: 'Is my PDF uploaded to a server?',
    a: 'No. The compression runs entirely in your browser on your own device, so it is safe for marksheets, ID proofs, bank statements and contracts.',
  },
];

const pdfTargetPage = (kb: number, h1: string, title: string, description: string, intro: string): PageMeta => ({
  title, description, h1, intro, pdfTargetKb: kb,
  faqs: [
    {
      q: `How do I compress a PDF to under ${kb >= 1024 ? kb / 1024 + ' MB' : kb + ' KB'}?`,
      a: `Choose your PDF on this page — the size limit is already set to ${kb >= 1024 ? kb / 1024 + ' MB' : kb + ' KB'}. The tool tries the gentlest compression that fits, so you keep as much quality as the limit allows.`,
    },
    ...PDF_COMPRESS_FAQS,
  ],
});

export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Free Online Tools for Business & PDF — HowAutomate',
    description: 'Free browser-based tools: edit PDF, resize photos to any KB, GST invoice and calculator, salary slip, rent receipt, merge and split PDF and more. No signup, no upload, no limits.',
    h1: 'Free online tools that run in your browser',
    intro: 'PDF editing, photo resizing for exam and job forms, GST invoices and calculators, payslips, rent receipts and everyday utilities. Every tool is free, needs no sign-up, and most never upload your files — they run entirely on your device.',
  },

  /* ── Photo / image size ──────────────────────────────────────────── */
  '/photo-resizer-in-kb': {
    title: 'Photo Resizer in KB — Resize Image to Exact KB Online Free | HowAutomate',
    description: 'Resize a photo to any size in KB — 10 KB, 20 KB, 50 KB, 100 KB or your own limit — for exam, job and government forms. Free, in your browser, no upload.',
    h1: 'Photo Resizer in KB',
    intro: 'Online application forms reject photos that are too large, too small or the wrong shape. Pick the KB limit your form asks for, optionally the exact pixel size, and get a JPG that fits — at the highest quality that stays under the limit. Your photo never leaves your device.',
    kb: { maxKb: 50, mode: 'photo' },
    faqs: [
      {
        q: 'How do I reduce a photo to a specific KB size?',
        a: 'Choose your photo, type the maximum size in KB (for example 50), and the tool finds the best JPG quality that fits. If quality alone cannot get it small enough, it reduces the dimensions slightly as well.',
      },
      {
        q: 'Can I set a minimum size too?',
        a: 'Yes. Some forms want, say, 20–50 KB. Enter both numbers; if your photo would come out smaller than the minimum, the tool increases its size until it is within the range.',
      },
      ...KB_COMMON,
    ],
  },
  '/resize-image-to-10kb': kbPage(
    10, 'Resize Image to 10 KB',
    'Resize Image to 10 KB Online Free — Photo & Signature | HowAutomate',
    'Compress a photo or signature to under 10 KB in one click, for forms with very small upload limits. Free, keeps the best possible quality, no upload.',
    'A 10 KB limit is common for signatures and thumbnail photos on older government portals. This page is set to 10 KB: choose your image and download a JPG under the limit, kept as sharp as that size allows. For signatures, the dedicated signature resizer also cleans up the paper background.',
    [{ q: 'Will a 10 KB photo look blurry?', a: 'At passport-photo dimensions (around 200 × 230 pixels) 10 KB is enough for a clear face. Large phone photos are scaled down first, which is what keeps them sharp at such a small size.' }],
  ),
  '/resize-image-to-20kb': kbPage(
    20, 'Resize Image to 20 KB',
    'Resize Image to 20 KB Online Free — For Exam & Job Forms | HowAutomate',
    'Reduce a photo to under 20 KB for exam, recruitment and scholarship forms. Free, best possible quality, optional exact pixel size, nothing uploaded.',
    'Many recruitment and exam portals cap photographs at 20 KB (often with a minimum around 10 KB). This page is pre-set to 20 KB. Choose your photo, set the pixel size from your notification if it gives one, and download a JPG that fits.',
    [{ q: 'My form says "20 KB to 50 KB". Which page should I use?', a: 'Use this one or the 50 KB page and set the minimum to 20 KB in the settings. The tool will keep the file inside the range you enter.' }],
  ),
  '/resize-image-to-50kb': kbPage(
    50, 'Resize Image to 50 KB',
    'Resize Image to 50 KB Online Free — Photo Compressor | HowAutomate',
    'Compress a photo to under 50 KB for government, bank and university forms. Free, sharp results, optional exact dimensions, works on your device.',
    'A 50 KB limit is one of the most common rules for application photographs. This page is set to 50 KB: drop in a phone or camera photo and download a JPG that is under the limit, with as little quality lost as possible.',
    [{ q: 'Why is my 3 MB phone photo rejected?', a: 'Modern phone photos are 2–5 MB and thousands of pixels wide. Forms want small files, so the photo must be scaled down and compressed — which is exactly what this tool does in one step.' }],
  ),
  '/resize-image-to-100kb': kbPage(
    100, 'Resize Image to 100 KB',
    'Resize Image to 100 KB Online Free — Reduce Photo Size | HowAutomate',
    'Reduce any image to under 100 KB for visa, passport and document upload portals. Free, high quality, no sign-up, nothing uploaded.',
    '100 KB is a typical limit for document photos, visa and passport portals and many HR systems. This page is pre-set to 100 KB, which leaves room for a detailed, high-quality JPG.',
    [{ q: 'Can I use this for scanned documents?', a: 'Yes — a scanned page saved as a JPG or PNG can be brought under 100 KB here. For multi-page documents in PDF form, use the PDF compressor instead.' }],
  ),
  '/resize-image-to-200kb': kbPage(
    200, 'Resize Image to 200 KB',
    'Resize Image to 200 KB Online Free | HowAutomate',
    'Compress a photo or scan to under 200 KB for admissions, KYC and job portals. Free, keeps maximum quality, works entirely in your browser.',
    'A 200 KB limit is common for admission, KYC and document-upload portals. At this size most photos keep full detail — the tool only reduces quality or dimensions as much as needed to fit.',
    [{ q: 'My image is already under 200 KB. Will it get worse?', a: 'It will be re-saved as a high-quality JPG at the same dimensions. If you only need the format changed to JPG, this is still the quickest way.' }],
  ),
  '/signature-resizer': {
    title: 'Signature Resizer — Resize Signature to 10–20 KB for Forms | HowAutomate',
    description: 'Resize and clean up a scanned or photographed signature to 10–20 KB JPG for exam and job application forms. Whitens the paper background. Free, no upload.',
    h1: 'Signature Resizer',
    intro: 'Sign on white paper, take a photo, and turn it into a clean signature file that fits the form: the paper background is whitened, the image is cropped to your signature and compressed to the KB range you set (10–20 KB by default).',
    kb: { maxKb: 20, minKb: 10, mode: 'signature' },
    faqs: [
      {
        q: 'What size should a signature be for online forms?',
        a: 'Many recruitment and exam portals ask for a JPG between 10 KB and 20 KB, often around 140 × 60 pixels (or 6 × 2 cm). Always follow the exact numbers in your notification — you can type them in the settings.',
      },
      {
        q: 'My signature photo has a grey or shadowy background. Can this fix it?',
        a: 'Yes. "Clean background" turns light paper tones and shadows white and darkens the ink, which is what forms expect and also makes the file smaller.',
      },
      {
        q: 'Should I sign in blue or black ink?',
        a: 'Most notifications ask for black or blue ink on white paper. Use a pen with a firm line — very thin strokes can disappear when the file is compressed to a few KB.',
      },
      KB_COMMON[0],
    ],
  },

  /* ── PDF ─────────────────────────────────────────────────────────── */
  '/edit-pdf': {
    title: 'Edit PDF Online Free — Edit Existing Text, Sign & White-out | HowAutomate Tools',
    description: 'Free online PDF editor that runs in your browser: click to edit existing text, add text, white-out, highlight, sign and add images. No upload, no watermark, no sign-up.',
    h1: 'Edit PDF',
    intro: 'Click any line of an existing PDF to change its text — the old words are removed and the new ones written in the PDF’s own font where possible. You can also add text, signatures, images, highlights and white-out, then download. No watermark, no sign-up, and the file never leaves your browser.',
    faqs: EDIT_PDF_FAQS,
  },
  '/merge-pdf': {
    title: 'Merge PDF — Combine PDF Files Online Free | HowAutomate',
    description: 'Combine multiple PDF files into one, free and in your browser. Reorder pages before merging, no upload, no signup, no watermark.',
    h1: 'Merge PDF',
    intro: 'Combine up to 25 PDFs into a single document. Reorder the files before merging and see the page count of the result. Everything happens in your browser, with no watermark.',
    faqs: MERGE_PDF_FAQS,
  },
  '/split-pdf': {
    title: 'Split PDF — Extract or Separate PDF Pages Free | HowAutomate',
    description: 'Split a PDF into separate files or extract specific pages, free and in your browser. No upload, no signup, no watermark.',
    h1: 'Split PDF',
    intro: 'Extract the pages you need (for example 1-3, 7), split every page into its own file, or cut a PDF into equal chunks. Multi-file results download as a ZIP.',
    faqs: SPLIT_PDF_FAQS,
  },
  '/pdf-compressor': {
    title: 'Compress PDF Online Free — Reduce PDF File Size | HowAutomate',
    description: 'Reduce PDF file size for free by compressing the photos and scans inside it, while text stays sharp and selectable. Or shrink to an exact size like 200 KB. No upload.',
    h1: 'Compress PDF',
    intro: 'Most of a PDF’s size is its images — scans, photos and screenshots. This tool re-compresses them and keeps the text, links and layout exactly as they are. Need the file under a hard limit like 200 KB for a form? Switch to "Exact size". Everything runs in your browser; nothing is uploaded.',
    faqs: PDF_COMPRESS_FAQS,
  },
  '/compress-pdf-to-100kb': pdfTargetPage(100, 'Compress PDF to 100 KB',
    'Compress PDF to 100 KB Online Free — For Forms & Portals | HowAutomate',
    'Shrink a PDF to under 100 KB for exam, job and government portals. Keeps text where possible; free, in your browser, nothing uploaded.',
    'Many application and scholarship portals cap document uploads at 100 KB. This page is pre-set to 100 KB: it first compresses the images inside the PDF and keeps the text; only if that is not enough does it convert pages to compact images to meet the limit — and tells you which it did.'),
  '/compress-pdf-to-200kb': pdfTargetPage(200, 'Compress PDF to 200 KB',
    'Compress PDF to 200 KB Online Free | HowAutomate',
    'Reduce a PDF to under 200 KB for certificates, marksheets and ID uploads. Text kept wherever possible. Free, private, no sign-up.',
    '200 KB is a common limit for uploading certificates, marksheets and ID proofs. Choose your PDF and get a file under 200 KB, with the text kept sharp whenever the limit allows it.'),
  '/compress-pdf-to-500kb': pdfTargetPage(500, 'Compress PDF to 500 KB',
    'Compress PDF to 500 KB Online Free | HowAutomate',
    'Bring a scanned or photo-heavy PDF under 500 KB for email and upload portals. Free, keeps text, runs in your browser.',
    'A 500 KB limit usually leaves room for good quality. Scanned documents and photo-heavy PDFs are compressed until they fit, with text and layout untouched in most cases.'),
  '/compress-pdf-to-1mb': pdfTargetPage(1024, 'Compress PDF to 1 MB',
    'Compress PDF to 1 MB Online Free | HowAutomate',
    'Reduce a large PDF to under 1 MB for email attachments and upload portals. Free, high quality, nothing uploaded.',
    'Email services and many portals reject attachments over 1 MB (or 2 MB). Large scans and presentations exported to PDF usually fit comfortably once their images are recompressed.'),
  '/pdf-converter': {
    title: 'Convert to PDF Free — Word, Excel, PowerPoint, JPG to PDF | HowAutomate',
    description: 'Free online PDF converter: turn Word, Excel, PowerPoint, images and 40+ other formats into properly formatted PDFs. No sign-up, no watermark.',
    h1: 'Convert Files to PDF',
    intro: 'Convert Word documents, Excel sheets, PowerPoint slides, images and 40+ other formats into properly formatted PDFs — and PDFs back to Word. Files are converted on our server and removed once the conversion finishes.',
    faqs: CONVERTER_FAQS,
  },
  '/word-to-pdf': {
    title: 'Word to PDF Converter Free — DOC & DOCX to PDF | HowAutomate',
    description: 'Convert Word documents (DOC, DOCX) to PDF free, keeping fonts, tables and layout. No sign-up, no watermark, works on phone and desktop.',
    h1: 'Word to PDF Converter',
    intro: 'Turn a .docx or .doc file into a PDF that looks exactly like your document — fonts, tables, images, headers and page breaks included. Ideal for resumes, applications and letters. No sign-up and no watermark.',
    faqs: [
      { q: 'How do I convert a Word document to PDF?', a: 'Choose your .docx or .doc file, press Convert, and download the PDF. Multiple files can be converted in one go.' },
      { q: 'Will my formatting stay the same?', a: 'Yes. The conversion uses a full document engine, so tables, images, fonts, headers, footers and page breaks are preserved. If a document uses an unusual font, a close match is used.' },
      ...CONVERTER_FAQS,
    ],
  },
  '/excel-to-pdf': {
    title: 'Excel to PDF Converter Free — XLS & XLSX to PDF | HowAutomate',
    description: 'Convert Excel spreadsheets (XLS, XLSX, CSV) to PDF free. Keeps tables and formatting. No sign-up, no watermark.',
    h1: 'Excel to PDF Converter',
    intro: 'Turn an Excel workbook or CSV file into a clean PDF for sharing, printing or emailing — tables, number formats and sheets included.',
    faqs: [
      { q: 'Will every sheet in my workbook be converted?', a: 'Yes, each sheet becomes part of the PDF. Set print areas and page orientation in Excel first if you want precise control over page breaks.' },
      ...CONVERTER_FAQS,
    ],
  },
  '/ppt-to-pdf': {
    title: 'PowerPoint to PDF Converter Free — PPT & PPTX to PDF | HowAutomate',
    description: 'Convert PowerPoint presentations (PPT, PPTX) to PDF free, one slide per page. No sign-up, no watermark.',
    h1: 'PowerPoint to PDF Converter',
    intro: 'Turn a PowerPoint deck into a PDF with one slide per page — easy to email, print and open on any device, with your fonts and images intact.',
    faqs: CONVERTER_FAQS,
  },
  '/jpg-to-pdf': {
    title: 'JPG to PDF Converter Free — Images to PDF | HowAutomate',
    description: 'Convert JPG, PNG and other images to PDF free. Combine several photos into one PDF. No sign-up, no watermark.',
    h1: 'JPG to PDF Converter',
    intro: 'Turn photos and scans (JPG, PNG and more) into a PDF — handy for submitting documents, receipts and certificates. Add several images to convert them together.',
    faqs: CONVERTER_FAQS,
  },

  /* ── Business & GST ─────────────────────────────────────────────── */
  '/gst-invoice-generator': {
    title: 'Free GST Invoice Generator (India) - HowAutomate Tools',
    description: 'Create a GST-compliant tax invoice for free — auto CGST/SGST/IGST split, HSN/SAC codes, amount in words, and instant PDF download. Everything runs in your browser, nothing is uploaded.',
    h1: 'GST Invoice Generator',
    intro: 'Create a GST tax invoice with automatic CGST/SGST or IGST split, HSN/SAC codes, amount in words, your logo and bank details, then save it as a PDF. Free, with no sign-up.',
  },
  '/gst-calculator': {
    title: 'GST Calculator India - Add or Remove GST (CGST, SGST, IGST) - HowAutomate Tools',
    description: 'Free GST calculator: add GST to a price or remove GST from an inclusive amount, with CGST/SGST or IGST split for 5%, 18%, 40% and every other slab. Instant, no signup.',
    h1: 'GST Calculator',
    intro: 'Add GST to a price, or work out the GST inside a GST-inclusive amount, with the CGST/SGST or IGST split an invoice needs.',
    faqs: GST_CALCULATOR_FAQS,
  },
  '/rent-receipt-generator': {
    title: 'Free Rent Receipt Generator for HRA (India) - HowAutomate Tools',
    description: 'Generate monthly rent receipts for your HRA claim in seconds — landlord PAN check, revenue-stamp box for cash, amount in words, two receipts per A4 page. Free, nothing uploaded.',
    h1: 'Rent Receipt Generator',
    intro: 'Make a rent receipt for every month of the year for your HRA claim, with the landlord-PAN check and a revenue-stamp box for cash payments. Print two per page and get them signed.',
    faqs: RENT_RECEIPT_FAQS,
  },
  '/salary-slip-generator': {
    title: 'Free Salary Slip Generator (India) - Payslip Format with PF - HowAutomate Tools',
    description: 'Create a professional monthly salary slip / payslip in Indian format — earnings, PF, professional tax, TDS, paid days and net pay in words. Free, prints to PDF, nothing uploaded.',
    h1: 'Salary Slip Generator',
    intro: 'A standard Indian payslip with editable earnings and deductions, one-click EPF, paid and loss-of-pay days, and net pay in words — printed to PDF in one click.',
    faqs: SALARY_SLIP_FAQS,
  },

  /* ── Developer / utilities ──────────────────────────────────────── */
  '/json-to-typescript-zod': {
    title: 'JSON to TypeScript & Zod Generator — HowAutomate Tools',
    description: 'Convert JSON to TypeScript interfaces, Zod schemas, and JSON Schema instantly. Free online developer tool — no signup, 100% in-browser.',
    h1: 'JSON to TypeScript & Zod Generator',
    intro: 'Paste a JSON sample and get TypeScript interfaces, Zod schemas or JSON Schema, with nested objects and arrays handled.',
  },
  '/password-generator': {
    title: 'Password Generator - HowAutomate Tools',
    description: 'Generate strong, random passwords with custom length, uppercase, lowercase, numbers and symbols. Free, in-browser, no data sent anywhere.',
    h1: 'Password Generator',
    intro: 'Generate strong random passwords with your choice of length, letters, numbers and symbols. Passwords are created on your device and never sent anywhere.',
  },
  '/datetime-converter': {
    title: 'DateTime ↔ Epoch Converter - HowAutomate Tools',
    description: 'Convert between human-readable dates and Unix epoch timestamps instantly. Free online datetime converter.',
    h1: 'DateTime ↔ Epoch Converter',
    intro: 'Convert human-readable dates to Unix timestamps and back, with a live clock.',
  },
  '/word-counter': {
    title: 'Word Counter - HowAutomate Tools',
    description: 'Free online word counter. Count words, characters, sentences, paragraphs and estimate reading time instantly as you type.',
    h1: 'Word Counter',
    intro: 'Count words, characters, sentences and paragraphs as you type, with an estimated reading time.',
  },
  '/bmi-calculator': {
    title: 'BMI Calculator - HowAutomate Tools',
    description: 'Free Body Mass Index (BMI) calculator. Get instant health insights from your height and weight in metric or imperial units.',
    h1: 'BMI Calculator',
    intro: 'Calculate your Body Mass Index from height and weight in metric or imperial units, with a visual gauge and the health category.',
  },
  '/ugc-content': {
    title: 'UGC Content Creation - HowAutomate Tools',
    description: 'Build social media and ad creatives for marketing campaigns.',
    h1: 'UGC Content Creator',
    intro: 'Build social media and ad creatives for marketing campaigns.',
    noindex: true,
  },
};

export const SITE_URL = 'https://tools.howautomate.com';
