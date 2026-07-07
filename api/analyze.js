import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { crawlPage, findStylesheetLinks, fetchStylesheets } from './_lib/crawl.js';
import { extractFeatures } from './_lib/extract.js';
import { runAllRules } from './_lib/rules.js';
import { fallbackCaptions } from './_lib/fallbackCopy.js';
import { summarizeDimensions, visualOnlyAudit } from './_lib/summarize.js';

let ratelimit;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(3, '1 d'),
    analytics: false,
  });
}

const DIM_KEYS = ['typography', 'color', 'consistency', 'aiDetection', 'differentiation', 'assets'];

function unreachableFallback(message) {
  const out = {};
  for (const key of DIM_KEYS) {
    out[key] = {
      score: 0,
      flags: ['CLAUDE ERROR', (message || 'UNKNOWN').slice(0, 38).toUpperCase()],
      verdict: 'Claude API error. Check server configuration.',
      improvement: 'Verify ANTHROPIC_API_KEY in Vercel environment variables.',
    };
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, imageBase64, imageMime, recaptchaToken } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

  if (ratelimit) {
    try {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      const { success } = await ratelimit.limit(ip);
      if (!success) return res.status(429).json({ error: 'Limit of 3 audits per day reached. Come back tomorrow.' });
    } catch (e) {
      console.error('ratelimit check failed, failing open:', e.message);
    }
  }

  if (recaptchaSecret && recaptchaToken) {
    try {
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'secret=' + recaptchaSecret + '&response=' + recaptchaToken,
        signal: AbortSignal.timeout(6000),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) return res.status(403).json({ error: 'reCAPTCHA failed' });
    } catch (e) {
      console.error('recaptcha verify failed, failing open:', e.message);
    }
  }

  if (!url && !imageBase64) {
    return res.status(200).json({
      results: unreachableFallback('NO BRAND DATA PROVIDED'),
      meta: { fetchMethod: 'none', mode: 'none', llmUsed: false },
    });
  }

  // Image-only mode: no HTML to run rules against, LLM originates the score.
  if (!url && imageBase64) {
    if (!apiKey) {
      return res.status(200).json({
        results: unreachableFallback('ANTHROPIC_API_KEY NOT SET'),
        meta: { fetchMethod: 'none', mode: 'visual-only', llmUsed: false },
      });
    }
    try {
      const results = await visualOnlyAudit({ imageBase64, imageMime }, apiKey);
      for (const key of DIM_KEYS) {
        results[key].flags = [...(results[key].flags || []), 'VISUAL ESTIMATE — NO SOURCE URL'];
      }
      return res.status(200).json({ results, meta: { fetchMethod: 'none', mode: 'visual-only', llmUsed: true } });
    } catch (e) {
      console.error('visualOnlyAudit error:', e.message);
      return res.status(200).json({
        results: unreachableFallback(e.message),
        meta: { fetchMethod: 'none', mode: 'visual-only', llmUsed: false },
      });
    }
  }

  // URL present: crawl + extract + deterministic rules, LLM only captions.
  const crawl = await crawlPage(url);
  if (!crawl.html) {
    return res.status(200).json({
      results: unreachableFallback('COULD NOT FETCH PAGE'),
      meta: { fetchMethod: 'failed', mode: 'rules', llmUsed: false },
    });
  }

  const stylesheetUrls = findStylesheetLinks(crawl.html, crawl.url);
  const externalCss = stylesheetUrls.length ? await fetchStylesheets(stylesheetUrls) : '';

  const features = extractFeatures(crawl.html, crawl.url, externalCss);
  const ruleResults = runAllRules(features);

  let captions;
  let llmUsed = false;
  if (apiKey) {
    try {
      captions = await summarizeDimensions(ruleResults, { url, imageBase64, imageMime }, apiKey);
      llmUsed = true;
    } catch (e) {
      console.error('summarizeDimensions error:', e.message);
      captions = fallbackCaptions(ruleResults);
    }
  } else {
    captions = fallbackCaptions(ruleResults);
  }

  const results = {};
  for (const key of DIM_KEYS) {
    results[key] = {
      score: ruleResults[key].score,
      evidence: ruleResults[key].evidence,
      flags: ruleResults[key].flags,
      verdict: captions[key].verdict,
      improvement: captions[key].improvement,
    };
  }

  return res.status(200).json({
    results,
    meta: { fetchMethod: crawl.method, mode: 'rules', llmUsed, stylesheetsFetched: stylesheetUrls.length, likelySpa: features.likelySpa },
  });
}
