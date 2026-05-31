# Arduino UNO R3 AVR Explorer

Built an interactive embedded systems learning tool for the Arduino UNO R3 / ATmega328P that visually connects board pins to "AVR registers", "interrupts", "timers", and "communication roles". Features include searchable pin aliases, interactive board mapping, register decoding, timer and interrupt visualization, and guided debugging support.

**Keywords:** `Arduino UNO R3` · `ATmega328P` · `Embedded Systems` · `AVR Architecture` · `Register-Level Programming` · `Interrupts` · `Timers` · `PWM` · `GPIO` · `SPI` · `I2C` · `Pin Mapping` · `Register Visualization` · `React` · `SVG` · `Frontend Development` · `Educational Software` · `Debugging Tools`

## What It Includes

- Interactive Arduino UNO R3 shield-oriented pin map with alias search
- Physical pin highlighting with animated glow and callout
- React + Vite frontend with SVG board rendering
- Separate pin, interrupt, and register data files for the frontend JSON layer
- Interrupt explorer for external interrupts, pin-change interrupts, timer interrupts, and polling comparison
- Register decoder for beginner-friendly explanations of common AVR setup lines
- Ask-the-debugger frontend connected to a LangGraph-style backend starter

## Accuracy Note

Board connector naming and header pin ordering were grounded in the Arduino UNO R3 board datasheet (`A000066-datasheet.pdf`), especially the `JANALOG` and `JDIGITAL` connector tables.

Detailed AVR register behavior in this project is intentionally educational and should be checked against the official ATmega328P microcontroller datasheet before claiming full hardware accuracy.

## Local Usage

Start the React frontend:

```bash
pnpm dev
```

Build the production frontend:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

Refresh the frontend JSON data files from the educational JS metadata:

```bash
pnpm export:data
```

## GitHub Pages

This project is configured for GitHub Pages project-site hosting at:

`https://wuisabel-gif.github.io/AVRInsight/`

Important notes:

- Vite must build with the base path `/AVRInsight/`, otherwise the deployed page will load a blank screen because the asset URLs will point to `/assets/...` instead of `/AVRInsight/assets/...`.
- The included GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds and deploys the `dist/` folder automatically from `main`.
- The frontend can be hosted on GitHub Pages, but the Phase 2 backend cannot. The "Ask Debugger" tab will only work if you deploy the backend separately and set `VITE_BACKEND_URL` to that live backend URL.

## Environment Setup

This repo is safe to push only if your real API key stays out of Git and out of the frontend.

1. Copy `.env.example` to `.env`.
2. Put your real OpenAI key only in `.env`.
3. Keep `.env` local. It is ignored by Git.

Example:

```bash
cp .env.example .env
```

Then edit `.env` and replace the placeholder value:

```bash
OPENAI_API_KEY=your_real_key_here
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
AVR_BACKEND_PORT=8787
VITE_BACKEND_URL=http://127.0.0.1:8787
VITE_BASE_PATH=/
```

Security notes:

- Never commit `.env` or paste your real key into frontend code.
- The frontend should call your backend, and only the backend should call OpenAI.
- If a key is ever exposed, revoke it and create a new one immediately.

## Phase 2 Backend Starter

This repo now includes a LangGraph-based backend starter for Phase 2 reasoning workflows.

Run the backend:

```bash
pnpm backend
```

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

Analyze a snippet:

```bash
curl -X POST http://127.0.0.1:8787/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "Why is my interrupt not firing?",
    "codeSnippet": "EICRA |= (1 << ISC01) | (1 << ISC00);\nEIMSK |= (1 << INT0);\nISR(INT1_vect) {}",
    "useLlm": true
  }'
```

Starter graph flow:

1. Parse code
2. Resolve pin aliases
3. Detect interrupt/timer mode
4. Analyze external, pin-change, or timer configuration
5. Check pin capability
6. Explain likely issues

Important note:
This backend now supports an optional OpenAI reasoning step on top of the deterministic LangGraph flow.

Set an API key before requesting LLM reasoning:

```bash
cp .env.example .env
```

If `useLlm` is `true` but `OPENAI_API_KEY` is missing, the backend will skip the LLM step and return the deterministic analysis plus a skipped-status message.

## Deployment

Recommended deployment split:

- Frontend: GitHub Pages, Netlify, or Vercel
- Backend: Render, Railway, Fly.io, or another Node host

Why:

- the frontend is static and Vite-friendly
- the backend holds the OpenAI key and must not be deployed as client-side code

Typical flow:

1. Run `pnpm export:data`
2. Run `pnpm build`
3. Deploy the `dist/` folder as the frontend
4. Deploy `backend/server.mjs` as a separate Node service
5. Set `OPENAI_API_KEY` only in the backend host environment
6. Set `VITE_BACKEND_URL` to your deployed backend URL before building the frontend
7. If you deploy to a GitHub Pages repo path, set `VITE_BASE_PATH` before building

Example for GitHub Pages project sites:

```bash
VITE_BASE_PATH=/your-repo-name/ pnpm build
```

## Adding A New Pin

1. Open [src/data/unoPins.js](/Users/harvardsummer/Downloads/AVRInsight/src/data/unoPins.js).
2. Add a new pin object with:
   `id`, `displayName`, `aliases`, `header`, `headerPinNumber`, `physicalLocation`, and any AVR or interrupt metadata.
3. Add search aliases for every name a beginner might type.
4. If the pin is tied to a new register or interrupt rule, extend [src/data/avrRegisters.js](/Users/harvardsummer/Downloads/AVRInsight/src/data/avrRegisters.js) or [src/data/avrInterrupts.js](/Users/harvardsummer/Downloads/AVRInsight/src/data/avrInterrupts.js).

Example pattern:

```js
{
  id: "D4",
  displayName: "Digital Pin 4",
  aliases: ["D4", "Digital 4", "Pin 4", "PD4", "PORTD4", "T0", "PCINT20"],
  category: "digital",
  header: "JDIGITAL",
  headerPinNumber: 5,
  arduinoPin: "D4",
  avrPort: "PORTD",
  avrPin: "PD4",
  bit: 4,
  physicalLocation: { x: 367, y: 28 },
  functions: ["GPIO", "Pin Change Interrupt", "Timer Counter Input"],
}
```

## Adding Register Rules

Register decoder rules live in [src/data/avrRegisters.js](/Users/harvardsummer/Downloads/AVRInsight/src/data/avrRegisters.js).

- Add a register entry when you want a register-level summary.
- Add bit entries when a single bit deserves a pin-specific explanation.
- Include `relatedPins` whenever the decoder should point the user back to physical hardware.

## Interrupt Model Summary

- External interrupts: dedicated interrupt lines on `D2/INT0` and `D3/INT1`, with trigger modes selected in `EICRA`.
- Pin-change interrupts: many GPIO pins can trigger grouped interrupts, with group enable in `PCICR` and per-pin masking in `PCMSK0/1/2`.
- Timer interrupts: hardware timers trigger compare-match, overflow, or input-capture events independently of pin edges.
- Polling: software repeatedly checks state inside `loop()`, which is simpler to visualize but less immediate than hardware interrupts.
