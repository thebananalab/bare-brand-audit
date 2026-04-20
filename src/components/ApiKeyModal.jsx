import { useState } from 'react'

export default function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState("");
  const valid = key.length > 10;
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="eyebrow">/ GEMINI API KEY</div>
        <div className="modal-title">
          Power the engine.<br/>
          <span style={{ opacity: 0.45, fontSize: "0.55em", letterSpacing: 0, fontWeight: 500 }}>
            Free key → ai.google.dev
          </span>
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <div className="field-label">/ Gemini API Key</div>
          <input
            className="bare-input"
            type="password"
            placeholder="AIza..."
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && valid && onSave(key)}
            autoFocus
          />
        </div>
        <button className="run-btn" style={{ marginTop: 0 }} disabled={!valid} onClick={() => onSave(key)}>
          Save &amp; Run Diagnosis
          <span className="arrow">→</span>
        </button>
        <div className="modal-note">
          Stored in your browser only. Never sent to our servers.
        </div>
      </div>
    </div>
  );
}
