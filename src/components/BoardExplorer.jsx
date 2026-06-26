import { motion } from "framer-motion";

const layout = {
  serialHeader: {
    ids: ["GND", "5V", "D1", "D0"],
    labels: ["GND", "VCC", "TX", "RX"],
    x: 548,
    y: 92,
    gap: 43,
  },
  digitalUpper: {
    ids: ["D13", "D12", "D11", "D3", "D2", "D1", "D0", "GND", "5V"],
    labels: ["D13", "D12", "D11", "D3", "D2", "D1", "D0", "GND", "VCC"],
    x: 938,
    y: 92,
    gap: 43,
  },
  utility: {
    ids: ["D10", "D9", "D8"],
    labels: ["D10", "D9", "D8"],
    x: 725,
    y: 92,
    gap: 43,
  },
  analog: {
    ids: ["A0", "A1", "A2", "A3", "A4", "A5"],
    x: 1068,
    y: 692,
    gap: 37,
  },
};

function buildPadLookup() {
  const padLookup = new Map();

  Object.entries(layout).forEach(([rowKey, row]) => {
    if (rowKey === "analog") {
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

  layout.analog.ids.forEach((id, index) => {
    const x = layout.analog.x + index * layout.analog.gap;
    const list = padLookup.get(id) || [];
    const positions =
      index === 0
        ? [
            {
              x,
              y: layout.analog.y,
              rowKey: "analog",
              index,
              rowIndex: 0,
            },
          ]
        : [
            // Only the third row is the analog signal pin. The first row is 5V
            // and the second row is GND, so they are left as decorative pads.
            {
              x,
              y: 678,
              rowKey: "analog",
              index,
              rowIndex: 2,
            },
          ];
    padLookup.set(id, list.concat(positions));
  });

  // Connect the analog breakout's power rails to the board's VCC (5V) and GND
  // pins so the first row reads as 5V and the second row as GND. Columns line
  // up with A1-A5 (the A0 single pad column is skipped).
  const railColumns = layout.analog.ids
    .map((_, index) => layout.analog.x + index * layout.analog.gap)
    .slice(1);

  [
    { id: "5V", y: 598, rowIndex: 0 },
    { id: "GND", y: 638, rowIndex: 1 },
  ].forEach(({ id, y, rowIndex }) => {
    const list = padLookup.get(id) || [];
    const positions = railColumns.map((x, columnIndex) => ({
      x,
      y,
      rowKey: "analog",
      index: columnIndex + 1,
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
        <circle className="decorative-pad-shell" cx={px} cy={y} r="7" />
        <circle className="decorative-pad-hole" cx={px} cy={y} r="3.5" />
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

function headerLabels(row, y, className = "") {
  return (row.labels || row.ids).map((label, index) =>
    headerLabel(label, row.x + index * row.gap, y, className),
  );
}

function boardCaption(label, x, y, className = "") {
  return (
    <text key={`${label}-${x}-${y}`} className={`board-caption ${className}`.trim()} x={x} y={y}>
      {label}
    </text>
  );
}

function HeaderStrip({ row, y }) {
  const width = (row.ids.length - 1) * row.gap + 24;
  return <rect className="header-strip" x={row.x - 12} y={y - 11} width={width} height="22" rx="3" />;
}

function ButtonFootprint({ label, x, y, labelX = x, labelY = y - 36 }) {
  const padPositions = [
    [x - 38, y - 22],
    [x + 38, y - 22],
    [x - 38, y + 22],
    [x + 38, y + 22],
  ];

  return (
    <g className="shield-button">
      <text className="shield-button-label" x={labelX} y={labelY}>{label}</text>
      <line className="button-terminal-line" x1={x - 24} y1={y - 22} x2={x + 24} y2={y - 22} />
      <line className="button-terminal-line" x1={x - 24} y1={y + 22} x2={x + 24} y2={y + 22} />
      <line className="button-side-line" x1={x - 40} y1={y - 8} x2={x - 40} y2={y + 8} />
      <line className="button-side-line" x1={x + 40} y1={y - 8} x2={x + 40} y2={y + 8} />
      {padPositions.map(([padX, padY]) => (
        <circle className="button-terminal-dot" cx={padX} cy={padY} r="8" key={`${label}-${padX}-${padY}`} />
      ))}
      <circle className="button-center" cx={x} cy={y} r="20" />
    </g>
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

              <path className="board-outline" d="M32 42 H1288 L1358 108 V646 L1320 646 V680 L1292 712 H32 Z" />
              <rect className="board-lcd" x="96" y="248" width="1190" height="292" rx="2" />

              <rect className="potentiometer-box" x="80" y="56" width="120" height="120" rx="2" />
              <circle className="potentiometer-dot" cx="105" cy="96" r="12" />
              <circle className="potentiometer-dot" cx="179" cy="96" r="12" />
              <circle className="potentiometer-dot" cx="141" cy="138" r="12" />
              <rect className="reserved-box" x="250" y="54" width="264" height="134" rx="2" />
              <text className="reserved-label" x="372" y="112">Reserved</text>
              <text className="reserved-label" x="372" y="150">Pins</text>

              <line className="board-divider" x1="32" y1="196" x2="1358" y2="196" />
              <line className="board-divider" x1="32" y1="556" x2="1358" y2="556" />

              <HeaderStrip row={layout.serialHeader} y={layout.serialHeader.y} />
              <HeaderStrip row={layout.utility} y={layout.utility.y} />
              <HeaderStrip row={layout.digitalUpper} y={layout.digitalUpper.y} />
              {decorativePads(layout.serialHeader.x, layout.serialHeader.y, layout.serialHeader.ids.length, layout.serialHeader.gap)}
              {decorativePads(layout.utility.x, layout.utility.y, layout.utility.ids.length, layout.utility.gap)}
              {decorativePads(layout.digitalUpper.x, layout.digitalUpper.y, layout.digitalUpper.ids.length, layout.digitalUpper.gap)}
              {showKeypadHardware ? (
                <>
                  <text className="board-note green board-note-sm" x="98" y="694">R2</text>
                  <text className="board-note green board-note-sm" x="206" y="694">R3</text>
                  <text className="board-note green board-note-sm" x="338" y="576">R5</text>
                  <text className="board-note green board-note-sm" x="338" y="710">R4</text>
                  <text className="board-note green board-note-sm" x="522" y="694">R6</text>
                </>
              ) : null}

              <text className="board-lcd-text" x="510" y="380">LCD DISPLAY AREA</text>
              <text className="board-lcd-subtext" x="510" y="426">(16x2 Character LCD)</text>

              <g className={`button-zone ${showKeypadHardware ? "show-hardware" : ""}`}>
                <ButtonFootprint label="SELECT" x={104} y={668} />
                <ButtonFootprint label="LEFT" x={246} y={668} />
                <ButtonFootprint label="UP" x={396} y={606} labelX={346} labelY={614} />
                <ButtonFootprint label="DOWN" x={396} y={680} labelX={338} labelY={650} />
                <ButtonFootprint label="RIGHT" x={552} y={668} />

                <g className="button-zone-hardware">
                  <text x="72" y="570">Button resistor ladder on A0</text>
                  <text x="72" y="586">SELECT -&gt; R2   LEFT -&gt; R3   DOWN -&gt; R4   UP -&gt; R5   RIGHT -&gt; R6</text>
                </g>
              </g>

              <g className="reset-control">
                <ButtonFootprint label="RST" x={690} y={668} />
              </g>

              <g className="header-group-box">
                <rect className="reserved-box" x="782" y="592" width="244" height="100" rx="2" />
                <text className="reserved-label" x="904" y="630">Reserved</text>
                <text className="reserved-label" x="904" y="670">Pins</text>
              </g>
              <g className="header-group-box">
                <rect x="1054" y="580" width="222" height="126" rx="2" />
                <text className="analog-row" x="1096" y="606" textAnchor="end">5V</text>
                <text className="analog-row" x="1096" y="646" textAnchor="end">GND</text>
                <text className="analog-row" x="1096" y="686" textAnchor="end">S</text>
              </g>


              {decorativePads(layout.analog.x, layout.analog.y, 1, layout.analog.gap)}
              {decorativePadGrid(layout.analog.x + layout.analog.gap, 598, 3, 5, layout.analog.gap, 40)}

              {headerLabels(layout.serialHeader, 64)}
              {headerLabels(layout.utility, 64)}
              {headerLabels(layout.digitalUpper, 64)}
              {layout.analog.ids.map((id, index) =>
                headerLabel(id, layout.analog.x + index * layout.analog.gap, 728, "analog"),
              )}
              {boardCaption("ANALOG IN", 1168, 748, "board-caption-hardware")}


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
          <span><i className="legend-dot power" /> Power / control references</span>
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
