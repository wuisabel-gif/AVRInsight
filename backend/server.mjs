import { loadLocalEnv } from "./loadEnv.mjs";
import http from "node:http";
import { analyzeAvrSnippet } from "./langgraph/avrAnalysisGraph.mjs";

loadLocalEnv();

const port = Number(process.env.AVR_BACKEND_PORT || 8787);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(body, null, 2));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "avr-phase2-backend" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/analyze") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const input = body ? JSON.parse(body) : {};
        const result = await analyzeAvrSnippet(input);
        sendJson(res, 200, {
          ok: true,
          result,
          meta: {
            llmAvailable: Boolean(process.env.GEMINI_API_KEY),
            requestedLlm: Boolean(input.useLlm),
          },
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown backend error",
        });
      }
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Phase 2 backend listening on http://127.0.0.1:${port}`);
});
