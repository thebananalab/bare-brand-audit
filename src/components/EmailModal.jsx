import { useState } from 'react'
import { saveReport } from '../firebase'
import { DIMENSIONS } from '../constants'

export default function EmailModal({ score, url, results, specimenId, dateStr, onClose }) {
  const [email, setEmail] = useState(() => localStorage.getItem("bare_email") || "");
  const [status, setStatus] = useState("idle");

  const handleSend = async () => {
    if (!email.includes("@")) return;
    localStorage.setItem("bare_email", email);
    setStatus("sending");

    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, score, url, results, specimenId, dateStr, dimensions: DIMENSIONS }),
      });
      if (!res.ok) throw new Error("send failed");
    } catch (e) {
      console.warn("Resend error:", e.message);
    }

    await saveReport({ email, score, url: url || "image", results, specimenId, dateStr });
    setStatus("done");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {status === "done" ? (
          <>
            <div className="eyebrow">/ REPORT SENT</div>
            <div className="modal-title">
              Check your inbox.<br/>
              <em style={{ color: "var(--accent)", fontStyle: "normal" }}>No flattery included.</em>
            </div>
            <button className="run-btn" onClick={onClose} style={{ marginTop: 0 }}>
              Done <span className="arrow">✓</span>
            </button>
          </>
        ) : (
          <>
            <div className="eyebrow">/ REPORT DELIVERY</div>
            <div className="modal-title">
              Score: <em style={{ color: "var(--accent)", fontStyle: "normal" }}>{score}</em>/100.<br/>
              Get the full receipts.
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
              <div className="field-label">/ Your Email</div>
              <input
                className="bare-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                autoFocus
              />
            </div>
            <button
              className="run-btn"
              style={{ marginTop: 0 }}
              disabled={status === "sending" || !email.includes("@")}
              onClick={handleSend}
            >
              {status === "sending" ? "Opening email…" : "Send Report"}
              <span className="arrow">→</span>
            </button>
            <button className="modal-skip" onClick={onClose}>SKIP →</button>
          </>
        )}
      </div>
    </div>
  );
}
