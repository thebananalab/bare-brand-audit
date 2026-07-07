const CAPTION_SYSTEM_PROMPT = `You are a brutal brand forensics copywriter. You are given deterministic forensic findings for 6 brand dimensions — the scores are already computed and fixed, you do not choose or influence them. For each dimension, write only: a "verdict" (1 brutal declarative sentence, max 12 words, no hedging, no softening) and an "improvement" (1 concrete irreversible action, max 12 words), both grounded in the given evidence. Never output a score. Never contradict the given score's direction (low score = critical tone, high score = still exacting but not damning). Return ONLY valid JSON: {"typography":{"verdict":"...","improvement":"..."},"color":{...},"consistency":{...},"aiDetection":{...},"differentiation":{...},"assets":{...}}`;

export async function summarizeDimensions(ruleResults, { url, imageBase64, imageMime }, apiKey) {
  const payload = Object.fromEntries(
    Object.entries(ruleResults).map(([key, r]) => [key, { score: r.score, evidence: r.evidence, flags: r.flags }])
  );

  const content = [{ type: 'text', text: 'URL: ' + (url || 'n/a') + '\n\nFindings:\n' + JSON.stringify(payload, null, 2) }];
  if (imageBase64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 } });
    content.push({ type: 'text', text: 'Reference screenshot attached for additional visual context only — do not use it to override the given findings.' });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: CAPTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const rawText = data.content?.[0]?.text || '';
  const text = rawText.replace(/```json|```/g, '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in Claude response');
  const captions = JSON.parse(m[0]);

  for (const key of Object.keys(ruleResults)) {
    if (!captions[key]?.verdict || !captions[key]?.improvement) throw new Error('Missing caption for ' + key);
  }
  return captions;
}

const VISUAL_ONLY_SYSTEM_PROMPT = `You are a brutal brand forensics expert analyzing a screenshot with no source URL available. Commit to a definitive score per dimension — no hedging. Return ONLY valid JSON with exactly these 6 keys: {"typography":{"score":0-100,"evidence":["short evidence string"],"flags":["SHORT FLAG"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"},"color":{...},"consistency":{...},"aiDetection":{...},"differentiation":{...},"assets":{...}}. Score 0=generic/AI-typical, 100=distinctive/intentional for each dimension.`;

export async function visualOnlyAudit({ imageBase64, imageMime }, apiKey) {
  const content = [
    { type: 'image', source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 } },
    { type: 'text', text: 'Analyze this brand visual in full across all 6 dimensions.' },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: VISUAL_ONLY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const rawText = data.content?.[0]?.text || '';
  const text = rawText.replace(/```json|```/g, '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in Claude response');
  return JSON.parse(m[0]);
}
