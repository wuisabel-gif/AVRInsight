import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");

const child = spawn(process.execPath, [viteCli, "build"], {
  cwd: root,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
