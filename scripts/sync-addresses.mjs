import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import { chainDeploymentSchema } from "../packages/config/dist/src/index.js";

const deploymentsDirectory = new URL("../apps/web3/deployments/", import.meta.url);
const outputDirectory = new URL("../packages/config/generated/", import.meta.url);
const outputFile = new URL("deployments.json", outputDirectory);

const entries = await readdir(deploymentsDirectory, { withFileTypes: true });
const deployments = {};
for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) {
    continue;
  }
  const raw = JSON.parse(await readFile(new URL(entry.name, deploymentsDirectory), "utf8"));
  deployments[entry.name.replace(/\.json$/, "")] = chainDeploymentSchema.parse(raw);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(deployments, null, 2)}\n`, "utf8");
console.log(`synchronized ${Object.keys(deployments).length} deployment records`);
