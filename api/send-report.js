import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, score, url, results, specimenId, dateStr, dimensions } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

  const divider = '─'.repeat(38);

  const assaysHtml = dimensions.map((d, i) => {
    const r = results[d.key];
    if (!r) return '';
    const bar = Math.round(r.score / 10);
    const filled = '█'.repeat(bar) + '░'.repeat(10 - bar);
    return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e5e5;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
            <span style="font-family:monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b6b6b;">${String(i+1).padStart(2,'0')}. ${d.label}</span>
            <span style="font-family:'Archivo Black',Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:-0.03em;">${r.score}<span style="font-size:12px;font-weight:400;color:#6b6b6b;">/100</span></span>
          </div>
          <div style="font-family:monospace;font-size:13px;color:#555;letter-spacing:0.05em;margin-bottom:6px;">${filled}</div>
          <div style="font-size:14px;color:#000;margin-bottom:6px;font-style:italic;">"${r.verdict}"</div>
          ${r.improvement ? `<div style="font-size:13px;color:#6b6b6b;"><strong style="color:#000;">RX →</strong> ${r.improvement}</div>` : ''}
          ${r.flags && r.flags.length ? `<div style="margin-top:8px;">${r.flags.map(f=>`<span style="font-family:monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;border:1px solid #ccc;padding:2px 6px;margin-right:4px;display:inline-block;">${f}</span>`).join('')}</div>` : ''}
        </td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #000;">

        <!-- Header -->
        <tr>
          <td style="background:#000;padding:28px 32px;">
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:8px;">/ BRAND AUDIT REPORT</div>
            <div style="font-family:'Archivo Black',Arial,sans-serif;font-size:48px;font-weight:900;letter-spacing:-0.05em;color:#fff;line-height:1;">BARE<sup style="font-size:0.2em;font-weight:400;vertical-align:top;margin-top:8px;">©</sup></div>
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-top:12px;">Brand Aesthetic Reality Engine</div>
          </td>
        </tr>

        <!-- Score block -->
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:2px solid #000;">
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#6b6b6b;margin-bottom:8px;">/ BARE SCORE</div>
            <div style="font-family:'Archivo Black',Arial,sans-serif;font-size:88px;font-weight:900;letter-spacing:-0.06em;line-height:0.9;color:#000;">${score}<sup style="font-size:0.15em;font-family:monospace;font-weight:400;color:#6b6b6b;letter-spacing:0;vertical-align:baseline;margin-left:6px;">/100</sup></div>
            <div style="margin-top:16px;font-family:monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#6b6b6b;display:flex;gap:16px;flex-wrap:wrap;">
              <span>FILE <strong style="color:#000;">#${specimenId}</strong></span>
              &nbsp;·&nbsp;
              <span>DATE <strong style="color:#000;">${dateStr}</strong></span>
              &nbsp;·&nbsp;
              <span>SUBJECT <strong style="color:#000;">${url ? url.replace(/^https?:\/\//,'').slice(0,32) : 'IMAGE SPECIMEN'}</strong></span>
            </div>
          </td>
        </tr>

        <!-- Assays -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px;">/ ASSAY BREAKDOWN</div>
            <table width="100%" cellpadding="0" cellspacing="0">${assaysHtml}</table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#000;padding:20px 32px;">
            <div style="font-family:monospace;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4);">
              BARE · BRAND AESTHETIC REALITY ENGINE · BY BANANALAB
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: 'BARE <onboarding@resend.dev>',
      to: email,
      subject: `BARE Report #${specimenId} — Score ${score}/100`,
      html,
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Resend error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
