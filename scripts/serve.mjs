import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseDir = process.argv.includes("--dist") ? path.join(root, "dist") : root;
const portArg = process.argv.find((arg) => arg.startsWith("--port="));
const port = Number(portArg?.split("=")[1] || 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
};

const hostArg = process.argv.find((arg) => arg.startsWith("--host="));
const host = hostArg?.split("=")[1] || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  const requestPath = (req.url || "/").split("?")[0];
  const safePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.join(baseDir, safePath);

  try {
    await access(filePath);
    const fileStats = await stat(filePath);
    const finalPath = fileStats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    res.writeHead(200, { "Content-Type": contentTypes[path.extname(finalPath)] || "text/plain; charset=utf-8" });
    createReadStream(finalPath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${baseDir} at http://${host}:${port}`);
});
