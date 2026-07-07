import * as cheerio from 'cheerio';

const HEX_RE = /#[0-9a-f]{3,8}\b/gi;

function resolveUrl(src, base) {
  try { return new URL(src, base).href; } catch { return src; }
}

export function extractFeatures(html, pageUrl, externalCss = '') {
  const $ = cheerio.load(html);

  const metaGenerator = ($('meta[name="generator"]').attr('content') || '').trim();
  const title = ($('title').first().text() || '').trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();

  const styleText = $('style').map((_, el) => $(el).html() || '').get().join(' ');
  const inlineStyleText = $('[style]').map((_, el) => $(el).attr('style') || '').get().join(' ');
  const allCss = styleText + ' ' + inlineStyleText + ' ' + externalCss;

  const fontFamilies = new Set();
  for (const m of allCss.matchAll(/font-family\s*:\s*([^;"}]+)/gi)) {
    m[1].split(',').forEach(f => {
      const clean = f.replace(/['"]/g, '').trim();
      if (clean && !/^(inherit|initial|unset)$/i.test(clean)) fontFamilies.add(clean);
    });
  }
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const famMatch = href.match(/family=([^&]+)/);
    if (famMatch) {
      famMatch[1].split('|').forEach(part => {
        const name = decodeURIComponent(part.split(':')[0]).replace(/\+/g, ' ').trim();
        if (name) fontFamilies.add(name);
      });
    }
  });
  for (const m of allCss.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*([^;"}]+)/gi)) {
    const clean = m[1].replace(/['"]/g, '').trim();
    if (clean) fontFamilies.add(clean);
  }

  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = Number(el.tagName[1]);
    const text = $(el).text().trim().slice(0, 200);
    if (text) headings.push({ level, text });
  });
  const h1Count = headings.filter(h => h.level === 1).length;

  const classCorpus = $('[class]').map((_, el) => $(el).attr('class') || '').get().join(' ');

  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!src) return;
    images.push({ src: resolveUrl(src, pageUrl), alt: ($(el).attr('alt') || '').trim() });
  });
  for (const m of allCss.matchAll(/background-image\s*:\s*url\(([^)]+)\)/gi)) {
    const src = m[1].replace(/['"]/g, '').trim();
    if (src) images.push({ src: resolveUrl(src, pageUrl), alt: '' });
  }

  const hexColors = [...new Set((allCss.match(HEX_RE) || []).map(h => h.toLowerCase()))];

  const gradientSignals = {
    backdropBlurCount: (allCss.match(/backdrop-filter\s*:\s*blur/gi) || []).length,
    rgbaCount: (allCss.match(/rgba\(/gi) || []).length,
    gradientCount: (allCss.match(/(linear|radial)-gradient\(/gi) || []).length,
  };

  const bundleScriptCount = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .filter(m => /[.\-][a-f0-9]{6,}\.(js|mjs)(\?|$|")/i.test(m[1])).length;

  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

  const likelySpa = bodyText.length < 150 && bundleScriptCount >= 2;

  return {
    metaGenerator,
    title,
    metaDescription,
    fontFamilies: [...fontFamilies],
    headings,
    h1Count,
    classCorpus,
    images,
    hexColors,
    gradientSignals,
    bodyText,
    likelySpa,
  };
}
