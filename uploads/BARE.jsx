import { useState, useRef, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');`;

const PROMPTS = {
  typography: `You are a brutal typography forensics expert. Analyze the visual evidence provided (URL description and/or image analysis) for typography quality.
Evaluate: Is the font generic (Inter, Roboto, Arial, system fonts)? Is there a type scale? Pairing quality? Custom vs default?
Return ONLY valid JSON, no markdown:
{"score":0-100,"flags":["issue1","issue2"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"}
score 0=completely generic defaults, 100=distinctive custom typography system.`,

  color: `You are a color system auditor for brand identity. Analyze the visual evidence for color strategy.
Evaluate: Is it a default palette (shadcn grays, bootstrap blue, tailwind defaults)? Is there a custom brand color? Is the palette intentional or accidental?
Return ONLY valid JSON, no markdown:
{"score":0-100,"flags":["issue1","issue2"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"}
score 0=pure default palette, 100=distinctive intentional color system.`,

  consistency: `You are a visual system auditor. Analyze the brand for consistency and design system quality.
Evaluate: Are spacing, components, and visual language consistent? Is there a system or chaos? Does it look like one brand or many?
Return ONLY valid JSON, no markdown:
{"score":0-100,"flags":["issue1","issue2"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"}
score 0=no system, visual chaos, 100=tight cohesive design system.`,

  aiDetection: `You are an AI-generated design detector. Analyze the visual for signs of AI vibe coding / AI-generated aesthetics.
Look for: mesh gradients, glassmorphism, shadcn defaults, Lucide icons unmodified, generic hero sections, purple gradient backgrounds, beige "premium" defaults, Inter everywhere.
Return ONLY valid JSON, no markdown:
{"score":0-100,"flags":["signal1","signal2"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"}
score 0=completely AI-generated looking, 100=clearly human-designed with original decisions.`,

  differentiation: `You are a competitive brand differentiation analyst. Analyze how distinctive this brand looks vs industry defaults.
Evaluate: Could this be any competitor? Does it have a recognizable visual point of view? Would you remember it?
Return ONLY valid JSON, no markdown:
{"score":0-100,"flags":["issue1","issue2"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"}
score 0=completely interchangeable with competitors, 100=instantly recognizable and unmistakable.`,

  assets: `You are a visual asset quality auditor. Analyze the quality of photos, icons, illustrations and visual assets.
Evaluate: Are photos generic stock? Are icons unmodified defaults (Lucide, Heroicons)? Is there original illustration? Asset quality and consistency?
Return ONLY valid JSON, no markdown:
{"score":0-100,"flags":["issue1","issue2"],"verdict":"1 brutal sentence max 12 words","improvement":"1 concrete action max 12 words"}
score 0=pure stock + default icons, 100=original custom assets throughout.`,
};

const DIMENSIONS = [
  { key: "typography", label: "TYPOGRAPHY", sub: "GENERIC VS CUSTOM" },
  { key: "color", label: "COLOR SYSTEM", sub: "DEFAULTS VS INTENTIONAL" },
  { key: "consistency", label: "VISUAL SYSTEM", sub: "CHAOS VS COHESION" },
  { key: "aiDetection", label: "AI DETECTION", sub: "MACHINE VS HUMAN" },
  { key: "differentiation", label: "DIFFERENTIATION", sub: "INVISIBLE VS MEMORABLE" },
  { key: "assets", label: "ASSET QUALITY", sub: "STOCK VS ORIGINAL" },
];

async function callClaude(systemPrompt, userContent) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.find((b) => b.type === "text")?.text || "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { score: 50, flags: ["Parse error"], verdict: "Analysis incomplete.", improvement: "Try again." };
  }
}

function scoreColor(s) {
  if (s >= 70) return "#7CFC6E";
  if (s >= 45) return "#FFB830";
  return "#FF3B3B";
}

function ScoreBar({ score, animate }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (animate) setTimeout(() => setWidth(score), 100);
  }, [animate, score]);
  return (
    <div style={{ height: 3, background: "#1a1a1a", width: "100%", marginTop: 8 }}>
      <div style={{
        height: 3,
        width: `${width}%`,
        background: scoreColor(score),
        transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}

function CountUp({ target, duration = 1400 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{val}</>;
}

function DimCard({ dim, result, show }) {
  if (!show) return null;
  const s = result?.score ?? 0;
  return (
    <div style={{
      borderTop: "1px solid #1e1e1e",
      padding: "18px 0",
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(10px)",
      transition: "all 0.4s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "0.12em", color: "#e0e0e0" }}>
            {dim.label}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#555", letterSpacing: "0.15em", marginTop: 1 }}>
            {dim.sub}
          </div>
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "2rem",
          color: scoreColor(s),
          lineHeight: 1,
          minWidth: 48,
          textAlign: "right",
        }}>
          <CountUp target={s} duration={900} />
        </div>
      </div>
      <ScoreBar score={s} animate={show} />
      {result?.verdict && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#888", marginTop: 10, lineHeight: 1.6 }}>
          — {result.verdict}
        </div>
      )}
      {result?.flags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {result.flags.map((f, i) => (
            <span key={i} style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.55rem",
              color: "#555",
              border: "1px solid #222",
              padding: "2px 8px",
              letterSpacing: "0.08em",
            }}>{f}</span>
          ))}
        </div>
      )}
      {result?.improvement && (
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.6rem",
          color: scoreColor(s),
          marginTop: 10,
          borderLeft: `2px solid ${scoreColor(s)}`,
          paddingLeft: 10,
          lineHeight: 1.6,
          opacity: 0.85,
        }}>
          → {result.improvement}
        </div>
      )}
    </div>
  );
}

export default function BARE() {
  const [url, setUrl] = useState("");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | scanning | done
  const [results, setResults] = useState({});
  const [shownCards, setShownCards] = useState([]);
  const [bareScore, setBareScore] = useState(null);
  const [scanLine, setScanLine] = useState(0);
  const [currentDim, setCurrentDim] = useState("");
  const fileRef = useRef();

  const handleImage = (file) => {
    if (!file) return;
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const buildUserContent = (dimKey) => {
    const parts = [];
    if (url) parts.push({ type: "text", text: `Brand URL: ${url}` });
    if (imageBase64) {
      parts.push({ type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64 } });
      parts.push({ type: "text", text: "Analyze this brand visual for the dimension requested." });
    }
    if (!url && !imageBase64) {
      parts.push({ type: "text", text: "No brand data provided. Return scores of 0 with appropriate flags." });
    }
    return parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts;
  };

  useEffect(() => {
    if (phase !== "scanning") return;
    const interval = setInterval(() => setScanLine((p) => (p + 2) % 100), 30);
    return () => clearInterval(interval);
  }, [phase]);

  const runAnalysis = async () => {
    if (!url && !imageBase64) return;
    setPhase("scanning");
    setResults({});
    setShownCards([]);
    setBareScore(null);
    setScanLine(0);

    const res = {};
    for (const dim of DIMENSIONS) {
      setCurrentDim(dim.label);
      const result = await callClaude(PROMPTS[dim.key], buildUserContent(dim.key));
      res[dim.key] = result;
      setResults({ ...res });
      setShownCards((p) => [...p, dim.key]);
      await new Promise((r) => setTimeout(r, 200));
    }

    const avg = Math.round(
      Object.values(res).reduce((a, b) => a + (b?.score ?? 0), 0) / DIMENSIONS.length
    );
    setBareScore(avg);
    setPhase("done");
    setCurrentDim("");
  };

  const reset = () => {
    setPhase("idle");
    setUrl("");
    setImage(null);
    setImageBase64(null);
    setResults({});
    setShownCards([]);
    setBareScore(null);
    setCurrentDim("");
  };

  const canRun = (url.trim().length > 3 || !!imageBase64) && phase === "idle";

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .bare-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid #222;
          color: #e0e0e0;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          padding: 10px 0;
          width: 100%;
          outline: none;
          letter-spacing: 0.05em;
          transition: border-color 0.2s;
        }
        .bare-input:focus { border-bottom-color: #555; }
        .bare-input::placeholder { color: #333; }
        .bare-btn {
          background: #e0e0e0;
          color: #0a0a0a;
          border: none;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1rem;
          letter-spacing: 0.2em;
          padding: 14px 32px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          width: 100%;
          margin-top: 20px;
        }
        .bare-btn:hover { background: #fff; }
        .bare-btn:active { transform: scale(0.98); }
        .bare-btn:disabled { background: #1e1e1e; color: #333; cursor: not-allowed; }
        .upload-zone {
          border: 1px dashed #222;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s;
          margin-top: 12px;
          position: relative;
        }
        .upload-zone:hover { border-color: #444; }
        .scanline-container {
          position: relative;
          overflow: hidden;
          height: 120px;
          border: 1px solid #1a1a1a;
          margin: 24px 0;
        }
        .scanline {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #FF3B3B, transparent);
          transition: top 0.03s linear;
          box-shadow: 0 0 8px #FF3B3B44;
        }
        .noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          opacity: 0.4;
        }
      `}</style>

      <div className="noise" />

      <div style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e0e0e0",
        padding: "40px 32px",
        maxWidth: 620,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "3.5rem",
              letterSpacing: "0.15em",
              lineHeight: 1,
              color: "#e0e0e0",
            }}>BARE</div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.55rem",
              color: "#444",
              letterSpacing: "0.2em",
              marginTop: 4,
            }}>BRAND AESTHETIC REALITY ENGINE</div>
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.5rem",
            color: "#333",
            letterSpacing: "0.15em",
            textAlign: "right",
            marginTop: 6,
          }}>
            BY BANANALAB<br />
            <span style={{ color: "#222" }}>v1.0</span>
          </div>
        </div>

        {/* INPUT PHASE */}
        {phase === "idle" && (
          <div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.6rem",
              color: "#555",
              letterSpacing: "0.12em",
              marginBottom: 20,
              lineHeight: 1.7,
            }}>
              DROP A URL AND/OR A SCREENSHOT.<br />
              WE'LL TELL YOU EXACTLY HOW DESIGNED IT IS.
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.55rem",
                color: "#444",
                letterSpacing: "0.15em",
                marginBottom: 6,
              }}>BRAND URL</div>
              <input
                className="bare-input"
                placeholder="https://yourbrand.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.55rem",
                color: "#444",
                letterSpacing: "0.15em",
                marginBottom: 4,
              }}>VISUAL — SCREENSHOT / BRANDING</div>

              <div
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleImage(e.dataTransfer.files[0]);
                }}
              >
                {image ? (
                  <img src={image} alt="preview" style={{ maxHeight: 100, maxWidth: "100%", opacity: 0.7 }} />
                ) : (
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.6rem",
                    color: "#333",
                    letterSpacing: "0.1em",
                  }}>
                    DRAG & DROP OR CLICK TO UPLOAD
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleImage(e.target.files[0])}
                />
              </div>
            </div>

            <button className="bare-btn" disabled={!canRun} onClick={runAnalysis}>
              RUN DIAGNOSIS
            </button>
          </div>
        )}

        {/* SCANNING PHASE */}
        {phase === "scanning" && (
          <div>
            <div className="scanline-container">
              <div className="scanline" style={{ top: `${scanLine}%` }} />
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              }}>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "1.4rem",
                  letterSpacing: "0.25em",
                  color: "#FF3B3B",
                }}>SCANNING</div>
                {currentDim && (
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.6rem",
                    color: "#555",
                    letterSpacing: "0.15em",
                  }}>
                    ANALYZING — {currentDim}
                  </div>
                )}
              </div>
            </div>

            {/* partial results as they come */}
            {DIMENSIONS.map((dim) => (
              <DimCard
                key={dim.key}
                dim={dim}
                result={results[dim.key]}
                show={shownCards.includes(dim.key)}
              />
            ))}
          </div>
        )}

        {/* RESULTS PHASE */}
        {phase === "done" && (
          <div>
            {/* BIG SCORE */}
            <div style={{
              borderTop: "1px solid #1e1e1e",
              borderBottom: "1px solid #1e1e1e",
              padding: "28px 0",
              marginBottom: 32,
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "5rem",
                lineHeight: 1,
                color: scoreColor(bareScore),
              }}>
                <CountUp target={bareScore} duration={1600} />
              </div>
              <div style={{ paddingBottom: 8 }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.55rem",
                  color: "#444",
                  letterSpacing: "0.2em",
                  marginBottom: 4,
                }}>BARE SCORE / 100</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.65rem",
                  color: "#888",
                  lineHeight: 1.5,
                }}>
                  {bareScore >= 70
                    ? "GENUINE DESIGN INTENT DETECTED."
                    : bareScore >= 45
                    ? "SOME DESIGN DECISIONS. MANY DEFAULTS."
                    : "CRITICALLY UNDERDESIGNED."}
                </div>
              </div>
            </div>

            {DIMENSIONS.map((dim) => (
              <DimCard
                key={dim.key}
                dim={dim}
                result={results[dim.key]}
                show={true}
              />
            ))}

            {/* ROADMAP */}
            <div style={{ marginTop: 32 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.55rem",
                color: "#444",
                letterSpacing: "0.2em",
                marginBottom: 16,
              }}>IMPROVEMENT ROADMAP</div>
              {DIMENSIONS.map((dim, i) => {
                const r = results[dim.key];
                if (!r?.improvement) return null;
                return (
                  <div key={dim.key} style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}>
                    <div style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "0.75rem",
                      color: scoreColor(r.score),
                      letterSpacing: "0.1em",
                      minWidth: 20,
                      marginTop: 1,
                    }}>0{i + 1}</div>
                    <div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.55rem",
                        color: "#555",
                        letterSpacing: "0.12em",
                        marginBottom: 2,
                      }}>{dim.label}</div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.65rem",
                        color: "#aaa",
                        lineHeight: 1.5,
                      }}>{r.improvement}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="bare-btn" onClick={reset} style={{ marginTop: 32 }}>
              ← NEW DIAGNOSIS
            </button>
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          marginTop: 60,
          borderTop: "1px solid #111",
          paddingTop: 16,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.45rem", color: "#222", letterSpacing: "0.2em" }}>
            BARE · BRAND AESTHETIC REALITY ENGINE
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.45rem", color: "#222", letterSpacing: "0.2em" }}>
            BY BANANALAB
          </span>
        </div>
      </div>
    </>
  );
}
