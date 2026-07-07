export async function runAudit(url, imageBase64, imageMime, recaptchaToken) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, imageBase64, imageMime, recaptchaToken }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error("RATE_LIMIT"), { isRateLimit: true, message: data.error || "3 audits per day reached." });
  }
  if (!res.ok) throw new Error("Server " + res.status);
  const data = await res.json();
  return data.results;
}
