export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, imageBase64, imageMime, prompt, recaptchaToken } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });
  }

  if (recaptchaSecret) {
    if (!recaptchaToken) return res.status(403).json({ error: 'reCAPTCHA token missing' });
    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'secret=' + recaptchaSecret + '&response=' + recaptchaToken,
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) return res.status(403).json({ error: 'reCAPTCHA failed' });
  }

  const content = [];

  if (url) {
    try {
      const cleanUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
      const proxyRes = await fetch(
        'https://api.allorigins.win/get?url=' + encodeURIComponent(cleanUrl),
        { signal: AbortSignal.timeout(10000) }
      );
      const json = await proxyRes.json();
      if (json.contents) {
        const text = json.contents
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 7000);
        content.push({ type: 'text', text: 'Brand website content from ' + url + ':\n\n' + text });
      } else {
        content.push({ type: 'text', text: 'Brand URL: ' + url + ' — could not fetch page. Analyze from domain/context only.' });
      }
    } catch {
      content.push({ type: 'text', text: 'Brand URL: ' + url + ' — fetch failed. Analyze from domain/context only.' });
    }
  }

  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 },
    });
    content.push({ type: 'text', text: url ? 'Also analyze this brand screenshot.' : 'Analyze this brand visual in full.' });
  }

  if (!url && !imageBase64) {
    content.push({ type: 'text', text: 'No brand data provided. Return score 0 with relevant flags.' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: prompt,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await anthropicRes.json();

    if (data.error) {
      console.error('Anthropic API error:', JSON.stringify(data.error));
      throw new Error(data.error.message);
    }

    const rawText = data.content?.[0]?.text || '';
    console.log('Claude raw:', rawText.slice(0, 200));

    const text = rawText.replace(/```json|```/g, '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON in Claude response: ' + text.slice(0, 80));
    const result = JSON.parse(m[0]);

    return res.status(200).json(result);
  } catch (e) {
    console.error('analyze error:', e.message);
    return res.status(200).json({
      score: 0,
      flags: ['CLAUDE ERROR', (e.message || 'UNKNOWN').slice(0, 38).toUpperCase()],
      verdict: 'Claude API error. Check server configuration.',
      improvement: 'Verify ANTHROPIC_API_KEY in Vercel environment variables.',
    });
  }
}
