export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, imageBase64, imageMime, prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables' });
  }

  const parts = [];

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
        parts.push({ text: 'Brand website content from ' + url + ':\n\n' + text });
      } else {
        parts.push({ text: 'Brand URL: ' + url + ' — could not fetch page. Analyze from domain/context only.' });
      }
    } catch {
      parts.push({ text: 'Brand URL: ' + url + ' — fetch failed. Analyze from domain/context only.' });
    }
  }

  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime || 'image/jpeg', data: imageBase64 } });
    parts.push({ text: url ? 'Also analyze this brand screenshot.' : 'Analyze this brand visual in full.' });
  }

  if (!url && !imageBase64) {
    parts.push({ text: 'No brand data provided. Return score 0 with relevant flags.' });
  }

  try {
    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (data.error) {
      console.error('Gemini API error:', JSON.stringify(data.error));
      throw new Error(data.error.message);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini raw:', rawText.slice(0, 200));

    const text = rawText.replace(/```json|```/g, '').trim();
    const m = text.match(/\{[\s\S]*?\}/);
    if (!m) throw new Error('No JSON object in Gemini response: ' + text.slice(0, 80));
    const result = JSON.parse(m[0]);

    return res.status(200).json(result);
  } catch (e) {
    console.error('analyze error:', e.message);
    return res.status(200).json({
      score: 0,
      flags: ['GEMINI ERROR', (e.message || 'UNKNOWN').slice(0, 38).toUpperCase()],
      verdict: 'Gemini API error. Check server configuration.',
      improvement: 'Verify GEMINI_API_KEY in Vercel environment variables.',
    });
  }
}
