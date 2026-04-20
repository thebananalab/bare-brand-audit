import { useState, useRef, useEffect, useMemo } from 'react'
import { DIMENSIONS } from './constants'
import { getCacheKey, loadFromCache, saveToCache, diagText } from './utils'
import { runDim } from './api'
import { saveReport } from './firebase'
import CountUp from './components/CountUp'
import DimRow from './components/DimRow'
import EmailModal from './components/EmailModal'

export default function App() {
  const [url, setUrl] = useState("");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [phase, setPhase] = useState("idle");
  const [results, setResults] = useState({});
  const [currentDim, setCurrentDim] = useState("");
  const [openDim, setOpenDim] = useState("typography");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const fileRef = useRef();

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#ff8c42",
    "inverted": false,
    "fontScale": 1.01
  }/*EDITMODE-END*/;
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === "__activate_edit_mode") setEditMode(true);
      if (e.data.type === "__deactivate_edit_mode") setEditMode(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", tweaks.accent);
    root.style.setProperty("--red", tweaks.accent);
    root.style.setProperty("--green", tweaks.accent);
    root.style.setProperty("--amber", tweaks.accent);
    if (tweaks.inverted) {
      root.style.setProperty("--paper", "#000000");
      root.style.setProperty("--paper-2", "#0a0a0a");
      root.style.setProperty("--ink", "#ffffff");
      root.style.setProperty("--ink-2", "#e5e5e5");
      root.style.setProperty("--muted", "#888");
      root.style.setProperty("--rule", "#ffffff");
    } else {
      root.style.setProperty("--paper", "#ffffff");
      root.style.setProperty("--paper-2", "#f4f4f4");
      root.style.setProperty("--ink", "#000000");
      root.style.setProperty("--ink-2", "#1a1a1a");
      root.style.setProperty("--muted", "#6b6b6b");
      root.style.setProperty("--rule", "#000000");
    }
    document.body.style.fontSize = (16 * tweaks.fontScale) + "px";
  }, [tweaks]);

  const updateTweak = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };

  const handleImage = (file) => {
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const canRun = (url.trim().length > 3 || !!imageBase64) && phase === "idle";

  const bareScore = useMemo(() => {
    const vals = Object.values(results).map(r => r?.score).filter(v => typeof v === "number");
    if (vals.length !== DIMENSIONS.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [results]);

  const runAnalysis = async () => {
    const activeKey = null;
    if (!url.trim() && !imageBase64) return;

    const cacheKey = getCacheKey(url, imageBase64);
    const cached = loadFromCache(cacheKey);
    if (cached) {
      setResults(cached);
      setPhase("done");
      setTimeout(() => setShowEmailModal(true), 600);
      return;
    }

    setPhase("scanning");
    setResults({});
    setCurrentDim(DIMENSIONS[0].label);
    setOpenDim(DIMENSIONS[0].key);

    const next = {};
    for (const dim of DIMENSIONS) {
      setCurrentDim(dim.label);
      setOpenDim(dim.key);
      const r = await runDim(dim.key, url, imageBase64, imageMime, activeKey);
      next[dim.key] = r;
      setResults({ ...next });
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    setCurrentDim("");
    setPhase("done");
    saveToCache(cacheKey, next);
    const avg = Math.round(Object.values(next).map(r => r?.score).filter(v => typeof v === "number").reduce((a, b) => a + b, 0) / DIMENSIONS.length);
    saveReport({ score: avg, url: url || "image", results: next, specimenId, dateStr });
    setTimeout(() => setShowEmailModal(true), 800);
  };

  const reset = () => {
    setPhase("idle");
    setUrl("");
    setImage(null);
    setImageBase64(null);
    setImageMime("image/jpeg");
    setResults({});
    setCurrentDim("");
    setOpenDim("typography");
    setShowEmailModal(false);
    window.scrollTo({ top: 0 });
  };

  const completedCount = Object.keys(results).length;
  const progressPct = Math.round((completedCount / DIMENSIONS.length) * 100);
  const specimenId = useMemo(() => "SPC-" + Math.floor(Math.random() * 90000 + 10000), []);
  const dateStr = useMemo(() => {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
  }, []);

  const diag = bareScore != null ? diagText(bareScore) : null;
  const bigColor = bareScore == null ? "var(--ink)" :
    bareScore >= 70 ? "var(--green)" :
    bareScore >= 45 ? "var(--amber)" : "var(--red)";

  return (
    <div className="app">
      {showEmailModal && bareScore != null && (
        <EmailModal
          score={bareScore}
          url={url}
          results={results}
          specimenId={specimenId}
          dateStr={dateStr}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      <div className="rail">
        <div>/ BARE</div>
        <div className="pill"><span className="dot"/>DIAGNOSTIC · LIVE</div>
        <span>{dateStr}</span>
      </div>

      {phase !== "done" && (
        <div className="hero">
          <div className="hero-left">
            <div className="hero-nav">
              <div>
                <a href="#">HOME</a>
                <a href="#">METHOD</a>
                <a href="#">CASES</a>
              </div>
              <div className="right">
                <a href="#">PRICING</a>
                <a href="#">ABOUT</a>
                <a href="#">CONTACT</a>
              </div>
            </div>

            <div>
              <div className="hero-wordmark">
                BARE<sup>©</sup>
              </div>
              <div className="hero-tagline">
                <span className="tag-eyebrow">/ DISCLAIMER</span>
                <p>
                  An <span className="u">AI tool</span> built to catch brands that look <span className="u">AI-made</span>.
                </p>
                <p className="small">
                  Yes, we see the irony. That's the point, the thing best at sniffing out default gradients, unmodified Lucide icons and Inter-everything is the same thing that made them. Fight fire with fire.
                </p>
              </div>
            </div>

            <div className="hero-footnote">
              <div>AUDIT YOUR BRAND</div>
              <div>WITHOUT THE FLATTERY</div>
            </div>
          </div>

          <div className="hero-right">
            <div className="eyebrow">/ INTAKE</div>
            <h2>
              Show us<br/>
              your <span className="u">brand</span>.<br/>
              We'll show<br/>
              you the <span className="dot">truth</span>.
            </h2>

            <div className="consent">
              The <span className="u">Brand Aesthetic Reality Engine</span> runs six independent assays on your site or screenshot (<em style={{ color: "var(--red)" }}>typography, color, system, AI-detection, differentiation, and assets</em>), returning a single blunt score out of 100.
            </div>

            <div className="intake-subgrid">
              <div className="field">
                <div className="field-label">/ Brand URL</div>
                <input
                  className="bare-input"
                  placeholder="yourbrand.com"
                  value={url}
                  disabled={phase !== "idle"}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && canRun && runAnalysis()}
                />
              </div>
              <div className="field">
                <div className="field-label">/ Screenshot (Optional)</div>
                <div
                  className="upload"
                  onClick={() => phase === "idle" && fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (phase === "idle") handleImage(e.dataTransfer.files[0]); }}
                >
                  {image ? (
                    <>
                      <img src={image} alt="specimen" />
                      <div className="chip">RECEIVED</div>
                    </>
                  ) : (
                    <div className="hint">
                      <span className="plus">+</span>
                      Drop or click
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
            </div>

            <button className="run-btn" disabled={!canRun} onClick={() => runAnalysis()} style={{ marginTop: 32 }}>
              {phase === "scanning" ? "Analyzing…" : "Begin Diagnosis"}
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {phase === "scanning" && (
        <div className="status-strip">
          <div className="pulse"><span/>ANALYZING, {currentDim || "BOOTING"}</div>
          <div className="progress"><div className="fill" style={{ width: progressPct + "%" }} /></div>
          <div>{completedCount}/{DIMENSIONS.length} ASSAYS</div>
        </div>
      )}

      {phase === "done" && bareScore != null && (
        <div className="verdict-block">
          <div className="big" style={{ color: bigColor }}>
            <CountUp target={bareScore} duration={1600} /><sup>/100</sup>
          </div>
          <div>
            <div className="eyebrow">/ DIAGNOSIS</div>
            <div className="diag">
              {diag[0]} <span className="u">{diag[1]}</span> <em>{diag[2]}</em>
            </div>
            <div className="diag-meta">
              <span>File <b>#{specimenId}</b></span>
              <span>{dateStr}</span>
              <span>Subject <b>{url ? url.replace(/^https?:\/\//, "").slice(0, 28) : "image specimen"}</b></span>
              <span>Assays <b>{DIMENSIONS.length}/{DIMENSIONS.length}</b></span>
            </div>
          </div>
        </div>
      )}

      {phase === "idle" && (
        <div className="manifesto">
          <div className="eyebrow">/ MANIFESTO</div>
          <div className="body">
            The internet is saturated with <span className="u">brands that feel like templates</span>. BARE is the antithesis, a <em>forensic audit</em> for founders and designers who want to know exactly where their identity is <span className="u">borrowed, generic, or dead</span>. No flattery. No algorithms. <em>Just intent.</em>
          </div>
          <div className="stat-row">
            <div className="stat"><div className="n">6</div><div className="l">/ ASSAYS</div></div>
            <div className="stat"><div className="n">100</div><div className="l">/ MAX SCORE</div></div>
            <div className="stat"><div className="n">12s</div><div className="l">/ AVG RUNTIME</div></div>
          </div>
        </div>
      )}

      {phase !== "idle" && (
        <div className="works">
          <div className="works-head">
            <div>
              <div className="eyebrow">/ ASSAYS</div>
              <h2 className="h2" style={{ color: "var(--paper)" }}>How It Works.</h2>
            </div>
            <div className="tags">
              <a href="#" className="active">→ All</a>
              <a href="#">Type</a>
              <a href="#">Color</a>
              <a href="#">System</a>
              <a href="#">Signal</a>
              <a href="#">Assets</a>
            </div>
          </div>

          {DIMENSIONS.map((d, i) => (
            <DimRow
              key={d.key}
              idx={i}
              dim={d}
              result={results[d.key]}
              active={phase === "scanning" && currentDim === d.label}
              isOpen={openDim === d.key}
              onToggle={() => setOpenDim(openDim === d.key ? null : d.key)}
            />
          ))}
        </div>
      )}

      {phase === "idle" && (
        <div className="checklist-sec">
          <div>
            <div className="eyebrow">/ WHAT WE FLAG</div>
            <h2 className="h2">Red flags<br/>we <span style={{ textDecoration: "underline", textUnderlineOffset: "6px", textDecorationThickness: "2px" }}>won't</span> miss.</h2>
          </div>
          <ul className="check-list">
            <li><span className="x">×</span>Inter everywhere.</li>
            <li><span className="x">×</span>Unmodified Lucide icons.</li>
            <li><span className="x">×</span>Shadcn card farms.</li>
            <li><span className="x">×</span>Purple mesh gradient heroes.</li>
            <li><span className="x">×</span>Beige "premium" defaults.</li>
            <li><span className="x">×</span>Generic stock photography.</li>
            <li><span className="x">×</span>Glassmorphism without reason.</li>
            <li><span className="x">×</span>Tailwind gray scale as palette.</li>
          </ul>
        </div>
      )}

      <div className="cta">
        {phase === "done" ? (
          <>
            <h2>
              Now <span className="u">fix it</span>.<br/>
              Or <span className="u">ship it</span>.<br/>
              <em style={{ color: "var(--red)", fontStyle: "normal" }}>Your call.</em>
            </h2>
            <div className="sub">You've got the receipts. Take one item from the ledger above and ship a change this week.</div>
            <button className="round-arrow" onClick={reset}>↺</button>
          </>
        ) : (
          <>
            <h2>
              Cut Through<br/>
              <span className="u">The Noise</span>.<br/>
              See Your Brand <em style={{ color: "var(--red)", fontStyle: "normal" }}>Clearly</em>.
            </h2>
            <div className="sub">Six assays. One blunt score. No flattery. Designed for founders and designers who can handle the truth.</div>
            <button className="round-arrow" onClick={() => document.querySelector(".bare-input")?.focus()}>↗</button>
          </>
        )}
      </div>

      <div className="footer">
        <div>BARE · BRAND AESTHETIC REALITY ENGINE</div>
        <div>(BY BANANALAB, WITH LOVE &amp; CONTEMPT)</div>
        <div>V3.0 · {dateStr}</div>
      </div>

      {editMode && (
        <div className="tweaks-panel">
          <div className="tw-head">
            <span><span className="dot"/>TWEAKS</span>
            <span>3-COLOR</span>
          </div>
          <div className="tw-body">
            <div className="tw-group">
              <div className="tw-label">/ Accent</div>
              <div className="tw-swatches">
                {[
                  { v: "#ff6a1a", name: "Orange" },
                  { v: "#ff4800", name: "Red-Orange" },
                  { v: "#ffa500", name: "Amber" },
                  { v: "#ff8c42", name: "Soft" },
                ].map(s => (
                  <div
                    key={s.v}
                    className={"tw-sw" + (tweaks.accent === s.v ? " active" : "")}
                    style={{ background: s.v }}
                    title={s.name}
                    onClick={() => updateTweak({ accent: s.v })}
                  />
                ))}
              </div>
            </div>
            <div className="tw-group">
              <div className="tw-label">/ Mode</div>
              <button
                className={"tw-invert-btn" + (tweaks.inverted ? " on" : "")}
                onClick={() => updateTweak({ inverted: !tweaks.inverted })}
              >
                {tweaks.inverted ? "Inverted (black bg)" : "Standard (white bg)"}
              </button>
            </div>
            <div className="tw-group">
              <div className="tw-row">
                <div className="tw-label">/ Type Scale</div>
                <div className="tw-val">{tweaks.fontScale.toFixed(2)}×</div>
              </div>
              <input
                type="range"
                className="tw-slider"
                min="0.85"
                max="1.2"
                step="0.01"
                value={tweaks.fontScale}
                onChange={e => updateTweak({ fontScale: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
