function inferEicraMode(bits) {
  const has00 = bits.includes("ISC00");
  const has01 = bits.includes("ISC01");
  if (has00 && has01) {
    return "INT0 is configured for a rising edge trigger.";
  }
  if (!has00 && has01) {
    return "INT0 is configured for a falling edge trigger.";
  }
  if (has00 && !has01) {
    return "INT0 is configured for any logical change.";
  }
  return "INT0 defaults to LOW-level triggering unless other bits are changed elsewhere.";
}

export function decodeRegisterSnippet(text, registerDb) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const match = line.match(/^([A-Z0-9]+)\s*([|&+\-^]?=|=)\s*(.+?);?$/);
    if (!match) {
      return {
        line,
        registerName: "Unrecognized",
        summary: "This line does not match the simple register decoder patterns used by the demo.",
        bits: [],
        extra: "",
      };
    }

    const [, registerName, operation, expression] = match;
    const register = registerDb[registerName];
    const bits = [...expression.matchAll(/\(\s*1\s*<<\s*([A-Z0-9_]+)\s*\)/g)].map((item) => item[1]);

    if (!register) {
      return {
        line,
        registerName,
        summary: `No decoder entry exists yet for ${registerName}.`,
        bits: [],
        extra: "",
      };
    }

    const bitDetails = bits.map((bit) => ({
      bit,
      ...(register.bits?.[bit] || {
        meaning: "Bit meaning not yet documented in this educational dataset.",
        relatedPins: register.relatedPins || [],
        affects: register.summary,
      }),
    }));

    let extra = "";
    if (registerName === "EICRA") {
      extra = inferEicraMode(bits);
    } else if (registerName === "TCCR1B" && bits.some((bit) => ["CS10", "CS11", "CS12"].includes(bit))) {
      extra = "Clock-select bits in TCCR1B choose the Timer1 prescaler, which changes how quickly TCNT1 reaches compare values like OCR1A.";
    } else if (registerName === "TIMSK1" && bits.includes("OCIE1A")) {
      extra = "Enabling OCIE1A means Timer1 compare-match A can trigger an ISR when TCNT1 equals OCR1A.";
    } else if (registerName === "PCICR" && bits.includes("PCIE2")) {
      extra = "PCIE2 turns on the PORTD pin-change interrupt group, which includes D0 through D7.";
    }

    return {
      line,
      registerName,
      operation,
      summary: register.summary,
      beginnerExplanation: register.beginnerExplanation,
      bits: bitDetails,
      relatedPins: register.relatedPins || [],
      extra,
    };
  });
}

export default function RegisterDecoder({ input, onChangeInput, decodedResults }) {
  return (
    <>
      <section className="detail-card">
        <h2>Register Decoder</h2>
        <p>
          Paste beginner-facing AVR setup lines here. The decoder explains which register is touched,
          which bits are involved, and which Arduino UNO pins or timers are likely affected.
        </p>
        <textarea
          className="register-input"
          spellCheck="false"
          value={input}
          onChange={(event) => onChangeInput(event.target.value)}
        />
      </section>

      <section className="detail-card">
        <h3>Decoded Output</h3>
        <div className="decoder-results">
          {decodedResults.map((result) => (
            <article className="decoder-card" key={result.line}>
              <div className="decoder-line"><code>{result.line}</code></div>
              <div className="detail-line"><strong>Register:</strong> {result.registerName}</div>
              <div className="detail-line"><strong>Summary:</strong> {result.summary}</div>
              {result.beginnerExplanation ? (
                <div className="detail-line"><strong>Beginner view:</strong> {result.beginnerExplanation}</div>
              ) : null}
              {result.relatedPins?.length ? (
                <div className="detail-line"><strong>Affected hardware:</strong> {result.relatedPins.join(", ")}</div>
              ) : null}
              {result.bits.length ? (
                <div className="bit-list">
                  {result.bits.map((bit) => (
                    <div className="bit-card" key={`${result.line}-${bit.bit}`}>
                      <strong>{bit.bit}</strong>
                      <span>{bit.meaning}</span>
                      <span className="muted">{bit.affects}</span>
                      {bit.relatedPins?.length ? <span className="muted">Pins: {bit.relatedPins.join(", ")}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No bit-level rule matched in the current dataset.</p>
              )}
              {result.extra ? <p className="decoder-extra">{result.extra}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
