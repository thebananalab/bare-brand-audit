import { describe, it, expect } from 'vitest';
import { extractFeatures } from './extract.js';

describe('extractFeatures', () => {
  it('parses font-family from inline <style>, Google Fonts link, and @font-face', () => {
    const html = `
      <html><head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400" rel="stylesheet">
        <style>
          body { font-family: 'Custom Grotesk', sans-serif; }
          @font-face { font-family: 'SelfHosted Sans'; src: url(/fonts/a.woff2); }
        </style>
      </head><body></body></html>
    `;
    const f = extractFeatures(html, 'https://example.com');
    expect(f.fontFamilies).toEqual(expect.arrayContaining(['Space Mono', 'Custom Grotesk', 'SelfHosted Sans']));
  });

  it('captures ordered heading structure and h1 count', () => {
    const html = `<html><body><h1>A</h1><h2>B</h2><h2>C</h2><h3>D</h3></body></html>`;
    const f = extractFeatures(html, 'https://example.com');
    expect(f.h1Count).toBe(1);
    expect(f.headings.map(h => h.level)).toEqual([1, 2, 2, 3]);
  });

  it('resolves relative image src to absolute and collects CSS background-image urls', () => {
    const html = `
      <html><head><style>.hero{background-image:url('/bg.jpg');}</style></head>
      <body><img src="photo.png" alt="p"></body></html>
    `;
    const f = extractFeatures(html, 'https://example.com/sub/page');
    expect(f.images).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: 'https://example.com/sub/photo.png' }),
      expect.objectContaining({ src: 'https://example.com/bg.jpg' }),
    ]));
  });

  it('extracts hex colors from inline and block styles', () => {
    const html = `<html><head><style>.a{color:#ff0000;}</style></head><body style="background:#00ff00"></body></html>`;
    const f = extractFeatures(html, 'https://example.com');
    expect(f.hexColors).toEqual(expect.arrayContaining(['#ff0000', '#00ff00']));
  });

  it('merges externalCss into the same font/color scan', () => {
    const html = `<html><body></body></html>`;
    const f = extractFeatures(html, 'https://example.com', "body{font-family:'External Font';color:#123456;}");
    expect(f.fontFamilies).toContain('External Font');
    expect(f.hexColors).toContain('#123456');
  });

  it('flags likelySpa for near-empty body with multiple hashed bundle scripts', () => {
    const html = `<html><body><div id="root"></div><script src="/a-8f3a91cd.js"></script><script src="/b-1c72be04.js"></script></body></html>`;
    const f = extractFeatures(html, 'https://example.com');
    expect(f.likelySpa).toBe(true);
  });

  it('does not flag likelySpa for a content-rich page', () => {
    const html = `<html><body><h1>Real content</h1><p>${'word '.repeat(40)}</p></body></html>`;
    const f = extractFeatures(html, 'https://example.com');
    expect(f.likelySpa).toBe(false);
  });
});
