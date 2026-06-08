function renderChips(items, emptyLabel = "None") {
  if (!items?.length) {
    return <span className="muted">{emptyLabel}</span>;
  }

  return items.map((item) => (
    <span className="chip" key={item}>
      {item}
    </span>
  ));
}

function InterruptBlock({ title, info }) {
  if (!info) {
    return null;
  }

  return (
    <section className="panel-card pin-panel-card interrupt-card">
      <h4>{title}</h4>
      <div className="detail-line"><strong>Name:</strong> {info.name}</div>
      {info.group ? <div className="detail-line"><strong>Group:</strong> {info.group}</div> : null}
      {info.controlRegister ? <div className="detail-line"><strong>Control register:</strong> {info.controlRegister}</div> : null}
      {info.maskRegister ? <div className="detail-line"><strong>Mask register:</strong> {info.maskRegister}</div> : null}
      {info.enableRegister ? <div className="detail-line"><strong>Enable register:</strong> {info.enableRegister}</div> : null}
      {info.flagRegister ? <div className="detail-line"><strong>Flag register:</strong> {info.flagRegister}</div> : null}
      {info.modeBits ? <div className="detail-line"><strong>Mode bits:</strong> {info.modeBits.join(", ")}</div> : null}
      {info.enableBit ? <div className="detail-line"><strong>Enable bit:</strong> {info.enableBit}</div> : null}
      {info.modes ? <div className="detail-line"><strong>Modes:</strong> {info.modes.join(", ")}</div> : null}
      {info.vector ? <div className="detail-line"><strong>ISR vector:</strong> {info.vector}</div> : null}
    </section>
  );
}

export default function PinInfoPanel({ pin }) {
  const timerText = (pin.timers || [])
    .map((timer) => `${timer.name}${timer.channel ? ` (${timer.channel})` : ""}`)
    .join(", ");

  return (
    <div className="pin-panel-grid">
      <section className="panel-card pin-panel-card pin-summary">
        <div className="panel-badge">{pin.category.toUpperCase()}</div>
        <h2>{pin.displayName}</h2>
        <div className="detail-line"><strong>Arduino:</strong> {pin.arduinoPin || pin.id}</div>
        <div className="detail-line"><strong>Header:</strong> {pin.header} pin {pin.headerPinNumber}</div>
        <div className="detail-line"><strong>AVR:</strong> {pin.avrPin || "Board-level only"}</div>
        <div className="detail-line"><strong>Port bit:</strong> {pin.avrPort ? `${pin.avrPort}.${pin.bit}` : "N/A"}</div>
        <div className="detail-line"><strong>Header position:</strong> {pin.headerPositionLabel}</div>
      </section>

      <section className="panel-card pin-panel-card">
        <h3>Alternate Names</h3>
        <div className="chip-wrap">{renderChips(pin.aliases)}</div>
      </section>

      <section className="panel-card pin-panel-card">
        <h3>Functions</h3>
        <div className="chip-wrap">{renderChips(pin.functions)}</div>
        <div className="detail-line"><strong>Communication role:</strong> {renderChips(pin.communication)}</div>
        <div className="detail-line"><strong>Timer / PWM:</strong> {timerText || "No timer output role called out here."}</div>
        <div className="detail-line"><strong>PWM capable:</strong> {pin.pwm ? "Yes" : "No"}</div>
        <div className="detail-line">
          <strong>Related registers:</strong>{" "}
          <span className="chip-wrap inline-wrap">{renderChips(pin.relatedRegisters)}</span>
        </div>
      </section>

      <InterruptBlock title="External Interrupt" info={pin.externalInterrupt} />
      <InterruptBlock title="Pin Change Interrupt" info={pin.pinChangeInterrupt} />

      <section className="panel-card pin-panel-card pin-panel-wide">
        <h3>Why This Pin Has Many Names</h3>
        <p>{pin.description}</p>
        <p>{pin.beginnerExplanation}</p>
      </section>

      <section className="panel-card pin-panel-card pin-panel-wide">
        <h3>Example Code</h3>
        <pre><code>{pin.exampleCode?.trim()}</code></pre>
      </section>
    </div>
  );
}
