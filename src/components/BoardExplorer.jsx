import { motion } from "framer-motion";

const layout = {
  digitalUpper: {
    ids: ["D13", "D12", "D11", "D10", "D9", "D8"],
    x: 714,
    y: 98,
    gap: 51,
  },
  digitalLower: {
    ids: ["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"],
    x: 565,
    y: 152,
    gap: 51,
  },
  utility: {
    ids: ["GND", "AREF", "A4", "A5"],
    x: 361,
    y: 152,
    gap: 51,
  },
  power: {
    ids: ["NC", "IOREF", "RESET", "3V3", "5V", "GND", "GND", "VIN"],
    x: 603,
    y: 560,
    gap: 38,
  },
  analog: {
    ids: ["A0", "A1", "A2", "A3", "A4", "A5"],
    x: 885,
    y: 560,
    gap: 38,
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
        <rect x={px - 17} y={y - 17} width="34" height="34" rx="12" />
        <circle cx={px} cy={y} r="7" />
      </g>
    );
  });
}

function headerLabel(id, x, y, className = "") {
  return (
    <text key={`${id}-${x}-${y}`} className={`board-label ${className}`.trim()} x={x} y={y}>
      {id}
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
      <rect className="pad-shell" x={position.x - 17} y={position.y - 17} width="34" height="34" rx="12" />
      <circle className="pad-hole" cx={position.x} cy={position.y} r={selected ? 7.75 : 6.75} />
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
  const labelX = anchor ? (anchor.x > 820 ? anchor.x - 176 : anchor.x + 34) : 0;
  const labelY = anchor ? (anchor.y < 220 ? anchor.y + 54 : anchor.y - 74) : 0;
  const labelWidth = Math.max(90, selectedPin.id.length * 15 + 40);

  return (
    <>
      <section className="board-card">
        <div className="board-stage schematic-stage">
          <svg className="board-svg schematic-svg" viewBox="0 0 1140 700" aria-labelledby="board-title" role="img">
            <title id="board-title">Arduino UNO R3 clickable schematic board explorer</title>

            <path className="board-outline" d="M32 54 H1038 L1100 116 V622 L1070 652 H32 Z" />
            <rect className="board-lcd" x="90" y="228" width="900" height="236" rx="7" />
            <rect className="board-connector" x="48" y="106" width="142" height="64" rx="6" />
            <g className="board-chip">
              <rect x="230" y="96" width="118" height="78" rx="18" />
              <line x1="268" y1="96" x2="268" y2="174" />
              <line x1="306" y1="96" x2="306" y2="174" />
            </g>

            <line className="board-divider" x1="32" y1="196" x2="1100" y2="196" />
            <line className="board-divider" x1="32" y1="526" x2="1100" y2="526" />

            <text className="board-title-text" x="494" y="136">LCD Keypad Shield</text>
            <text className="board-note blue" x="102" y="194">RP1</text>
            <text className="board-note blue" x="242" y="194">ICSP</text>
            <text className="board-note blue" x="314" y="276">IC1</text>
            <text className="board-note blue" x="760" y="278">R7</text>
            <text className="board-note blue" x="816" y="278">101</text>
            <text className="board-note green" x="214" y="498">R6</text>
            <text className="board-note green" x="292" y="498">R5</text>
            <text className="board-note green" x="370" y="498">R4</text>
            <text className="board-note green" x="448" y="498">R3</text>
            <text className="board-note green" x="526" y="498">R2</text>

            <text className="board-lcd-text" x="430" y="360">LCD DISPLAY AREA</text>
            <text className="board-lcd-subtext" x="476" y="402">(16x2 Character LCD)</text>
            <text className="board-note blue" x="58" y="600">SELECT</text>
            <text className="board-note blue" x="192" y="600">LEFT</text>
            <text className="board-note blue" x="328" y="574">UP</text>
            <text className="board-note blue" x="412" y="600">RIGHT</text>
            <text className="board-note blue" x="530" y="600">RST</text>
            <text className="board-note blue" x="620" y="596">PWR</text>
            <text className="board-note blue" x="318" y="656">DOWN</text>
            <text className="board-note black" x="790" y="618">DRIVE THE FUTURE</text>

            <g className="button-cluster">
              <circle cx="96" cy="610" r="20" />
              <circle cx="212" cy="610" r="20" />
              <circle cx="346" cy="562" r="20" />
              <circle cx="346" cy="652" r="20" />
              <circle cx="462" cy="610" r="20" />
              <circle cx="578" cy="610" r="20" />
            </g>

            {decorativePads(94, 236, 14, 42)}
            {decorativePads(layout.power.x, 600, 8, layout.power.gap)}
            {decorativePads(layout.analog.x, 600, 6, layout.analog.gap)}

            {layout.digitalUpper.ids.map((id, index) =>
              headerLabel(id, layout.digitalUpper.x + index * layout.digitalUpper.gap, 48, "vertical"),
            )}
            {["RESET", "3.3V", "5V", "GND", "GND", "VIN"].map((label, index) =>
              headerLabel(label, 679 + index * 38, 678, "vertical power"),
            )}
            {layout.analog.ids.map((id, index) =>
              headerLabel(id, layout.analog.x + index * layout.analog.gap, 678, "vertical analog"),
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

        <div className="legend-row">
          <span><i className="legend-dot selected" /> Selected pin</span>
          <span><i className="legend-dot related" /> Search matches</span>
          <span><i className="legend-dot power" /> Power / control pads</span>
        </div>
      </section>

      <section className="detail-grid">
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
      </section>
    </>
  );
}
