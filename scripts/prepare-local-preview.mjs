import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distIndexPath = path.join(root, "dist", "index.html");
const localIndexPath = path.join(root, "dist", "index.local.html");

const html = await readFile(distIndexPath, "utf8");
const redirectScript = `    <script>
      if (window.location.protocol === "file:") {
        window.location.replace(new URL("./dist/index.local.html", window.location.href));
      }
    </script>
`;
const localHtml = html
  .replace(redirectScript, "")
  .replaceAll('="/AVRInsight/assets/', '="./assets/');

await writeFile(localIndexPath, localHtml, "utf8");

console.log(`Prepared file-openable preview at ${localIndexPath}`);
