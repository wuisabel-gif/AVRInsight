function IssueCard({ issue }) {
  return (
    <article className={`debug-card severity-${issue.severity}`}>
      <div className="debug-card-header">
        <span className={`severity-pill severity-${issue.severity}`}>{issue.severity.toUpperCase()}</span>
        <strong>{issue.issue}</strong>
      </div>
      <p><strong>Evidence:</strong> {issue.evidence}</p>
      {issue.fix ? <p><strong>Suggested fix:</strong> {issue.fix}</p> : null}
    </article>
  );
}

function CapabilityCheck({ check }) {
  return (
    <div className={`check-row ${check.ok ? "ok" : "warn"}`}>
      <span className="check-badge">{check.ok ? "OK" : "CHECK"}</span>
      <div>
        <strong>{check.target}</strong>
        <p>{check.reason}</p>
      </div>
    </div>
  );
}

export default function DebuggerPanel({
  query,
  code,
  useLlm,
  result,
  loading,
  error,
  onChangeQuery,
  onChangeCode,
  onChangeUseLlm,
  onRun,
}) {
  const llm = result?.llmReasoning;

  return (
    <>
      <section className="detail-card">
        <h2>Ask The Debugger</h2>
        <p>
          Ask a natural-language question, paste AVR or Arduino setup code, and let the backend
          walk through pins, interrupt modes, vectors, and likely problems.
        </p>

        <label className="search-label" htmlFor="debugger-query">Question</label>
        <input
          id="debugger-query"
          className="search-input"
          type="text"
          placeholder="Why is my INT0 interrupt not firing on D2?"
          value={query}
          onChange={(event) => onChangeQuery(event.target.value)}
        />

        <label className="search-label debugger-label" htmlFor="debugger-code">Code snippet</label>
        <textarea
          id="debugger-code"
          className="register-input debugger-textarea"
          spellCheck="false"
          value={code}
          onChange={(event) => onChangeCode(event.target.value)}
        />

        <div className="debugger-toolbar">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={useLlm}
              onChange={(event) => onChangeUseLlm(event.target.checked)}
            />
            <span>Use OpenAI reasoning layer</span>
          </label>
          <button type="button" className="primary-button" disabled={loading} onClick={onRun}>
            {loading ? "Analyzing..." : "Analyze Issue"}
          </button>
        </div>

        {error ? <div className="debugger-error">{error}</div> : null}
      </section>

      <section className="detail-grid debugger-grid">
        <section className="detail-card">
          <h3>Summary</h3>
          {result ? (
            <div className="summary-stack">
              <p>{result.finalExplanation || "No explanation returned."}</p>
              <div className="summary-meta">
                <div><strong>Detected mode:</strong> {result.detectedMode?.type || "unknown"}</div>
                <div><strong>Confidence:</strong> {Math.round((result.detectedMode?.confidence || 0) * 100)}%</div>
              </div>
            </div>
          ) : (
            <p className="muted">No analysis yet. Submit a question and snippet to see the reasoning flow.</p>
          )}
        </section>

        <section className="detail-card">
          <h3>Likely Issues</h3>
          {result?.likelyIssues?.length ? (
            <div className="debug-stack">
              {result.likelyIssues.map((issue, index) => <IssueCard issue={issue} key={`${issue.issue}-${index}`} />)}
            </div>
          ) : (
            <p className="muted">Issue candidates will show up here after analysis.</p>
          )}
        </section>
      </section>

      <section className="detail-grid debugger-grid">
        <section className="detail-card">
          <h3>Resolved Pins</h3>
          {result?.resolvedPins?.length ? (
            <div className="chip-wrap">
              {result.resolvedPins.map((pin) => (
                <span className="chip" key={`${pin.query}-${pin.pinId}`}>{pin.query} -&gt; {pin.pinId}</span>
              ))}
            </div>
          ) : (
            <p className="muted">Pin alias resolution will appear here.</p>
          )}
        </section>

        <section className="detail-card">
          <h3>Capability Checks</h3>
          {result?.capabilityChecks?.length ? (
            <div className="debug-stack">
              {result.capabilityChecks.map((check, index) => <CapabilityCheck check={check} key={`${check.target}-${index}`} />)}
            </div>
          ) : (
            <p className="muted">Hardware capability validation will appear here.</p>
          )}
        </section>
      </section>

      <section className="detail-card">
        <h3>OpenAI Reasoning Layer</h3>
        {result ? (
          <>
            <div className="llm-meta">
              <span className="chip">Status: {llm?.status || "disabled"}</span>
              {llm?.model ? <span className="chip">Model: {llm.model}</span> : null}
            </div>
            {llm?.explanation ? (
              <div className="llm-output"><pre><code>{llm.explanation}</code></pre></div>
            ) : (
              <p className="muted">{llm?.error || "No LLM explanation returned for this run."}</p>
            )}
          </>
        ) : (
          <p className="muted">When enabled, the backend can layer an OpenAI explanation on top of the deterministic AVR checks.</p>
        )}
      </section>
    </>
  );
}
