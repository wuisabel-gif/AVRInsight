import { motion } from "framer-motion";

const layout = {
  digitalUpper: {
    ids: ["D13", "D12", "D11", "D10", "D9", "D8"],
    x: 754,
    y: 98,
    gap: 51,
  },
  digitalLower: {
    ids: ["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"],
    x: 605,
    y: 152,
    gap: 51,
  },
  utility: {
    ids: ["GND", "AREF", "A4", "A5"],
    x: 361,
    y: 152,
    gap: 51,
  },
  breakout: {
    ids: ["NC", "IOREF", "RESET"],
    x: 654,
    y: 638,
    gap: 28,
  },
  power: {
    ids: ["3V3", "5V", "GND", "GND", "VIN"],
    x: 836,
    y: 611,
    gap: 30,
  },
  analog: {
    ids: ["A0", "A1", "A2", "A3", "A4", "A5"],
    x: 1050,
    y: 611,
    gap: 28,
  },
};

function buildPadLookup() {
  const padLookup = new Map();

  Object.entries(layout).forEach(([rowKey, row]) => {
    if (rowKey === "breakout" || rowKey === "power" || rowKey === "analog") {
      return;
    }

    row.ids.forEach((id, index) => {
      const position = {
        x: row.x + index * row.gap,
        y: row.y,
        rowKey,
        index,
      };

      const list = padLookup.get(id) || [];
      list.push(position);
      padLookup.set(id, list);
    });
  });

  layout.breakout.ids.forEach((id, index) => {
    const x = layout.breakout.x + index * layout.breakout.gap;
    const positions = [609, 638].map((y, rowIndex) => ({
      x,
      y,
      rowKey: "breakout",
      index,
      rowIndex,
    }));

    const list = padLookup.get(id) || [];
    padLookup.set(id, list.concat(positions));
  });

  layout.power.ids.forEach((id, index) => {
    const x = layout.power.x + index * layout.power.gap;
    const positions = [582, 611].map((y, rowIndex) => ({
      x,
      y,
      rowKey: "power",
      index,
      rowIndex,
    }));

    const list = padLookup.get(id) || [];
    padLookup.set(id, list.concat(positions));
  });

  layout.analog.ids.forEach((id, index) => {
    const x = layout.analog.x + index * layout.analog.gap;
    const list = padLookup.get(id) || [];
    const positions = [582, 611].map((y, rowIndex) => ({
      x,
      y,
      rowKey: "analog",
      index,
      rowIndex,
    }));
    padLookup.set(id, list.concat(positions));
  });

  return padLookup;
}

const padLookup = buildPadLookup();

function decorativePads(x, y, count, gap) {
  return Array.from({ length: count }, (_, index) => {
    const px = x + index * gap;
    return (
      <g className="decorative-pad" key={`${x}-${y}-${index}`}>
        <circle className="decorative-pad-shell" cx={px} cy={y} r="9" />
        <circle className="decorative-pad-hole" cx={px} cy={y} r="4.5" />
      </g>
    );
  });
}

function decorativePadGrid(x, y, rows, columns, columnGap, rowGap) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    decorativePads(x, y + rowIndex * rowGap, columns, columnGap).map((pad, index) => (
      <g key={`grid-${x}-${y}-${rowIndex}-${index}`}>{pad}</g>
    )),
  ).flat();
}

function headerLabel(id, x, y, className = "") {
  return (
    <text key={`${id}-${x}-${y}`} className={`board-label ${className}`.trim()} x={x} y={y}>
      {id}
    </text>
  );
}

function boardCaption(label, x, y, className = "") {
  return (
    <text key={`${label}-${x}-${y}`} className={`board-caption ${className}`.trim()} x={x} y={y}>
      {label}
    </text>
  );
}

function BoardPad({ pin, position, selected, related, onSelect }) {
  return (
    <g
      className={[
        "board-pad",
        selected ? "selected" : "",
        related ? "related" : "",
        pin.category === "power" || pin.category === "control" ? "power-pad" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(pin.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(pin.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={pin.displayName || pin.id}
    >
      <circle className="pin-hit" cx={position.x} cy={position.y} r="22" />
      <circle className="pad-shell" cx={position.x} cy={position.y} r={selected ? 10.5 : 9} />
      <circle className="pad-hole" cx={position.x} cy={position.y} r={selected ? 5.4 : 4.7} />
      {selected ? (
        <motion.circle
          className="pad-glow"
          cx={position.x}
          cy={position.y}
          r="22"
          initial={{ opacity: 0.35, scale: 0.92 }}
          animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      ) : null}
    </g>
  );
}

export default function BoardExplorer({ pins, selectedPin, relatedIds, onSelectPin }) {
  const selectedPositions = padLookup.get(selectedPin.id) || [];
  const anchor = selectedPositions[0];
  const showKeypadHardware = selectedPin.id === "A0";
  const labelX = anchor ? (anchor.x > 820 ? anchor.x - 170 : anchor.x + 30) : 0;
  const labelY = anchor ? (anchor.y < 220 ? anchor.y + 56 : anchor.y - 68) : 0;
  const labelWidth = Math.max(90, selectedPin.id.length * 15 + 40);

  return (
    <>
      <section className="board-card board-workbench-card">
        <div className="board-stage schematic-stage">
          <div className="board-viewer">
            <svg className="board-svg schematic-svg" viewBox="0 0 1400 760" aria-labelledby="board-title" role="img">
              <title id="board-title">Arduino UNO R3 clickable schematic board explorer</title>

              <path className="board-outline" d="M32 54 H1268 L1338 116 V694 L1302 732 H32 Z" />
              <rect className="board-lcd" x="72" y="208" width="1116" height="304" rx="7" />
              <rect className="board-connector" x="48" y="106" width="142" height="64" rx="6" />
              <g className="board-chip">
                <rect x="230" y="96" width="118" height="78" rx="18" />
                <line x1="268" y1="96" x2="268" y2="174" />
                <line x1="306" y1="96" x2="306" y2="174" />
              </g>

              <line className="board-divider" x1="32" y1="196" x2="1338" y2="196" />
              <line className="board-divider" x1="32" y1="526" x2="1338" y2="526" />

              <text className="board-note blue board-note-sm" x="102" y="194">RP1</text>
              <text className="board-note blue board-note-sm" x="242" y="194">ICSP</text>
              <text className="board-note blue board-note-sm" x="314" y="276">IC1</text>
              <text className="board-note blue board-note-sm" x="866" y="278">R7</text>
              <text className="board-note blue board-note-sm" x="922" y="278">101</text>
              {showKeypadHardware ? (
                <>
                  <text className="board-note green board-note-sm" x="126" y="522">R2</text>
                  <text className="board-note green board-note-sm" x="228" y="522">R3</text>
                  <text className="board-note green board-note-sm" x="320" y="522">R5</text>
                  <text className="board-note green board-note-sm" x="320" y="694">R4</text>
                  <text className="board-note green board-note-sm" x="440" y="522">R6</text>
                </>
              ) : null}

              <text className="board-lcd-text" x="458" y="372">LCD DISPLAY AREA</text>
              <text className="board-lcd-subtext" x="506" y="420">(16x2 Character LCD)</text>

              <g className={`button-zone ${showKeypadHardware ? "show-hardware" : ""}`}>
                <rect className="button-zone-shell" x="44" y="548" width="472" height="136" rx="16" />

                <g className="shield-button">
                  <text className="shield-button-label" x="90" y="584">SELECT</text>
                  <circle cx="96" cy="620" r="18" />
                </g>
                <g className="shield-button">
                  <text className="shield-button-label" x="196" y="584">LEFT</text>
                  <circle cx="202" cy="620" r="18" />
                </g>
                <g className="shield-button">
                  <text className="shield-button-label" x="314" y="566">UP</text>
                  <circle cx="320" cy="596" r="18" />
                </g>
                <g className="shield-button">
                  <circle cx="320" cy="650" r="18" />
                  <text className="shield-button-label" x="320" y="682">DOWN</text>
                </g>
                <g className="shield-button">
                  <text className="shield-button-label" x="430" y="584">RIGHT</text>
                  <circle cx="438" cy="620" r="18" />
                </g>

                <g className="button-zone-hardware">
                  <text x="78" y="704">Button resistor ladder on A0</text>
                  <text x="78" y="720">SELECT → R2   LEFT → R3   DOWN → R4   UP → R5   RIGHT → R6</text>
                </g>
              </g>

              <g className="reset-control">
                <text className="reset-label" x="548" y="584">RESET</text>
                <circle className="reset-button" cx="548" cy="620" r="18" />
              </g>

              {decorativePads(94, 236, 14, 42)}
              <g className="header-group-box">
                <rect x="632" y="548" width="156" height="126" rx="18" />
                {boardCaption("DFROBOT", 710, 564, "board-caption-hardware")}
              </g>
              <g className="header-group-box">
                <rect x="814" y="548" width="156" height="96" rx="18" />
                {boardCaption("POWER", 892, 564, "board-caption-hardware")}
              </g>
              <g className="header-group-box">
                <rect x="1016" y="548" width="220" height="96" rx="18" />
                {boardCaption("ANALOG", 1126, 564, "board-caption-hardware")}
              </g>

              {decorativePadGrid(654, 609, 2, 5, 28, 29)}
              {decorativePadGrid(836, 582, 2, 5, 30, 29)}
              {decorativePadGrid(1050, 582, 2, 6, 28, 29)}

              {boardCaption("LCD KEYPAD SHIELD", 620, 94, "board-caption-title")}
              {boardCaption("JDIGITAL", 906, 86)}
              {boardCaption("JUTILITY", 434, 140)}

              {layout.digitalUpper.ids.map((id, index) =>
                headerLabel(id, layout.digitalUpper.x + index * layout.digitalUpper.gap, 32, "vertical"),
              )}
              {["NC", "IOREF", "RESET"].map((label, index) =>
                headerLabel(label, 654 + index * 28, 692, "vertical power"),
              )}
              {["3.3V", "5V", "GND", "GND", "VIN"].map((label, index) =>
                headerLabel(label, 836 + index * 30, 692, "vertical power"),
              )}
              {layout.analog.ids.map((id, index) =>
                headerLabel(id, 1050 + index * 28, 692, "vertical analog"),
              )}

              {pins.flatMap((pin) =>
                (padLookup.get(pin.id) || []).map((position, index) => (
                  <BoardPad
                    key={`${pin.id}-${position.rowKey}-${index}`}
                    pin={pin}
                    position={position}
                    selected={pin.id === selectedPin.id}
                    related={relatedIds.includes(pin.id) && pin.id !== selectedPin.id}
                    onSelect={onSelectPin}
                  />
                )),
              )}

              {anchor ? (
                <>
                  <motion.line
                    className="callout-line"
                    x1={anchor.x}
                    y1={anchor.y}
                    x2={labelX + labelWidth / 2}
                    y2={labelY + 20}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.35 }}
                  />
                  <motion.rect
                    className="callout-box"
                    x={labelX}
                    y={labelY}
                    rx="16"
                    ry="16"
                    width={labelWidth}
                    height="40"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22 }}
                  />
                  <motion.text
                    className="callout-text"
                    x={labelX + labelWidth / 2}
                    y={labelY + 25}
                    textAnchor="middle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {selectedPin.id}
                  </motion.text>
                </>
              ) : null}
            </svg>
          </div>
        </div>

        <div className="legend-row">
          <span><i className="legend-dot selected" /> Selected pin</span>
          <span><i className="legend-dot related" /> Search matches</span>
          <span><i className="legend-dot power" /> Power / control pads</span>
        </div>
      </section>

      <section className="detail-grid board-detail-grid">
        <section className="detail-card">
          <h3>About {selectedPin.id}</h3>
          <p>{selectedPin.description}</p>
          <p className="muted">{selectedPin.beginnerExplanation}</p>
        </section>

        <section className="detail-card">
          <h3>Signal Roles</h3>
          <div className="chip-wrap">
            {selectedPin.functions.map((item) => (
              <span className="chip" key={item}>{item}</span>
            ))}
          </div>
          <div className="detail-line">
            <strong>Communication:</strong>{" "}
            {selectedPin.communication.length ? selectedPin.communication.join(", ") : "No dedicated bus role listed"}
          </div>
          <div className="detail-line">
            <strong>Timer links:</strong>{" "}
            {selectedPin.timers.length
              ? selectedPin.timers.map((timer) => `${timer.name} ${timer.channel || ""}`.trim()).join(", ")
              : "No timer channel listed"}
          </div>
        </section>

        {selectedPin.id === "A0" ? (
          <section className="detail-card">
            <h3>Keypad Ladder Input</h3>
            <p>
              The LCD Keypad Shield routes its navigation buttons through a resistor ladder into
              Arduino analog pin A0, so one analog input can identify multiple button presses.
            </p>
            <div className="detail-line"><strong>Typical mapping:</strong> SELECT → R2, LEFT → R3, DOWN → R4, UP → R5, RIGHT → R6</div>
            <div className="detail-line"><strong>Example reading:</strong> the UP button is often read near ADC value 144, depending on the exact shield revision.</div>
          </section>
        ) : null}
      </section>
    </>
  );
}
