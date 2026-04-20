export default function DimRow({ idx, dim, result, active, isOpen, onToggle }) {
  const done = result && typeof result.score === "number";
  return (
    <>
      <div
        className={"dim-row" + (isOpen ? " open" : "") + (active ? " scanning" : "")}
        onClick={onToggle}
      >
        <div className="num">{String(idx + 1).padStart(2, "0")}.</div>
        <div className="t">
          {dim.label}
          <span className="sub">{dim.sub}</span>
        </div>
        {done ? (
          <div className="score-inline" style={{ color: "var(--accent)" }}>
            {result.score}
          </div>
        ) : (
          <div className="ic">{active ? "◐" : "+"}</div>
        )}
      </div>
      {isOpen && done && (
        <div className="dim-body">
          <div className="q">"{result.verdict.replace(/^["']|["']$/g, "")}"</div>
          <div className="bar"><div className="fill" style={{ width: result.score + "%" }} /></div>
          {result.flags && result.flags.length > 0 && (
            <div className="flags">
              {result.flags.map((f, i) => <span className="flag" key={i}>{f}</span>)}
            </div>
          )}
          {result.improvement && (
            <div className="rx">
              <span className="arr">RX →</span>
              <span>{result.improvement}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
