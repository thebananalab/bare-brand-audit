import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_STYLESHEETS = 6;
const MAX_CSS_BYTES = 300_000;

export async function crawlPage(rawUrl) {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(8000),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('text/html')) {
      const html = await res.text();
      if (html && html.length > 200) return { html, method: 'direct', url };
    }
  } catch {
    // fall through to proxy
  }

  try {
    const proxyRes = await fetch(
      'https://api.allorigins.win/get?url=' + encodeURIComponent(url),
      { signal: AbortSignal.timeout(10000) }
    );
    const json = await proxyRes.json();
    if (json.contents && json.contents.length > 200) {
      return { html: json.contents, method: 'proxy', url };
    }
  } catch {
    // fall through to failed
  }

  return { html: null, method: 'failed', url };
}

export function findStylesheetLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const urls = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const media = ($(el).attr('media') || '').trim();
    if (media && /print/i.test(media)) return;
    const href = $(el).attr('href') || '';
    if (!href) return;
    try { urls.push(new URL(href, baseUrl).href); } catch { /* skip unresolvable */ }
  });
  return [...new Set(urls)].slice(0, MAX_STYLESHEETS);
}

export async function fetchStylesheets(urls) {
  const results = await Promise.allSettled(
    urls.map(u => fetch(u, {
      headers: { 'User-Agent': UA, 'Accept': 'text/css' },
      signal: AbortSignal.timeout(5000),
    }).then(r => (r.ok ? r.text() : '')))
  );
  return results
    .map(r => (r.status === 'fulfilled' ? r.value : ''))
    .join(' ')
    .slice(0, MAX_CSS_BYTES);
}
