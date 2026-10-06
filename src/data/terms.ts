/**
 * Terms of Use & Disclaimer for tools.howautomate.com.
 *
 * Single source for both the React page (/terms) and the pre-rendered HTML,
 * so the text a crawler sees and the text a visitor sees can never drift.
 * Change EFFECTIVE_DATE whenever the wording changes.
 */
export const TERMS_EFFECTIVE_DATE = '6 October 2026';
export const TERMS_CONTACT = 'hello@howautomate.com';

export interface TermsSection {
  h: string;
  p: string[];
}

export const TERMS_SUMMARY =
  'These tools are free and are provided for genuine, lawful, personal and business use only. You are responsible for how you use them and for the files and documents you create. HowAutomate is not responsible or liable for any misuse, or for any loss arising from the use of these tools.';

export const TERMS: TermsSection[] = [
  {
    h: '1. Acceptance of these terms',
    p: [
      'tools.howautomate.com (the "Site") is operated by HowAutomate ("we", "us"). By using any tool on the Site you agree to these Terms of Use. If you do not agree, please do not use the Site.',
    ],
  },
  {
    h: '2. Genuine and lawful use only',
    p: [
      'The tools are meant for honest, everyday purposes, such as preparing your own documents, resizing your own photos for a form, or converting files you are entitled to use. You agree not to use the Site to:',
      '• create, alter or forge any document in order to deceive anyone. This includes fake invoices, rent receipts, salary slips, quotations, delivery challans, certificates, mark sheets, identity documents or any official or government record;',
      '• make false claims for tax, HRA, GST input credit, loans, reimbursements, visas, admissions, employment or any other benefit;',
      '• edit, sign, stamp or watermark a document you are not authorised to change, or imitate another person\'s signature;',
      '• process content you do not own or have permission to use, or infringe anyone\'s copyright, trademark, privacy or other rights;',
      '• create QR codes, payment (UPI) codes or links that mislead people, impersonate others or lead to fraud, phishing or malware;',
      '• do anything that breaks any law in India or in the place where you are.',
      'Any document you create with these tools is yours. You alone are responsible for its accuracy, its legality and how it is used. Misuse may be a criminal offence, including under the Bharatiya Nyaya Sanhita, 2023, the Information Technology Act, 2000 and tax laws, and we will co-operate with lawful requests from authorities.',
    ],
  },
  {
    h: '3. Not professional advice',
    p: [
      'Calculators, generators and templates (for example the GST calculator, GST invoice, rent receipt and salary slip generators) are convenience tools only. They are not legal, tax, accounting or financial advice, and they do not guarantee that a document meets any law or any authority\'s requirements. Tax rates and rules change, so check important figures with a qualified professional before relying on them.',
    ],
  },
  {
    h: '4. Exam, government and passport photo sizes',
    p: [
      'Sizes and specifications for exams, job portals, passports and visas are based on publicly available official notices at the time of writing. Authorities can change them without notice. Always check the latest official notification before you submit. We do not guarantee that any photo, signature or file will be accepted, and we are not responsible for a rejected application, a missed deadline or any fee lost.',
    ],
  },
  {
    h: '5. Your files and privacy',
    p: [
      'Most tools process your files entirely inside your browser, and those files are not uploaded to us. A few features, such as converting Word, Excel or PowerPoint files to PDF, need a server. For those, the file is sent to our conversion service only to perform that conversion and is not used for any other purpose.',
      'Do not upload highly sensitive documents if you are not comfortable doing so. You are responsible for keeping your own copies and backups. We are not responsible for any data you lose.',
    ],
  },
  {
    h: '6. Provided "as is", with no warranty',
    p: [
      'The tools are free and provided "as is" and "as available". We make no promise that they will be error-free, uninterrupted, accurate, or suitable for any particular purpose. Conversions, compression, background removal, text editing and other results may sometimes be imperfect. Always review the output before you use it.',
    ],
  },
  {
    h: '7. Limitation of liability',
    p: [
      'To the fullest extent permitted by law, HowAutomate and its owners, team and partners will not be liable for any direct, indirect, incidental, special or consequential loss or damage arising from your use of, or inability to use, the Site or any output it produces. This includes loss of data, money, business, opportunity or reputation, and any claim from a third party. Because the tools are free, our total liability for any claim is limited to ₹0 (zero), or the lowest amount the law allows.',
    ],
  },
  {
    h: '8. Indemnity',
    p: [
      'You agree to protect and compensate HowAutomate against any claim, penalty, loss or legal cost arising from your misuse of the Site, any document you create with it, or your breach of these terms or of any law.',
    ],
  },
  {
    h: '9. Third-party services and links',
    p: [
      'The Site may link to, or use, third-party websites and services. We do not control them and are not responsible for their content, availability or practices.',
    ],
  },
  {
    h: '10. Changes to the tools and these terms',
    p: [
      'We may change, suspend or remove any tool, or block access for anyone misusing the Site, at any time and without notice. We may also update these terms. The date at the top shows the latest version, and continuing to use the Site means you accept the updated terms.',
    ],
  },
  {
    h: '11. Governing law',
    p: [
      'These terms are governed by the laws of India. Any dispute is subject to the exclusive jurisdiction of the courts at Jaipur, Rajasthan.',
    ],
  },
  {
    h: '12. Contact and reporting misuse',
    p: [
      `Questions about these terms, or want to report misuse of the Site? Email ${TERMS_CONTACT}.`,
    ],
  },
];
