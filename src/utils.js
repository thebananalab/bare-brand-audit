export function scoreKind(s) {
  if (s == null) return "pending";
  if (s >= 70) return "green";
  if (s >= 45) return "amber";
  return "red";
}

export function scoreColor(s) {
  const k = scoreKind(s);
  if (k === "green") return "var(--green)";
  if (k === "amber") return "var(--amber)";
  if (k === "red") return "var(--red)";
  return "currentColor";
}

export function diagText(s) {
  if (s >= 80) return ["Genuine", "design", "intent."];
  if (s >= 65) return ["Considered.", "Inconsistently", "executed."];
  if (s >= 45) return ["A few", "real", "decisions."];
  if (s >= 25) return ["Running on", "factory", "settings."];
  return ["Critically", "undesigned.", "Start over."];
}

export const CACHE_TTL = 24 * 60 * 60 * 1000;

export function getCacheKey(url, b64) {
  const u = url ? btoa(encodeURIComponent(url)).slice(0, 20) : "";
  const i = b64 ? b64.slice(0, 16) : "";
  return "bare_v2_" + u + "_" + i;
}

export function loadFromCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { results, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return results;
  } catch { return null; }
}

export function saveToCache(key, results) {
  try { localStorage.setItem(key, JSON.stringify({ results, ts: Date.now() })); } catch {}
}

export async function fetchUrlContent(rawUrl) {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl;
  try {
    const res = await fetch(
      "https://api.allorigins.win/get?url=" + encodeURIComponent(url),
      { signal: AbortSignal.timeout(10000) }
    );
    const json = await res.json();
    if (!json.contents) return null;
    return json.contents
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 7000);
  } catch { return null; }
}
