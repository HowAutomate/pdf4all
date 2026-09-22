import { useEffect } from 'react';

const SITE_URL = 'https://tools.howautomate.com';

/**
 * Marks every tag this component owns, so a route change can clean up exactly
 * what it added without touching the tags that ship in index.html.
 */
const OWNED = 'data-seo-managed';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Keeps the page out of search results (used for embedded third-party tools). */
  noindex?: boolean;
}

type TagSpec =
  | { el: 'meta'; key: 'name' | 'property'; value: string; content: string }
  | { el: 'link'; key: 'rel'; value: string; href: string };

/**
 * Applies the page's head tags directly.
 *
 * This deliberately does not use react-helmet-async: its side effects are
 * dropped when a route component is code-split behind <Suspense>, which
 * silently stripped the title, canonical and JSON-LD from every tool page.
 */
export const SEO = ({ title, description, path, jsonLd, noindex = false }: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const tags: TagSpec[] = [
      { el: 'meta', key: 'name', value: 'description', content: description },
      { el: 'meta', key: 'property', value: 'og:title', content: title },
      { el: 'meta', key: 'property', value: 'og:description', content: description },
      { el: 'meta', key: 'property', value: 'og:url', content: url },
      { el: 'meta', key: 'property', value: 'og:type', content: 'website' },
      { el: 'meta', key: 'name', value: 'twitter:card', content: 'summary_large_image' },
      { el: 'meta', key: 'name', value: 'twitter:title', content: title },
      { el: 'meta', key: 'name', value: 'twitter:description', content: description },
      { el: 'link', key: 'rel', value: 'canonical', href: url },
    ];

    if (noindex) {
      tags.push({ el: 'meta', key: 'name', value: 'robots', content: 'noindex, nofollow' });
    }

    const created: Element[] = [];
    // Remember pre-existing values so unmount restores rather than deletes them.
    const restored: { node: Element; attr: string; value: string | null }[] = [];

    for (const tag of tags) {
      const selector = `${tag.el}[${tag.key}="${tag.value}"]`;
      const attr = tag.el === 'meta' ? 'content' : 'href';
      const next = tag.el === 'meta' ? tag.content : tag.href;

      let node = document.head.querySelector(selector);
      if (node) {
        restored.push({ node, attr, value: node.getAttribute(attr) });
      } else {
        node = document.createElement(tag.el);
        node.setAttribute(tag.key, tag.value);
        node.setAttribute(OWNED, '');
        document.head.appendChild(node);
        created.push(node);
      }
      node.setAttribute(attr, next);
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLdText) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(OWNED, '');
      script.textContent = jsonLdText;
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      created.forEach(node => node.remove());
      restored.forEach(({ node, attr, value }) => {
        if (value === null) node.removeAttribute(attr);
        else node.setAttribute(attr, value);
      });
      script?.remove();
    };
  }, [title, description, url, jsonLdText, noindex]);

  return null;
};

export default SEO;
