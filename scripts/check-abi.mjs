import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = resolve(root, "packages/abi/generated/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
let checked = 0;
for (const [name, entry] of Object.entries(manifest)) {
  const artifact = JSON.parse(await readFile(resolve(root, entry.source), "utf8"));
  const generated = JSON.parse(
    await readFile(resolve(root, "packages/abi/generated", entry.abi), "utf8"),
  );
  if (JSON.stringify(artifact.abi) !== JSON.stringify(generated)) {
    throw new Error(`ABI mismatch for ${name}; run pnpm generate:abi`);
  }
  checked += 1;
}
console.log(`verified ${checked} generated contract ABIs`);
