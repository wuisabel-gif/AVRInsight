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
    x: 664,
    y: 640,
    gap: 34,
  },
  power: {
    ids: ["3V3", "5V", "GND", "GND", "VIN"],
    x: 802,
    y: 640,
    gap: 32,
  },
  analog: {
    ids: ["A0", "A1", "A2", "A3", "A4", "A5"],
    x: 1022,
    y: 640,
    gap: 24,
  },
};

function buildPadLookup() {
  const padLookup = new Map();

  Object.entries(layout).forEach(([rowKey, row]) => {
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
              <rect className="board-lcd" x="74" y="214" width="936" height="276" rx="7" />
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
              <text className="board-note blue board-note-sm" x="760" y="278">R7</text>
              <text className="board-note blue board-note-sm" x="816" y="278">101</text>
              {showKeypadHardware ? (
                <>
                  <text className="board-note green board-note-sm" x="214" y="498">R6</text>
                  <text className="board-note green board-note-sm" x="292" y="498">R5</text>
                  <text className="board-note green board-note-sm" x="370" y="498">R4</text>
                  <text className="board-note green board-note-sm" x="448" y="498">R3</text>
                  <text className="board-note green board-note-sm" x="526" y="498">R2</text>
                </>
              ) : null}

              <text className="board-lcd-text" x="420" y="364">LCD DISPLAY AREA</text>
              <text className="board-lcd-subtext" x="466" y="410">(16x2 Character LCD)</text>

              <g className={`button-zone ${showKeypadHardware ? "show-hardware" : ""}`}>
                <rect className="button-zone-shell" x="44" y="544" width="448" height="132" rx="20" />
                <text className="button-zone-caption" x="74" y="562">BUTTONS</text>

                <g className="shield-button">
                  <text className="shield-button-label" x="92" y="584">SELECT</text>
                  <circle cx="96" cy="618" r="18" />
                </g>
                <g className="shield-button">
                  <text className="shield-button-label" x="190" y="584">LEFT</text>
                  <circle cx="192" cy="618" r="18" />
                </g>
                <g className="shield-button">
                  <text className="shield-button-label" x="318" y="558">UP</text>
                  <circle cx="318" cy="584" r="18" />
                </g>
                <g className="shield-button">
                  <circle cx="318" cy="650" r="18" />
                  <text className="shield-button-label" x="318" y="682">DOWN</text>
                </g>
                <g className="shield-button">
                  <text className="shield-button-label" x="446" y="584">RIGHT</text>
                  <circle cx="446" cy="618" r="18" />
                </g>

                <g className="button-zone-hardware">
                  <text x="78" y="704">Button resistor ladder on A0</text>
                  <text x="78" y="720">SELECT → R2   LEFT → R3   DOWN → R4   UP → R5   RIGHT → R6</text>
                </g>
              </g>

              <g className="reset-control">
                <text className="reset-label" x="548" y="584">RESET</text>
                <circle className="reset-button" cx="548" cy="618" r="18" />
              </g>

              {decorativePads(94, 236, 14, 42)}
              <g className="header-group-box">
                <rect x="640" y="548" width="112" height="128" rx="18" />
                {boardCaption("JBREAKOUT", 701, 564, "board-caption-hardware")}
              </g>
              <g className="header-group-box">
                <rect x="780" y="548" width="420" height="128" rx="18" />
                {boardCaption("RIGHT HEADER GROUP", 990, 564, "board-caption-hardware")}
                <line className="header-group-divider" x1="966" y1="568" x2="966" y2="662" />
              </g>

              {decorativePadGrid(664, 582, 3, 3, 34, 29)}
              {decorativePadGrid(802, 582, 3, 5, 32, 29)}
              {decorativePadGrid(1022, 582, 3, 6, 24, 29)}

              {boardCaption("LCD KEYPAD SHIELD", 620, 94, "board-caption-title")}
              {boardCaption("JDIGITAL", 906, 86)}
              {boardCaption("JUTILITY", 434, 140)}
              {boardCaption("GND", 626, 586, "board-caption-row")}
              {boardCaption("VCC", 626, 615, "board-caption-row")}
              {boardCaption("S", 626, 644, "board-caption-row")}
              {boardCaption("GND", 760, 586, "board-caption-row")}
              {boardCaption("VCC", 760, 615, "board-caption-row")}
              {boardCaption("S", 760, 644, "board-caption-row")}

              {layout.digitalUpper.ids.map((id, index) =>
                headerLabel(id, layout.digitalUpper.x + index * layout.digitalUpper.gap, 32, "vertical"),
              )}
              {["NC", "IOREF", "RESET"].map((label, index) =>
                headerLabel(label, 664 + index * 34, 692, "vertical power"),
              )}
              {["3.3V", "5V", "GND", "GND", "VIN"].map((label, index) =>
                headerLabel(label, 802 + index * 32, 692, "vertical power"),
              )}
              {layout.analog.ids.map((id, index) =>
                headerLabel(id, 1022 + index * 24, 692, "vertical analog"),
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
