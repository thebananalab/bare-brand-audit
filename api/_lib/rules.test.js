import { describe, it, expect } from 'vitest';
import { extractFeatures } from './extract.js';
import { runAllRules } from './rules.js';

const TROPE_HTML = `
<html>
<head>
  <title>The Future of Seamless AI-Powered Workflows</title>
  <meta name="generator" content="Framer">
  <meta name="description" content="We empower teams to unlock next-gen productivity.">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .hero { background: rgba(139,92,246,0.6); backdrop-filter: blur(12px); }
    .card { background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: #f3f4f6; }
  </style>
</head>
<body>
  <h1>Welcome</h1>
  <h1>Also a heading</h1>
  <h4>Skipped level</h4>
  <div class="bg-background text-foreground data-state=open">
    <svg class="lucide lucide-arrow-right"></svg>
  </div>
  <img src="https://images.unsplash.com/photo-123456" alt="hero">
  <img src="https://images.unsplash.com/photo-654321" alt="team">
</body>
</html>
`;

const CLEAN_HTML = `
<html>
<head>
  <title>Acme Studio</title>
  <style>
    body { font-family: 'Canela', 'Custom Grotesk', serif; }
    .brand { color: #ffb703; background: #023047; }
  </style>
</head>
<body>
  <h1>Acme Studio</h1>
  <h2>What we make</h2>
  <p>Handmade goods, no filler here.</p>
  <img src="/assets/product-01.jpg" alt="product">
  <img src="/assets/product-02.jpg" alt="product">
  <img src="/assets/product-03.jpg" alt="product">
</body>
</html>
`;

const SPA_HTML = `
<html>
<head><title>Acme</title></head>
<body>
  <div id="root"></div>
  <script src="/assets/index-8f3a91cd.js"></script>
  <script src="/assets/vendor-1c72be04.js"></script>
</body>
</html>
`;

describe('runAllRules against trope-heavy HTML', () => {
  const features = extractFeatures(TROPE_HTML, 'https://example.com');
  const rules = runAllRules(features);

  it('penalizes Inter as default typeface', () => {
    expect(rules.typography.score).toBeLessThan(50);
    expect(rules.typography.flags).toContain('DEFAULT FONT');
  });

  it('flags purple gradient heuristic', () => {
    expect(rules.color.flags).toContain('PURPLE GRADIENT');
  });

  it('flags multiple h1, skipped heading level, and shadcn markers', () => {
    expect(rules.consistency.flags).toEqual(
      expect.arrayContaining(['MULTIPLE H1', 'SKIPPED HEADING LEVEL', 'SHADCN DEFAULTS'])
    );
  });

  it('flags site builder and default icon set', () => {
    expect(rules.aiDetection.flags).toEqual(
      expect.arrayContaining(['SITE BUILDER', 'DEFAULT ICON SET', 'GLASSMORPHISM'])
    );
    expect(rules.aiDetection.score).toBeLessThan(30);
  });

  it('flags buzzword copy and generic headline', () => {
    expect(rules.differentiation.flags).toEqual(
      expect.arrayContaining(['BUZZWORD COPY', 'GENERIC HEADLINE'])
    );
  });

  it('flags stock imagery', () => {
    expect(rules.assets.flags).toContain('STOCK IMAGERY');
    expect(rules.assets.evidence[0]).toMatch(/unsplash\.com/);
  });
});

describe('runAllRules against clean custom HTML', () => {
  const features = extractFeatures(CLEAN_HTML, 'https://example.com');
  const rules = runAllRules(features);

  it('does not penalize custom fonts', () => {
    expect(rules.typography.flags).not.toContain('DEFAULT FONT');
    expect(rules.typography.score).toBeGreaterThanOrEqual(65);
  });

  it('does not flag any trope markers', () => {
    expect(rules.consistency.flags).toEqual([]);
    expect(rules.aiDetection.flags).toEqual([]);
    expect(rules.assets.flags).toEqual([]);
  });
});

describe('SPA detection', () => {
  it('flags likelySpa on near-empty client-rendered shell', () => {
    const features = extractFeatures(SPA_HTML, 'https://acme.com');
    expect(features.likelySpa).toBe(true);
  });

  it('does not apply false "no custom type" / "no signals" penalties on SPA shells', () => {
    const features = extractFeatures(SPA_HTML, 'https://acme.com');
    const rules = runAllRules(features);
    expect(rules.typography.flags).not.toContain('NO CUSTOM TYPE');
    expect(rules.typography.flags).toContain('LOW STATIC SIGNAL');
    expect(rules.aiDetection.flags).toContain('LOW STATIC SIGNAL');
  });

  it('does not flag a normal content-rich page as SPA', () => {
    const features = extractFeatures(CLEAN_HTML, 'https://example.com');
    expect(features.likelySpa).toBe(false);
  });
});

describe('single-incidental-hex regression (false positives from noisy bundled CSS)', () => {
  it('does not flag purple gradient from a single unused hex buried in a large CSS bundle', () => {
    const noise = Array.from({ length: 50 }, (_, i) => `.u${i}{color:#${(100000 + i).toString(16).padStart(6, '0')};}`).join('');
    const html = `<html><head><style>${noise}.unused-token{color:#ac4bff;background:linear-gradient(90deg,#f0503d,#ff8370);}</style></head><body></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.color.flags).not.toContain('PURPLE GRADIENT');
  });

  it('does flag purple gradient when 2+ distinct purple hexes actually form a gradient', () => {
    const html = `<html><head><style>.hero{background:linear-gradient(135deg,#8b5cf6,#a78bfa);}</style></head><body></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.color.flags).toContain('PURPLE GRADIENT');
  });
});

describe('expanded rule catalog', () => {
  it('detects tier-3 "new premium default" fonts (Satoshi) with a lighter penalty than Inter', () => {
    const html = `<html><head><style>body{font-family:'Satoshi',sans-serif;}</style></head><body><h1>Hi</h1></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.typography.flags).toContain('DEFAULT FONT');
    expect(rules.typography.evidence[0]).toMatch(/satoshi/);
  });

  it('detects Canva as a stock/template asset domain', () => {
    const html = `<html><body><img src="https://canva.com/design/export.png"></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.assets.flags).toContain('STOCK IMAGERY');
  });

  it('detects Heroicons as a default icon set', () => {
    const html = `<html><body><svg class="heroicon-outline"></svg></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.aiDetection.flags).toContain('DEFAULT ICON SET');
    expect(rules.aiDetection.evidence.join(' ')).toMatch(/Heroicons/);
  });

  it('detects default Tailwind blue/indigo as a CTA color when 2+ distinct default hexes present', () => {
    const html = `<html><head><style>.btn{background:#2563eb;} .link{color:#6366f1;}</style></head><body></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.color.flags).toContain('DEFAULT CTA COLOR');
  });

  it('does not flag a single incidental CTA-colored hex as a real signal', () => {
    const html = `<html><head><style>.btn{background:#2563eb;}</style></head><body></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.color.flags).not.toContain('DEFAULT CTA COLOR');
  });

  it('detects Webflow-pattern classes even without a generator meta tag', () => {
    const html = `<html><body><a class="w-button">Click</a><div class="w-container"></div></body></html>`;
    const features = extractFeatures(html, 'https://example.com');
    const rules = runAllRules(features);
    expect(rules.aiDetection.flags).toContain('BUILDER CLASS PATTERN');
  });
});
