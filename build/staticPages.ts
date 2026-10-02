import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { PAGES, SITE_URL, type PageMeta } from '../src/data/pages';

/**
 * After `vite build`, writes one real HTML file per page in src/data/pages.ts
 * (dist/merge-pdf.html, …) plus dist/sitemap.xml.
 *
 * The app is a client-rendered SPA, so without this every URL served the same
 * empty shell and search engines had to run JavaScript to learn what a page
 * was about. Each file now carries its own title, description, canonical,
 * structured data and readable content (heading, intro, FAQ, related links).
 * React replaces the content of #root when it starts, exactly as before.
 * vercel.json's `cleanUrls` serves /merge-pdf from merge-pdf.html.
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// JSON inside <script> must not be able to close the tag.
const jsonForScript = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');

function setMeta(html: string, attr: 'name' | 'property', key: string, value: string) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`);
  return html.replace('</head>', `    <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`);
}

function structuredData(route: string, meta: PageMeta) {
  const url = SITE_URL + route;
  const out: Record<string, unknown>[] = [];
  if (route === '/') {
    out.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'HowAutomate Tools', url });
  } else {
    out.push({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: meta.h1, url,
      description: meta.description, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    });
    out.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Free Tools', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: meta.h1, item: url },
      ],
    });
  }
  if (meta.faqs?.length) {
    out.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: meta.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return out;
}

function body(route: string, meta: PageMeta) {
  const others = Object.entries(PAGES).filter(([r, m]) => r !== route && r !== '/' && !m.noindex);
  const faq = meta.faqs?.length
    ? `<section><h2>Frequently asked questions</h2>${meta.faqs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>`
    : '';
  // Plain, readable styling for the moment before the app loads.
  return `<main style="max-width:760px;margin:0 auto;padding:48px 20px;font-family:Inter,system-ui,sans-serif;color:#e5e7eb;background:#07040f;line-height:1.7">`
    + `<p><a href="/" style="color:#a78bfa">HowAutomate Tools</a></p>`
    + `<h1 style="font-size:2rem;color:#fff">${esc(meta.h1)}</h1><p>${esc(meta.intro)}</p>${faq}`
    + `<nav><h2>More free tools</h2><ul>${others.map(([r, m]) => `<li><a href="${r}" style="color:#a78bfa">${esc(m.h1)}</a></li>`).join('')}</ul></nav>`
    + `</main>`;
}

export function renderPage(template: string, route: string, meta: PageMeta) {
  const url = SITE_URL + route;
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  html = setMeta(html, 'name', 'description', meta.description);
  html = setMeta(html, 'property', 'og:title', meta.title);
  html = setMeta(html, 'property', 'og:description', meta.description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'name', 'twitter:title', meta.title);
  html = setMeta(html, 'name', 'twitter:description', meta.description);
  const head = [
    `<link rel="canonical" href="${url}" />`,
    meta.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
    ...structuredData(route, meta).map(d => `<script type="application/ld+json" data-prerender>${jsonForScript(d)}</script>`),
  ].filter(Boolean).map(l => `    ${l}`).join('\n');
  html = html.replace('</head>', `${head}\n  </head>`);
  return html.replace('<div id="root"></div>', `<div id="root">${body(route, meta)}</div>`);
}

export function sitemap(today: string) {
  const urls = Object.entries(PAGES)
    .filter(([, m]) => !m.noindex)
    .map(([r]) => `  <url><loc>${SITE_URL}${r}</loc><lastmod>${today}</lastmod><priority>${r === '/' ? '1.0' : '0.9'}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function staticPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'howautomate-static-pages',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      if (!template.includes('<div id="root"></div>')) throw new Error('static-pages: #root placeholder not found in index.html');
      for (const [route, meta] of Object.entries(PAGES)) {
        const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
        fs.writeFileSync(path.join(outDir, file), renderPage(template, route, meta));
      }
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap(new Date().toISOString().slice(0, 10)));
    },
  };
}
