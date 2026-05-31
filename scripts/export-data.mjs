import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { avrInterrupts } from "../src/data/avrInterrupts.js";
import { avrRegisters } from "../src/data/avrRegisters.js";
import { unoPins } from "../src/data/unoPins.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

async function writeJson(relativePath, value) {
  const filePath = path.join(rootDir, relativePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

await writeJson("src/data/unoPins.json", unoPins);
await writeJson("src/data/avrInterrupts.json", avrInterrupts);
await writeJson("src/data/avrRegisters.json", avrRegisters);

console.log("Exported frontend JSON data files.");
