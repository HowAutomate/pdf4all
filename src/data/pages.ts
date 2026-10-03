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

export type ImageToolPreset = { mode: 'compress' } | { mode: 'convert'; to: 'jpg' | 'png' | 'webp' };

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
  /** Image compressor / converter pages. */
  image?: ImageToolPreset;
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

const ORGANIZE_FAQS: Faq[] = [
  { q: 'How do I rearrange pages?', a: 'Use the arrows under each thumbnail to move a page earlier or later. The downloaded PDF follows the order on screen.' },
  { q: 'Can I undo deleting a page?', a: 'Yes — a removed page stays greyed out in the grid; click its undo button to bring it back before downloading.' },
  { q: 'Is my PDF uploaded?', a: 'No. Thumbnails and the new PDF are made inside your browser, so it is safe for confidential documents.' },
];

const QR_FAQS: Faq[] = [
  { q: 'Do these QR codes expire?', a: 'No. The information is stored in the code itself — there is no redirect through our servers, no tracking and no expiry. It works as long as it is printed clearly.' },
  { q: 'PNG or SVG?', a: 'PNG works everywhere — WhatsApp, documents, slides. SVG stays perfectly sharp at any size, so use it for printing banners, menus and packaging.' },
  { q: 'Why won’t my QR code scan?', a: 'Keep it dark on a light background with good contrast, print it at least 2 × 2 cm, and leave a white border around it. Very light or inverted colours confuse many phone cameras.' },
];

const IMAGE_TOOL_FAQS: Faq[] = [
  { q: 'Are my images uploaded?', a: 'No. Images are compressed and converted inside your browser, on your device — nothing is sent to a server.' },
  { q: 'Can I do many images at once?', a: 'Yes — add up to 50 images. Download them one by one or all together as a ZIP.' },
  { q: 'Does it keep the photo the right way up?', a: 'Yes. The rotation your phone records in a photo is applied, so the output is upright.' },
];

const convertPage = (to: 'jpg' | 'png' | 'webp', h1: string, title: string, description: string, intro: string, faqs: Faq[]): PageMeta => ({
  title, description, h1, intro, image: { mode: 'convert', to }, faqs: [...faqs, ...IMAGE_TOOL_FAQS],
});

const IMAGES_TO_PDF_FAQS: Faq[] = [
  { q: 'How do I combine several photos into one PDF?', a: 'Add all the images at once (or in batches), use the arrows to put them in order, and press Convert. Each image becomes one page.' },
  { q: 'My phone photo came out sideways. Will that happen here?', a: 'No. The rotation your phone records in the photo is applied before the page is made, so pages come out the right way up.' },
  { q: 'Can I make the PDF smaller for an upload portal?', a: 'Tick "Make the PDF smaller" — photos are resized and compressed. If you need an exact limit such as 200 KB, run the result through Compress PDF to 200 KB.' },
  { q: 'Are my images uploaded?', a: 'No. The PDF is built inside your browser, so photos of IDs, certificates and receipts never leave your device.' },
];

const PDF_TO_IMAGES_FAQS: Faq[] = [
  { q: 'Which quality should I choose?', a: '150 DPI suits screens, WhatsApp and most portals. Choose 300 DPI for printing or when you need to zoom into small text; files will be about four times larger.' },
  { q: 'JPG or PNG?', a: 'JPG gives much smaller files and is best for scanned pages and photos. PNG is lossless — best for pages with fine text, diagrams or charts.' },
  { q: 'Can I convert only some pages?', a: 'Yes. Choose "Choose pages" and type pages or ranges such as 1-3, 7. Pages are numbered from 1.' },
  { q: 'Is my PDF uploaded?', a: 'No. Pages are rendered to images inside your browser, on your device.' },
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
  '/compress-image': {
    title: 'Image Compressor — Compress JPG, PNG & WebP Online Free | HowAutomate',
    description: 'Reduce image file size free — compress JPG, PNG and WebP in bulk with a quality slider. PNGs keep transparency. Runs in your browser, nothing uploaded.',
    h1: 'Image Compressor',
    intro: 'Make photos and screenshots smaller for websites, email and WhatsApp. Add up to 50 images, choose the quality, and download them individually or as a ZIP. PNGs are shrunk the TinyPNG way — by reducing colours — so they stay PNG with transparency intact.',
    image: { mode: 'compress' },
    faqs: [
      { q: 'How much smaller will my images get?', a: 'Phone photos usually shrink by 60–90% at the default 70% quality with no visible difference on screens. Screenshots and graphics saved as PNG typically shrink by 50–80%.' },
      { q: 'What does the quality setting do?', a: 'Lower quality means a smaller file. Around 70% is a good balance; go to 85–90% for print or detailed images, or 40–50% when size matters most.' },
      { q: 'What if an image is already well compressed?', a: 'You never get a bigger file: if compressing would not make an image smaller, the original is kept and marked "already optimised".' },
      { q: 'I need a specific size like 50 KB.', a: 'Use the Photo Resizer in KB, which finds the best quality that fits an exact KB limit.' },
      ...IMAGE_TOOL_FAQS,
    ],
  },
  '/webp-to-jpg': convertPage('jpg', 'WebP to JPG Converter',
    'WebP to JPG Converter Free — Convert WebP Images in Bulk | HowAutomate',
    'Convert WebP images to JPG free, many at once, at the quality you choose. Works in your browser — nothing uploaded.',
    'Images saved from websites often come as WebP, which many apps and upload portals reject. Convert them to JPG in one go — add up to 50 files and download a ZIP.',
    [{ q: 'Why can’t I open or upload a WebP file?', a: 'WebP is a modern web format that some older apps, editors and government or bank portals do not accept. JPG works almost everywhere.' }]),
  '/png-to-jpg': convertPage('jpg', 'PNG to JPG Converter',
    'PNG to JPG Converter Free — Smaller Files, Bulk | HowAutomate',
    'Convert PNG images and screenshots to JPG free — usually 5–10× smaller. Transparent areas become white. Bulk, in your browser.',
    'PNG screenshots and photos are often several MB. As JPG they are usually 5–10 times smaller — ideal for email, forms and WhatsApp. Transparent areas become white.',
    [{ q: 'What happens to transparent areas?', a: 'JPG cannot store transparency, so transparent parts become white. Keep the file as PNG (or use WebP) if you need transparency.' }]),
  '/jpg-to-png': convertPage('png', 'JPG to PNG Converter',
    'JPG to PNG Converter Free — Bulk, Lossless Output | HowAutomate',
    'Convert JPG photos to PNG free, in bulk. Useful for editing, logos and apps that require PNG. Runs in your browser.',
    'Some apps, editors and design tools ask for PNG. Convert JPG images to lossless PNG in bulk — the picture is kept exactly as it is.',
    [{ q: 'Will converting to PNG improve quality?', a: 'No — it keeps the image exactly as it is, it cannot restore detail a JPG already lost. Expect the PNG file to be larger than the JPG.' }]),
  '/jpg-to-webp': convertPage('webp', 'JPG to WebP Converter',
    'JPG to WebP Converter Free — Faster Websites | HowAutomate',
    'Convert JPG and PNG images to WebP free — typically 25–35% smaller than JPG at the same quality. Bulk, in your browser.',
    'WebP images load faster on websites and online stores, typically 25–35% smaller than JPG at the same visual quality. Convert a whole folder of product photos at once.',
    [{ q: 'Do all browsers support WebP?', a: 'Yes — every current browser displays WebP. Some older desktop apps and upload portals do not, so keep a JPG copy for those.' }]),
  '/crop-image': {
    title: 'Crop Image Online Free — Square, 16:9, Instagram, Passport | HowAutomate',
    description: 'Crop photos online free: drag the crop box, pick a shape (1:1, 4:5, 16:9, 9:16, passport 35×45), rotate or flip, set an exact output size, download JPG, PNG or WebP. No upload.',
    h1: 'Crop Image',
    intro: 'Cut a photo to the part you want and the shape you need — a square profile picture, a 4:5 Instagram post, a 16:9 thumbnail or a 9:16 story. Drag the box, rotate or flip if needed, choose the output size and format, and download. Your photo never leaves your device.',
    faqs: [
      { q: 'How do I crop to an exact shape?', a: 'Pick a shape such as Square 1:1 or Instagram 4:5 — the crop box locks to it, and dragging a corner keeps the shape. Choose "Free" to crop any shape.' },
      { q: 'Can I get an exact size in pixels?', a: 'Yes. Type the output width (for example 1080) — the height follows the shape you cropped. With Instagram 4:5 and a width of 1080 you get exactly 1080 × 1350.' },
      { q: 'My phone photo is sideways. Can I fix it?', a: 'Use Rotate left or right before cropping. Photos are also turned upright automatically using the rotation your phone recorded.' },
      { q: 'Is my photo uploaded?', a: 'No. Cropping happens in your browser on your device.' },
    ],
  },
  '/remove-background': {
    title: 'Remove Background from Photo Free — AI, No Upload | HowAutomate',
    description: 'Remove the background from photos of people free with AI that runs in your browser — no upload, no sign-up, full resolution. Transparent PNG or any background colour.',
    h1: 'Remove Background',
    intro: 'Cut a person out of any photo in a few seconds — hair included — and download a transparent PNG or put them on white, blue or any colour. The AI runs on your own device, so your photo is never uploaded, and you get the full-resolution result free.',
    faqs: [
      { q: 'What kind of photos does it work on?', a: 'It is built for photos of people — portraits, selfies, profile and ID photos, group-free shots. For products and objects without a person, results are not reliable yet.' },
      { q: 'Why does the first photo take longer?', a: 'The first time, your browser downloads the AI (about 38 MB in total). After that it is cached, so later photos process in a few seconds.' },
      { q: 'Is my photo uploaded?', a: 'No. Unlike most background removers, the AI runs inside your browser on your device. Nothing is sent to a server, which makes it safe for ID and personal photos.' },
      { q: 'Is the result full resolution and free?', a: 'Yes — no watermark, no credits and no reduced-size preview. Photos up to 2400 px on the longest side are processed at full size.' },
      { q: 'Can I make a passport-size photo with it?', a: 'Yes — use the Passport Photo Maker, which removes the background, puts you on white, frames your face to the right size and makes a printable sheet.' },
    ],
  },
  '/passport-size-photo': {
    title: 'Passport Size Photo Maker Online Free — White Background, Print Sheet | HowAutomate',
    description: 'Make a passport-size photo (35×45 mm) from any selfie: AI removes the background, frames your face, and gives a single JPG or a printable 4×6 / A4 sheet. Free, in your browser.',
    h1: 'Passport Size Photo Maker',
    intro: 'Take a front-facing photo against any background — the AI replaces it with plain white, frames your face to passport proportions, and gives you a single photo (with an optional KB limit for online forms) or a print-ready 4×6 inch or A4 sheet with cutting guides. Everything happens on your device.',
    faqs: [
      { q: 'What size is a passport-size photo in India?', a: '35 × 45 mm (3.5 × 4.5 cm) is the standard passport-size photo used on Indian application forms, ID cards and documents. US passports and the Indian visa use 51 × 51 mm (2 × 2 inch) — both are available here.' },
      { q: 'How should I take the photo?', a: 'Face the camera straight on, with even light and a neutral expression, eyes open, no cap or dark glasses. Hold the phone at eye level about an arm’s length away. The background does not matter — it is replaced.' },
      { q: 'How many photos fit on a print sheet?', a: 'Eight 35 × 45 mm photos fit on 4 × 6 inch photo paper, and thirty on an A4 sheet. Print at 100% / "actual size" so the photos come out at exactly 35 × 45 mm.' },
      { q: 'My form wants the photo under 50 KB. Can I do that?', a: 'Yes — type the limit in "Max size (KB)" before downloading. The photo keeps its exact pixel size and only the compression is adjusted.' },
      { q: 'Is my photo uploaded?', a: 'No. Background removal and face detection run inside your browser. Nothing leaves your device.' },
    ],
  },
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
  '/organize-pdf': {
    title: 'Organize PDF Pages Free — Reorder, Rotate & Delete | HowAutomate',
    description: 'Rearrange, rotate and delete PDF pages with thumbnails, free in your browser. No upload, no watermark, no sign-up.',
    h1: 'Organize PDF',
    intro: 'See every page as a thumbnail, then move pages around, turn sideways scans upright and remove the pages you don’t need — all in one go, then download the tidied-up PDF. Your file never leaves your device.',
    faqs: ORGANIZE_FAQS,
  },
  '/rotate-pdf': {
    title: 'Rotate PDF Free — Turn Pages Permanently | HowAutomate',
    description: 'Rotate all pages or individual pages of a PDF and save the result permanently. Free, in your browser, no upload.',
    h1: 'Rotate PDF',
    intro: 'Fix sideways or upside-down scans: rotate every page at once or just the ones that need it, and save the PDF so it opens the right way up everywhere.',
    faqs: [{ q: 'Is the rotation permanent?', a: 'Yes. The saved PDF opens with the new orientation in every viewer, on phone and computer, and prints that way too.' }, ...ORGANIZE_FAQS],
  },
  '/delete-pdf-pages': {
    title: 'Delete Pages from PDF Free — Remove Pages Online | HowAutomate',
    description: 'Remove unwanted pages from a PDF by clicking them, then download the shorter file. Free, in your browser, no upload.',
    h1: 'Delete PDF Pages',
    intro: 'Remove blank pages, duplicates or anything you don’t want to share before sending a document. Click the bin on a page to remove it (and again to bring it back), then download.',
    faqs: ORGANIZE_FAQS,
  },
  '/add-page-numbers': {
    title: 'Add Page Numbers to PDF Free — Position & Format | HowAutomate',
    description: 'Add page numbers to a PDF: choose the position, format (1, Page 1, Page 1 of 10), start number and skip the cover page. Free, no upload.',
    h1: 'Add Page Numbers to PDF',
    intro: 'Number the pages of a report, thesis, tender or file for submission. Pick where the numbers go and how they look, start from any number, and leave the cover page unnumbered if you like.',
    faqs: [
      { q: 'Can I skip the cover page?', a: 'Yes — tick "Don’t number the first page" and numbering starts on page 2 with your chosen start number.' },
      { q: 'What if some pages are landscape or rotated?', a: 'Numbers are placed where you chose as each page is displayed, so a landscape page gets its number in the correct corner, the right way up.' },
      { q: 'Is my PDF uploaded?', a: 'No. Numbers are added inside your browser.' },
    ],
  },
  '/watermark-pdf': {
    title: 'Watermark PDF Free — Add CONFIDENTIAL, DRAFT or Any Text | HowAutomate',
    description: 'Add a text watermark to every page of a PDF — CONFIDENTIAL, DRAFT, COPY or your own words. Choose size, angle, colour and transparency. Free, no upload.',
    h1: 'Watermark PDF',
    intro: 'Stamp every page with CONFIDENTIAL, DRAFT, COPY, your company name or any short text — once in the middle or repeated across the page, at the angle and transparency you choose.',
    faqs: [
      { q: 'Can a watermark be removed?', a: 'A text watermark makes copying and misuse obvious, but determined people can remove it with PDF editing software. For sensitive documents, combine it with sharing only what is necessary.' },
      { q: 'Can I use Hindi or other scripts?', a: 'For now the watermark supports English letters, numbers and common symbols.' },
      { q: 'Is my PDF uploaded?', a: 'No. The watermark is added inside your browser.' },
    ],
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
    title: 'JPG to PDF Converter Free — Combine Photos into One PDF | HowAutomate',
    description: 'Convert JPG photos and scans to PDF free. Combine many images into one PDF, reorder pages, choose A4 or Letter. Runs in your browser — never uploaded.',
    h1: 'JPG to PDF',
    intro: 'Turn photos of documents, receipts and certificates into a single PDF. Add as many images as you need, put them in order, pick the page size and margins, and download — your photos never leave your device.',
    faqs: IMAGES_TO_PDF_FAQS,
  },
  '/png-to-pdf': {
    title: 'PNG to PDF Converter Free — Screenshots & Images to PDF | HowAutomate',
    description: 'Convert PNG screenshots and images to PDF free, lossless. Combine several into one PDF in your browser — nothing uploaded.',
    h1: 'PNG to PDF',
    intro: 'Turn screenshots, diagrams and other PNG images into a PDF without losing sharpness. Combine several into one document, reorder them and choose the page size.',
    faqs: IMAGES_TO_PDF_FAQS,
  },
  '/pdf-to-jpg': {
    title: 'PDF to JPG Converter Free — Convert PDF Pages to Images | HowAutomate',
    description: 'Convert every page of a PDF to a JPG image free, at screen or print quality. All pages or selected ones, downloaded as a ZIP. No upload.',
    h1: 'PDF to JPG',
    intro: 'Turn PDF pages into JPG images — for WhatsApp, social media, presentations or portals that only accept images. Choose the quality and the pages; multiple pages download together as a ZIP.',
    faqs: PDF_TO_IMAGES_FAQS,
  },
  '/pdf-to-png': {
    title: 'PDF to PNG Converter Free — High Quality Images | HowAutomate',
    description: 'Convert PDF pages to sharp PNG images free, up to 300 DPI. Select pages, download as ZIP. Runs in your browser — nothing uploaded.',
    h1: 'PDF to PNG',
    intro: 'Convert PDF pages to lossless PNG images — best for diagrams, text and anything you want to stay perfectly sharp. Pick the pages and quality; multiple pages come as a ZIP.',
    faqs: PDF_TO_IMAGES_FAQS,
  },

  /* ── Business & GST ─────────────────────────────────────────────── */
  '/gst-invoice-generator': {
    title: 'Free GST Invoice Generator (India) - HowAutomate Tools',
    description: 'Create a GST-compliant tax invoice for free — auto CGST/SGST/IGST split, HSN/SAC codes, amount in words, and instant PDF download. Everything runs in your browser, nothing is uploaded.',
    h1: 'GST Invoice Generator',
    intro: 'Create a GST tax invoice with automatic CGST/SGST or IGST split, HSN/SAC codes, amount in words, your logo and bank details, then save it as a PDF. Free, with no sign-up.',
  },
  '/quotation-generator': {
    title: 'Quotation Generator Free — GST Quotation Format (India) PDF | HowAutomate',
    description: 'Create a professional price quotation with GST, HSN codes, validity date, terms, logo and bank details — download as PDF. Free, no sign-up, nothing uploaded.',
    h1: 'Quotation Generator',
    intro: 'Send a client a proper quotation in minutes: your logo and GSTIN, item-wise prices with CGST/SGST or IGST worked out, a valid-until date and your terms — saved as a clean PDF.',
    faqs: [
      { q: 'What should a quotation include?', a: 'Your business name, address and GSTIN, the customer’s details, a quotation number and date, each item with HSN/SAC code, quantity, rate and GST, the total, how long the prices are valid, and payment and delivery terms.' },
      { q: 'Is a quotation the same as an invoice?', a: 'No. A quotation is an offer before the sale; it creates no tax liability. Once the customer accepts and you supply, issue a tax invoice — you can make one with the free GST Invoice Generator using the same details.' },
      { q: 'Is my data uploaded?', a: 'No. Everything you type stays in your browser and the PDF is made on your device.' },
    ],
  },
  '/proforma-invoice-generator': {
    title: 'Proforma Invoice Generator Free — Format with GST (India) | HowAutomate',
    description: 'Make a proforma invoice with GST, bank and UPI details to request an advance before supply. Free, prints to PDF, nothing uploaded.',
    h1: 'Proforma Invoice Generator',
    intro: 'Need an advance, or a buyer wants the final price on paper before the sale? Create a proforma invoice with GST worked out and your bank and UPI details, clearly marked as not a tax invoice.',
    faqs: [
      { q: 'What is a proforma invoice?', a: 'A preliminary bill sent before goods or services are supplied — to confirm the price, request an advance, or support a buyer’s purchase approval or import paperwork. It is not a tax invoice and is not recorded as a sale.' },
      { q: 'Do I still need a tax invoice later?', a: 'Yes. When you actually supply the goods or services, issue a regular GST tax invoice — the free GST Invoice Generator does that.' },
      { q: 'Is my data uploaded?', a: 'No. The proforma is created in your browser and saved as a PDF on your device.' },
    ],
  },
  '/delivery-challan-generator': {
    title: 'Delivery Challan Format Free — GST Challan Generator PDF | HowAutomate',
    description: 'Create a GST delivery challan for job work, supply on approval, stock transfer or goods sent before the invoice — with HSN, quantities, vehicle number and signature boxes. Free PDF.',
    h1: 'Delivery Challan Generator',
    intro: 'Moving goods without a tax invoice — for job work, on approval, as samples, to your own branch, or before the invoice is ready? Make a delivery challan with the consignee, items, HSN codes, quantities, vehicle details and signature boxes, with or without prices.',
    faqs: [
      { q: 'When is a delivery challan used instead of a tax invoice?', a: 'Common cases are goods sent for job work, supply on approval or sale-or-return, transfers to your own branch, exhibitions and samples, and goods dispatched when the quantity or final invoice is not yet known. Check with your accountant for your specific case.' },
      { q: 'What does a delivery challan need to contain?', a: 'Typically: challan number and date, the consignor’s and consignee’s names, addresses and GSTINs, the HSN code, description and quantity of goods, the taxable value and tax where applicable, the place of supply for inter-state movement, and a signature. This generator includes all of these fields.' },
      { q: 'Do I need an e-way bill as well?', a: 'Possibly — for goods above the e-way bill value threshold, an e-way bill is usually required in addition to the challan. Confirm the current rules for your state and movement type.' },
      { q: 'Can I hide prices on the challan?', a: 'Yes. Untick "Show prices and tax" to print a challan with items and quantities only — common for job work and approval challans.' },
    ],
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

  /* ── QR codes ───────────────────────────────────────────────────── */
  '/qr-code-generator': {
    title: 'QR Code Generator Free — Links, UPI, WhatsApp, Wi-Fi | HowAutomate',
    description: 'Create free QR codes that never expire — for links, UPI payments, WhatsApp chats, Wi-Fi passwords and contact cards. Custom colours, PNG and SVG download, no sign-up.',
    h1: 'QR Code Generator',
    intro: 'Make a QR code for a website, a UPI payment, a WhatsApp chat, your Wi-Fi or a contact card. Codes are free forever, never expire, and contain no tracking — download as PNG or print-quality SVG.',
    faqs: QR_FAQS,
  },
  '/upi-qr-code-generator': {
    title: 'UPI QR Code Generator Free — Payment QR for Shops | HowAutomate',
    description: 'Create a UPI payment QR code from your UPI ID — works with Google Pay, PhonePe, Paytm and BHIM. Optional fixed amount, printable "Scan & Pay" card. Free.',
    h1: 'UPI QR Code Generator',
    intro: 'Turn your UPI ID into a payment QR code customers can scan with any UPI app. Leave the amount blank for a counter QR, or fix an amount for a specific bill — then download it or print a ready-made “Scan & Pay” card.',
    faqs: [
      { q: 'Which apps can pay with this QR code?', a: 'Any UPI app — Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, bank apps — because it uses the standard UPI payment link format.' },
      { q: 'Is it safe? Does the money go through you?', a: 'The QR code only contains your UPI ID, name and optional amount. Payments go straight from the customer’s UPI app to your bank account; nothing passes through us, and nothing is stored.' },
      { q: 'Where do I find my UPI ID?', a: 'Open your UPI app and look at your profile or "Receive money" screen — it looks like 9876543210@ybl or yourname@okhdfcbank.' },
      { q: 'Is this the same as a merchant QR from my bank?', a: 'It works the same way for receiving payments. Merchant QR codes from banks or payment companies may add things like sound-box alerts and settlement reports; for a small shop or freelancer, this QR is enough to get paid.' },
      ...QR_FAQS,
    ],
  },
  '/whatsapp-qr-code-generator': {
    title: 'WhatsApp QR Code Generator Free — Chat Link with Message | HowAutomate',
    description: 'Create a QR code that opens a WhatsApp chat with your number and a pre-filled message. Great for shops, menus and visiting cards. Free.',
    h1: 'WhatsApp QR Code Generator',
    intro: 'Let customers message you on WhatsApp without saving your number: they scan, and a chat opens with your number and an optional ready-to-send message. Print it on your counter, menu, packaging or visiting card.',
    faqs: [
      { q: 'Does the customer need to save my number?', a: 'No. Scanning opens a WhatsApp chat with you straight away, with your pre-filled message ready to send.' },
      { q: 'Does it work with WhatsApp Business?', a: 'Yes — it works with any WhatsApp or WhatsApp Business number.' },
      ...QR_FAQS,
    ],
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
