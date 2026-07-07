const AI_DEFAULT_FONTS = [
  { name: 'inter', delta: -25 },
  { name: 'plus jakarta sans', delta: -20 },
  { name: 'dm sans', delta: -20 },
  { name: 'geist', delta: -20 },
  { name: 'manrope', delta: -20 },
  { name: 'space grotesk', delta: -20 },
  { name: 'satoshi', delta: -15 },
  { name: 'switzer', delta: -15 },
  { name: 'general sans', delta: -15 },
];
const TAILWIND_GRAY_HEXES = new Set([
  '#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827',
  '#f1f5f9', '#e2e8f0', '#cbd5e1', '#64748b', '#334155', '#1e293b',
  '#f4f4f5', '#e4e4e7', '#a1a1aa', '#27272a',
  '#f5f5f5', '#e5e5e5', '#a3a3a3', '#262626',
]);
const TAILWIND_DEFAULT_CTA_HEXES = new Set(['#3b82f6', '#2563eb', '#6366f1', '#4f46e5']);
const STOCK_DOMAINS = ['unsplash.com', 'pexels.com', 'pixabay.com', 'freepik.com', 'shutterstock.com', 'istockphoto.com', 'gettyimages.com', 'envato.com', 'elements.envato.com', 'canva.com', 'stock.adobe.com', 'depositphotos.com', '123rf.com'];
const BUZZWORDS = ['seamless', 'revolutioniz', 'empower', 'cutting-edge', 'cutting edge', 'next-gen', 'next generation', 'game-chang', 'unlock', 'elevate', 'disrupt', 'unparalleled', 'ai-powered', 'reimagined', 'transform the way', 'built different', 'blazingly fast', 'end-to-end'];
const BUILDER_GENERATORS = ['framer', 'webflow', 'squarespace', 'wix'];
const BUILDER_CLASS_RE = /\bw-(button|container|inline-block|nav-link|dropdown|form)\b/;
const SHADCN_MARKERS = ['bg-background', 'text-foreground', 'border-border', 'bg-card', 'text-card-foreground', 'data-state='];
const ICON_LIBRARIES = [
  { name: 'Lucide', patterns: ['lucide', 'data-lucide'] },
  { name: 'Heroicons', patterns: ['heroicon'] },
  { name: 'Phosphor', patterns: ['ph-bold', 'ph-fill', 'ph-duotone', 'phosphor-icon'] },
  { name: 'Tabler Icons', patterns: ['tabler-icon', 'ti ti-'] },
];

function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

function hexToHue(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return null;
  let hue;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hue;
}

function makeResult(baseline) {
  return { score: baseline, evidence: [], flags: [] };
}
function hit(r, delta, evidence, flag) {
  r.score += delta;
  r.evidence.push(evidence);
  if (flag) r.flags.push(flag);
}

function scoreTypography(f) {
  const r = makeResult(65);
  const lowerFonts = f.fontFamilies.map(x => x.toLowerCase());
  const aiFont = AI_DEFAULT_FONTS.find(d => lowerFonts.some(lf => lf.includes(d.name)));
  if (aiFont) {
    hit(r, aiFont.delta, `font-family stack includes "${aiFont.name}" — default AI/startup typeface`, 'DEFAULT FONT');
  }
  if (f.fontFamilies.length === 0 && !f.likelySpa) {
    hit(r, -10, 'no custom font-family declared — system font stack only', 'NO CUSTOM TYPE');
  }
  const customCount = f.fontFamilies.filter(ff => !AI_DEFAULT_FONTS.some(d => ff.toLowerCase().includes(d.name))).length;
  if (customCount >= 2) {
    hit(r, 10, `${customCount} distinct non-default font families detected`);
  }
  r.score = clamp(r.score);
  return r;
}

function scoreColor(f) {
  const r = makeResult(60);
  const grayHits = f.hexColors.filter(hx => TAILWIND_GRAY_HEXES.has(hx));
  if (grayHits.length >= 2) {
    hit(r, -20, `tailwind default gray-scale palette detected (${grayHits.slice(0, 3).join(', ')})`, 'DEFAULT PALETTE');
  }
  const purpleHexes = f.hexColors.filter(hx => {
    const hue = hexToHue(hx);
    return hue !== null && hue >= 255 && hue <= 290;
  });
  const hasGradient = f.gradientSignals.gradientCount > 0 || (f.gradientSignals.backdropBlurCount > 0 && f.gradientSignals.rgbaCount > 0);
  if (purpleHexes.length > 0 && hasGradient) {
    hit(r, -20, `purple/violet gradient heuristic matched (${purpleHexes.slice(0, 2).join(', ')} + gradient css)`, 'PURPLE GRADIENT');
  }
  const ctaHits = f.hexColors.filter(hx => TAILWIND_DEFAULT_CTA_HEXES.has(hx));
  if (ctaHits.length > 0) {
    hit(r, -10, `default Tailwind blue/indigo CTA color detected (${ctaHits.join(', ')})`, 'DEFAULT CTA COLOR');
  }
  const distinctSaturated = f.hexColors.filter(hx => !TAILWIND_GRAY_HEXES.has(hx));
  if (distinctSaturated.length >= 3 && grayHits.length === 0 && purpleHexes.length === 0 && ctaHits.length === 0) {
    hit(r, 15, `${distinctSaturated.length} distinct custom hex colors, no default matches`);
  }
  r.score = clamp(r.score);
  return r;
}

function scoreConsistency(f) {
  const r = makeResult(60);
  if (f.h1Count > 1) {
    hit(r, -15, `${f.h1Count} <h1> tags found — no single page heading`, 'MULTIPLE H1');
  } else if (f.h1Count === 0 && f.headings.length > 0) {
    hit(r, -15, 'no <h1> tag found despite other headings present', 'MISSING H1');
  }
  let skipped = false;
  let prevLevel = 0;
  for (const h of f.headings) {
    if (prevLevel && h.level - prevLevel > 1) skipped = true;
    prevLevel = h.level;
  }
  if (skipped) {
    hit(r, -10, 'heading hierarchy skips a level (e.g. h2 → h4)', 'SKIPPED HEADING LEVEL');
  }
  const shadcnHits = SHADCN_MARKERS.filter(m => f.classCorpus.includes(m));
  if (shadcnHits.length > 0) {
    hit(r, -20, `shadcn/radix default component classes detected (${shadcnHits.join(', ')})`, 'SHADCN DEFAULTS');
  }
  if (f.h1Count === 1 && !skipped && shadcnHits.length === 0) {
    hit(r, 15, 'clean single-H1 sequential heading hierarchy, no default component markers');
  }
  r.score = clamp(r.score);
  return r;
}

function scoreAiDetection(f, otherNegativeCount) {
  const r = makeResult(55);
  const gen = f.metaGenerator.toLowerCase();
  const builderGenHit = BUILDER_GENERATORS.find(b => gen.includes(b));
  const builderClassHit = !builderGenHit && BUILDER_CLASS_RE.test(f.classCorpus);
  const builderHit = builderGenHit || builderClassHit;
  if (builderGenHit) {
    hit(r, -25, `<meta name="generator"> reveals site builder: ${f.metaGenerator}`, 'SITE BUILDER');
  } else if (builderClassHit) {
    hit(r, -15, 'Webflow-pattern utility classes detected in markup (w-button, w-container, ...)', 'BUILDER CLASS PATTERN');
  }
  const iconHit = ICON_LIBRARIES.find(lib => lib.patterns.some(p => f.classCorpus.includes(p)));
  if (iconHit) {
    hit(r, -15, `unmodified ${iconHit.name} icon markers found in markup`, 'DEFAULT ICON SET');
  }
  if (f.gradientSignals.backdropBlurCount > 0 && f.gradientSignals.rgbaCount > 0) {
    hit(r, -15, `glassmorphism heuristic matched (${f.gradientSignals.backdropBlurCount} backdrop-filter + rgba backgrounds)`, 'GLASSMORPHISM');
  }
  if (otherNegativeCount >= 2) {
    hit(r, -10, `${otherNegativeCount} other dimensions already flag AI-typical defaults`, 'CROSS-SIGNAL');
  }
  if (!builderHit && !iconHit && f.gradientSignals.backdropBlurCount === 0 && !f.likelySpa) {
    hit(r, 20, 'no site-builder, default icon set, or glassmorphism signals detected');
  }
  r.score = clamp(r.score);
  return r;
}

function scoreDifferentiation(f) {
  const r = makeResult(65);
  const lowerText = (f.title + ' ' + f.metaDescription + ' ' + f.bodyText).toLowerCase();
  const hits = BUZZWORDS.filter(b => lowerText.includes(b));
  if (hits.length > 0) {
    hit(r, Math.max(-40, -8 * hits.length), `buzzword copy detected: ${hits.slice(0, 4).map(h => `"${h}"`).join(', ')} (${hits.length} of ${BUZZWORDS.length} tracked terms)`, 'BUZZWORD COPY');
  }
  if (/the future of|, reimagined|revolutioniz/i.test(f.title)) {
    hit(r, -15, `generic headline pattern in title: "${f.title.slice(0, 60)}"`, 'GENERIC HEADLINE');
  }
  if (hits.length === 0) {
    hit(r, 15, 'no tracked buzzwords found in copy — weak signal, not proof of differentiation', 'LOW SIGNAL');
  }
  r.score = clamp(r.score);
  return r;
}

function scoreAssets(f) {
  const r = makeResult(50);
  if (f.images.length === 0) {
    r.flags.push('NO IMAGES DETECTED');
    r.evidence.push('no images found on page — cannot verify asset origin, score left neutral');
    return r;
  }
  const stockImgs = f.images.filter(img => STOCK_DOMAINS.some(d => img.src.includes(d)));
  if (stockImgs.length > 0) {
    const delta = -20 + -5 * (stockImgs.length - 1);
    hit(r, Math.max(-40, delta), `${stockImgs.length} stock image${stockImgs.length > 1 ? 's' : ''} detected from ${[...new Set(stockImgs.map(i => STOCK_DOMAINS.find(d => i.src.includes(d))))].join(', ')}`, 'STOCK IMAGERY');
  } else {
    hit(r, 20, `${f.images.length} images found, all from custom/first-party sources`);
  }
  r.score = clamp(r.score);
  return r;
}

export function runAllRules(features) {
  const typography = scoreTypography(features);
  const color = scoreColor(features);
  const consistency = scoreConsistency(features);
  const differentiation = scoreDifferentiation(features);
  const assets = scoreAssets(features);
  const otherNegativeCount = [typography, color, consistency, differentiation, assets].filter(r => r.score < 50).length;
  const aiDetection = scoreAiDetection(features, otherNegativeCount);
  const results = { typography, color, consistency, aiDetection, differentiation, assets };

  if (features.likelySpa) {
    for (const r of Object.values(results)) {
      if (r.evidence.length === 0) {
        r.evidence.push('page appears client-rendered (JS-heavy SPA, near-empty static HTML) — crawl found little to inspect, score less reliable than usual');
        r.flags.push('LOW STATIC SIGNAL');
      }
    }
  }

  return results;
}
