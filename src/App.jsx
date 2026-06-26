import { useDeferredValue, useMemo, useState } from "react";
import BoardExplorer from "./components/BoardExplorer.jsx";
import DebuggerPanel from "./components/DebuggerPanel.jsx";
import InterruptExplorer from "./components/InterruptExplorer.jsx";
import PinInfoPanel from "./components/PinInfoPanel.jsx";
import RegisterDecoder, { decodeRegisterSnippet } from "./components/RegisterDecoder.jsx";
import TimerAnimation from "./components/TimerAnimation.jsx";
import avrInterrupts from "./data/avrInterrupts.json";
import avrRegisters from "./data/avrRegisters.json";
import unoPins from "./data/unoPins.json";

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8787";

const defaultSnippet = `TCCR1B |= (1 << CS12);
TIMSK1 |= (1 << OCIE1A);
EICRA |= (1 << ISC01) | (1 << ISC00);
EIMSK |= (1 << INT0);
PCICR |= (1 << PCIE2);
PCMSK2 |= (1 << PCINT18);`;

const defaultDebuggerCode = `EICRA |= (1 << ISC01) | (1 << ISC00);
EIMSK |= (1 << INT0);
ISR(INT1_vect) {
}`;

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedPinId, setSelectedPinId] = useState("D2");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [interruptSection, setInterruptSection] = useState("external");
  const [registerInput, setRegisterInput] = useState(defaultSnippet);
  const [debuggerQuery, setDebuggerQuery] = useState("Why is my INT0 interrupt not firing on D2?");
  const [debuggerCode, setDebuggerCode] = useState(defaultDebuggerCode);
  const [debuggerUseLlm, setDebuggerUseLlm] = useState(false);
  const [debuggerLoading, setDebuggerLoading] = useState(false);
  const [debuggerError, setDebuggerError] = useState("");
  const [debuggerResult, setDebuggerResult] = useState(null);

  const deferredQuery = useDeferredValue(query);

  const filteredPins = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);

    return unoPins.filter((pin) => {
      const categoryMatch = categoryFilter === "all" || pin.category === categoryFilter;
      if (!categoryMatch) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        pin.id,
        pin.displayName,
        ...(pin.aliases || []),
        ...(pin.functions || []),
        ...(pin.relatedRegisters || []),
        ...(pin.communication || []),
        ...(pin.timers || []).flatMap((timer) => [timer.name, timer.channel, timer.compareRegister]),
        pin.externalInterrupt?.name,
        pin.pinChangeInterrupt?.name,
      ]
        .filter(Boolean)
        .map(normalize);

      return haystack.some((entry) => entry.includes(normalizedQuery));
    });
  }, [categoryFilter, deferredQuery]);

  const selectedPin = useMemo(() => {
    if (filteredPins.some((pin) => pin.id === selectedPinId)) {
      return unoPins.find((pin) => pin.id === selectedPinId) || unoPins[0];
    }

    return filteredPins[0] || unoPins[0];
  }, [filteredPins, selectedPinId]);

  const relatedIds = useMemo(() => {
    if (query.trim()) {
      return filteredPins.map((pin) => pin.id);
    }
    return [selectedPin.id];
  }, [filteredPins, query, selectedPin.id]);

  const decodedResults = useMemo(
    () => decodeRegisterSnippet(registerInput, avrRegisters),
    [registerInput],
  );

  async function runDebuggerAnalysis() {
    setDebuggerLoading(true);
    setDebuggerError("");

    try {
      const response = await fetch(`${backendBaseUrl}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userQuery: debuggerQuery,
          codeSnippet: debuggerCode,
          useLlm: debuggerUseLlm,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "The debugger backend returned an error.");
      }

      setDebuggerResult(data.result);
    } catch (error) {
      setDebuggerError(error instanceof Error ? error.message : "Unknown debugger request error");
    } finally {
      setDebuggerLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <section className="sidebar-card hero-card">
          <div className="eyebrow">Arduino UNO R3 / ATmega328P</div>
          <h1>Pin, Port, Register, Timer, and Interrupt Explorer</h1>
          <p>
            Click a pin on the UNO R3 and see what sits underneath it: the ATmega328P port and
            bit it drives, the registers that configure it, the interrupts and timers it can fire.
            Search by any name the datasheet or your sketch uses — D2, PD2, INT0, OCR1A — and the
            board lights up as you go.
          </p>
        </section>

        <section className="sidebar-card controls-card">
          <div className="section-heading compact">
            <div>
              <div className="section-kicker">Pin Navigator</div>
              <h2>Find a pin by any hardware name</h2>
            </div>
            <p>Search board names, AVR ports, timer channels, interrupt labels, and bus aliases.</p>
          </div>

          <label className="search-label" htmlFor="pin-search">
            Search aliases
          </label>
          <input
            id="pin-search"
            className="search-input"
            type="search"
            placeholder="D2, PD2, INT0, Timer1, OCR1A, SDA, 5V..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="filter-row">
            {["all", "digital", "analog", "power", "control"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-chip ${categoryFilter === filter ? "active" : ""}`}
                onClick={() => setCategoryFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="list-heading">
            <span>Matching pins</span>
            <span>{filteredPins.length}</span>
          </div>

          <div className="result-list">
            {filteredPins.slice(0, 12).map((pin) => (
              <button
                key={pin.id}
                type="button"
                className={`result-item ${pin.id === selectedPin.id ? "active" : ""}`}
                onClick={() => setSelectedPinId(pin.id)}
              >
                <span>{pin.id}</span>
                <small>{pin.displayName}</small>
              </button>
            ))}
            {filteredPins.length === 0 ? <p className="muted">No pins matched the current search.</p> : null}
          </div>
        </section>
      </aside>

      <main className="main-panel">
        <nav className="tabs" aria-label="Explorer sections">
          {[
            ["map", "Pin Map"],
            ["interrupts", "Interrupts"],
            ["decoder", "Register Decoder"],
            ["debugger", "Ask Debugger"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tab ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "map" ? (
          <section className="map-workspace">
            <BoardExplorer
              pins={unoPins}
              selectedPin={selectedPin}
              relatedIds={relatedIds}
              onSelectPin={setSelectedPinId}
            />
            <section className="pin-reference-section">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">Selected Pin Reference</div>
                  <h2>{selectedPin.id} overview</h2>
                </div>
                <p>
                  Keep the board on screen while you scan aliases, registers, timer links, and
                  interrupt behavior for the currently selected pin.
                </p>
              </div>
              <PinInfoPanel pin={selectedPin} />
            </section>
            <TimerAnimation pin={selectedPin} />
          </section>
        ) : null}

        {activeTab === "interrupts" ? (
          <InterruptExplorer
            interruptData={avrInterrupts}
            selectedSection={interruptSection}
            onSelectSection={setInterruptSection}
          />
        ) : null}

        {activeTab === "decoder" ? (
          <RegisterDecoder
            input={registerInput}
            onChangeInput={setRegisterInput}
            decodedResults={decodedResults}
          />
        ) : null}

        {activeTab === "debugger" ? (
          <DebuggerPanel
            query={debuggerQuery}
            code={debuggerCode}
            useLlm={debuggerUseLlm}
            result={debuggerResult}
            loading={debuggerLoading}
            error={debuggerError}
            onChangeQuery={setDebuggerQuery}
            onChangeCode={setDebuggerCode}
            onChangeUseLlm={setDebuggerUseLlm}
            onRun={runDebuggerAnalysis}
          />
        ) : null}
      </main>
    </div>
  );
}
