const BANDS = [
  { min: 80, verdict: 'Distinctive system, deliberately built.', improvement: 'Document it so it survives team turnover.' },
  { min: 65, verdict: 'Considered, but inconsistently executed.', improvement: 'Codify the rules you already half-follow.' },
  { min: 45, verdict: 'A few real decisions buried in defaults.', improvement: 'Cut the defaults, keep the decisions.' },
  { min: 25, verdict: 'Running on factory settings.', improvement: 'Replace the default first, ask questions later.' },
  { min: 0, verdict: 'Critically undesigned. Start over.', improvement: 'Rebuild this dimension from zero, not from a template.' },
];

function bandFor(score) {
  return BANDS.find(b => score >= b.min) || BANDS[BANDS.length - 1];
}

export function fallbackCaptions(ruleResults) {
  const out = {};
  for (const [key, r] of Object.entries(ruleResults)) {
    const band = bandFor(r.score);
    out[key] = { verdict: band.verdict, improvement: band.improvement };
  }
  return out;
}
