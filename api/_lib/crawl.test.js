import { describe, it, expect } from 'vitest';
import { findStylesheetLinks } from './crawl.js';

describe('findStylesheetLinks', () => {
  it('resolves relative hrefs against the base URL', () => {
    const html = `<html><head><link rel="stylesheet" href="/styles/main.css"></head></html>`;
    const urls = findStylesheetLinks(html, 'https://example.com/page');
    expect(urls).toEqual(['https://example.com/styles/main.css']);
  });

  it('skips print-media stylesheets', () => {
    const html = `
      <html><head>
        <link rel="stylesheet" href="/print.css" media="print">
        <link rel="stylesheet" href="/main.css">
      </head></html>
    `;
    const urls = findStylesheetLinks(html, 'https://example.com');
    expect(urls).toEqual(['https://example.com/main.css']);
  });

  it('dedupes and caps at 6 stylesheets', () => {
    const links = Array.from({ length: 10 }, (_, i) => `<link rel="stylesheet" href="/s${i}.css">`).join('');
    const html = `<html><head>${links}<link rel="stylesheet" href="/s0.css"></head></html>`;
    const urls = findStylesheetLinks(html, 'https://example.com');
    expect(urls.length).toBe(6);
  });

  it('skips links with unresolvable hrefs instead of throwing', () => {
    const html = `<html><head><link rel="stylesheet" href="://broken"></head></html>`;
    expect(() => findStylesheetLinks(html, 'https://example.com')).not.toThrow();
  });
});
