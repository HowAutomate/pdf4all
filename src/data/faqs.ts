/**
 * FAQ copy for tool pages. Shared by the page (visible FAQ + FAQPage
 * schema) and the build-time HTML generator, so both always say the same thing.
 */

export interface Faq { q: string; a: string }

export const EDIT_PDF_FAQS: Faq[] = [
  {
    q: 'Can I edit the existing text in my PDF?',
    a: 'Yes. Choose "Edit text" and click any line — it becomes editable in place. Edits work one line at a time: if your new text is longer, it extends to the right rather than re-flowing the paragraph, which is how most free PDF editors behave.',
  },
  {
    q: 'Does the edited text keep the original font?',
    a: 'Yes, whenever the PDF\'s own font contains every character you typed: the old text is deleted and your new text is written with the same font, size, spacing and colour. PDFs usually embed only the letters they use, so if you type a character the document never used, that line is written in the closest standard font instead. The text in the on-screen edit box is only a preview — the downloaded file uses the real font.',
  },
  {
    q: 'Is the original text deleted?',
    a: 'Yes, in most PDFs: the old text is removed from the file, not just hidden, so it can\'t be copied or extracted afterwards. For a few layouts (unusual fonts, text inside embedded graphics, some letter-spaced headings) a line can\'t be cut out safely; those lines are covered with a patch matching the background instead, and the message after downloading tells you how many. If you are removing confidential information, check that message says nothing was covered.',
  },
  {
    q: 'Can I sign a PDF with this?',
    a: 'Yes. Choose "Sign", draw your signature with a mouse or finger (or type it), then click where it should go. You can drag and resize it before downloading. This adds a visual signature, not a certificate-based digital signature (DSC).',
  },
  {
    q: 'Is my PDF uploaded to a server?',
    a: 'No. The PDF is opened, edited and saved entirely in your browser. Unlike most online PDF editors, nothing is sent to a server, so it is safe for invoices, bank statements and other private documents.',
  },
  {
    q: 'Why can\'t I click the text in my scanned PDF?',
    a: 'A scanned PDF is a picture of a page, with no real text inside. You can still use White-out, Add text, Highlight, Sign and Image on it.',
  },
];

export const GST_CALCULATOR_FAQS: Faq[] = [
  {
    q: 'How do I add GST to a price?',
    a: 'Multiply the price by the rate and add it: ₹1,000 at 18% → GST ₹180, total ₹1,180. Choose "Add GST" above.',
  },
  {
    q: 'How do I remove GST from a GST-inclusive price?',
    a: 'Divide by (100 + rate) and multiply by 100: ₹1,180 inclusive of 18% → ₹1,180 × 100 ÷ 118 = ₹1,000 taxable value, GST ₹180. Don\'t just take 18% off the total — that gives ₹967.60, which is wrong. Choose "Remove GST" above.',
  },
  {
    q: 'When is it CGST + SGST and when is it IGST?',
    a: 'If the seller and the place of supply are in the same state, the GST is split equally into CGST and SGST (18% = 9% + 9%). If they are in different states, the whole amount is IGST. The total tax is the same either way.',
  },
  {
    q: 'What are the GST rates now?',
    a: 'Since the GST 2.0 rate rationalisation took effect on 22 September 2025, most items fall in two main slabs, 5% and 18%, with a 40% slab for luxury and sin goods. Special rates such as 3% (gold, silver) and 0.25% (rough diamonds) continue. Always check the current rate notified for your HSN/SAC code.',
  },
  {
    q: 'Can I turn this into an invoice?',
    a: 'Yes — use the free GST Invoice Generator, which applies the same maths per line item and adds HSN codes, GSTINs and amount in words.',
  },
];

export const RENT_RECEIPT_FAQS: Faq[] = [
  {
    q: 'Do I need rent receipts to claim HRA?',
    a: 'Most employers ask for rent receipts as proof before they reduce TDS for HRA, usually in the January–March proof-submission window. HRA exemption is only available under the old tax regime — the new regime does not allow it.',
  },
  {
    q: 'When is the landlord\'s PAN mandatory?',
    a: 'If the rent you pay is more than ₹1,00,000 in the financial year (about ₹8,333 a month), your employer needs the landlord\'s PAN. If the landlord has no PAN, a signed declaration from them is usually accepted instead. This tool warns you when your total crosses the limit.',
  },
  {
    q: 'Do rent receipts need a revenue stamp?',
    a: 'A ₹1 revenue stamp is customarily affixed to receipts for cash payments above ₹5,000. Payments by UPI, bank transfer or cheque leave their own trail, so most employers don\'t ask for one. When you pick Cash with rent above ₹5,000, the receipt gets a marked box for the stamp.',
  },
  {
    q: 'Does the landlord have to sign each receipt?',
    a: 'Yes. Print the receipts and get each one signed by the landlord — an unsigned receipt is usually rejected. The tool prints two receipts per A4 page with a signature line on each.',
  },
  {
    q: 'Is my data uploaded anywhere?',
    a: 'No. Everything — names, PAN, address, amounts — stays in your browser. The receipts are produced by your browser\'s own print-to-PDF; nothing is sent to a server.',
  },
];

export const SALARY_SLIP_FAQS: Faq[] = [
  {
    q: 'Is a salary slip from this tool valid?',
    a: 'A salary slip is valid when it is issued by the employer with correct figures — the format itself is not prescribed by law. This tool gives you a clean, standard layout; the employer is responsible for the numbers and for signing or stamping it if the recipient (a bank, a visa office) asks for that.',
  },
  {
    q: 'How is PF calculated?',
    a: 'Employee EPF is 12% of Basic (plus DA). Many employers cap it at the ₹15,000 statutory wage ceiling, which makes the maximum ₹1,800 a month. The "Fill PF" button uses the capped method; type a different figure if your company contributes on the full Basic.',
  },
  {
    q: 'What about Professional Tax and TDS?',
    a: 'Professional Tax depends on your state (e.g. ₹200 a month in Maharashtra and Karnataka, nil in Rajasthan and Delhi), and TDS depends on the employee\'s full-year income and chosen regime. Enter the figures your payroll calculated — this tool doesn\'t guess them.',
  },
  {
    q: 'Can I make slips for several months or employees?',
    a: 'Change the month or the employee details and print again — each print is a separate PDF. If you are doing this every month for a team, that is the point where payroll automation pays for itself.',
  },
  {
    q: 'Is employee data uploaded anywhere?',
    a: 'No. PAN, bank and salary details stay in your browser and are never sent to a server.',
  },
];

export const MERGE_PDF_FAQS: Faq[] = [
  { q: 'How many PDFs can I merge at once?', a: `Up to 25 files, with a combined size of 100 MB. There is no limit on how many times you can use the tool.` },
  { q: 'Can I change the order of the files?', a: 'Yes. Each file in the list has up and down arrows. The merged PDF follows the order shown on screen, top to bottom, and the running page count tells you how long the result will be.' },
  { q: 'Are my files uploaded anywhere?', a: 'No. The merge happens entirely inside your browser using pdf-lib, a JavaScript library. No server receives, stores, or sees your documents.' },
  { q: 'Does the merged PDF have a watermark?', a: 'No. The output is a clean PDF containing exactly the pages of your source files, with no branding added.' },
  { q: 'Why does one of my files say it is unreadable?', a: 'That usually means the PDF is password-protected. Open it in a PDF reader, enter the password, save an unprotected copy, and merge that copy instead.' },
  { q: 'Are bookmarks and form fields kept?', a: 'Page content, text, and images are copied exactly. Document-level extras such as bookmarks, form fields, and attachments are not carried across — this is a page merger, not a full PDF editor.' },
  ];

export const SPLIT_PDF_FAQS: Faq[] = [
  { q: 'How do I extract just a few pages?', a: 'Choose "Extract pages" and type the pages you want, for example 1-3, 7, 10-12. You get a single PDF containing those pages in the order you listed them, and duplicates are ignored.' },
  { q: 'Why do I get a ZIP file?', a: 'When a split produces more than one PDF, browsers block downloading many files at once. Packing them into a single ZIP is the reliable way — open it with the built-in unzip tool on Windows, Mac, Android, or iOS.' },
  { q: 'What does "Split every N pages" do?', a: 'It cuts the document into equal chunks. With N set to 10, a 95-page PDF becomes ten files: nine of 10 pages and one final file with the remaining 5.' },
  { q: 'Are my files uploaded anywhere?', a: 'No. The split happens entirely inside your browser using pdf-lib. No server receives, stores, or sees your document.' },
  { q: 'Does the output have a watermark?', a: 'No. Each output PDF contains exactly the pages you selected, with nothing added.' },
  { q: 'It says my PDF cannot be read — why?', a: 'The file is almost certainly password-protected. Open it in a PDF reader, enter the password, save an unprotected copy, and split that copy instead.' },
  ];
