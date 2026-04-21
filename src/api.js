import { PROMPTS } from './constants'
import { fetchUrlContent } from './utils'

export async function runDimViaServer(key, url, imageBase64, imageMime, recaptchaToken) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, imageBase64, imageMime, prompt: PROMPTS[key], recaptchaToken }),
  });
  if (!res.ok) throw new Error("Server " + res.status);
  return await res.json();
}

export async function runDimDirect(key, url, imageBase64, imageMime, apiKey) {
  const parts = [];
  if (url) {
    const content = await fetchUrlContent(url);
    parts.push({ text: content
      ? "Brand website content from " + url + ":\n\n" + content
      : "Brand URL: " + url + " — could not fetch page. Analyze from domain/context only." });
  }
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } });
    parts.push({ text: url ? "Also analyze this brand screenshot." : "Analyze this brand visual in full." });
  }
  if (!url && !imageBase64) parts.push({ text: "No brand data. Return score 0 with relevant flags." });

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPTS[key] }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "")
    .replace(/```json|```/g, "").trim();
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text);
}

export async function runDim(key, url, imageBase64, imageMime, localApiKey, recaptchaToken) {
  try {
    return await runDimViaServer(key, url, imageBase64, imageMime, recaptchaToken);
  } catch (serverErr) {
    if (localApiKey) {
      try {
        return await runDimDirect(key, url, imageBase64, imageMime, localApiKey);
      } catch (e) {
        console.error("Direct Gemini error [" + key + "]:", e.message);
      }
    }
    console.error("runDim failed [" + key + "]:", serverErr.message);
    return {
      score: 0,
      flags: ["API UNREACHABLE", (serverErr.message || "").slice(0, 38).toUpperCase()],
      verdict: "Cannot reach API. Deploy to Vercel or set local key.",
      improvement: "Click GEMINI in the top rail to set a local API key.",
    };
  }
}
