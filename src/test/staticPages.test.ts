// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderPage, sitemap } from '../../build/staticPages';
import { PAGES } from '@/data/pages';

const template = `<!doctype html><html><head>
<title>Old</title>
<meta name="description" content="old" />
<meta property="og:title" content="old" />
</head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>`;

describe('static page generator', () => {
  it('writes the page’s own head, structured data and readable body', () => {
    const html = renderPage(template, '/merge-pdf', PAGES['/merge-pdf']);
    expect(html).toContain('<title>Merge PDF — Combine PDF Files Online Free | HowAutomate</title>');
    expect(html).toContain('<link rel="canonical" href="https://tools.howautomate.com/merge-pdf" />');
    expect(html).toMatch(/<meta property="og:title" content="Merge PDF/);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('<h1 style="font-size:2rem;color:#fff">Merge PDF</h1>');
    expect(html).not.toContain('href="/merge-pdf"'); // doesn't link to itself
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>'); // app still loads
  });

  it('escapes HTML and keeps JSON-LD from closing its script tag', () => {
    const html = renderPage(template, '/x', { title: 'A & <B>', description: 'say "hi"', h1: '<i>', intro: '</script><script>alert(1)</script>', faqs: [{ q: '</script>', a: 'x' }] });
    expect(html).toContain('<title>A &amp; &lt;B&gt;</title>');
    expect(html).toContain('content="say &quot;hi&quot;"');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('\\u003c/script>');
  });

  it('marks hidden pages noindex and leaves them out of the sitemap', () => {
    expect(renderPage(template, '/ugc-content', PAGES['/ugc-content'])).toContain('noindex, nofollow');
    const xml = sitemap('2026-10-02');
    expect(xml).not.toContain('/ugc-content');
    expect(xml).toContain('<loc>https://tools.howautomate.com/resize-image-to-20kb</loc>');
    expect((xml.match(/<loc>/g) ?? []).length).toBe(Object.values(PAGES).filter(p => !p.noindex).length);
  });

  it('pre-renders the full terms page and links it from every page', () => {
    const html = renderPage(template, '/terms', PAGES['/terms']);
    expect(html).toContain('"@type":"WebPage"');
    expect(html).not.toContain('"@type":"WebApplication"');
    expect(html).toContain('Genuine and lawful use only');
    expect(html).toContain('Limitation of liability');
    expect(renderPage(template, '/merge-pdf', PAGES['/merge-pdf'])).toContain('href="/terms"');
    expect(renderPage(template, '/merge-pdf', PAGES['/merge-pdf'])).not.toContain('<li><a href="/terms"'); // not listed as a tool
  });
});
