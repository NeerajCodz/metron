import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const foundryOutput = new URL("../apps/web3/out/", import.meta.url);
const generatedOutput = new URL("../packages/abi/generated/", import.meta.url);

async function collectArtifacts(directory, results) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectArtifacts(path, results);
      continue;
    }
    if (entry.name.endsWith(".json")) {
      results.push(path);
    }
  }
}

const artifactPaths = [];
try {
  await collectArtifacts(foundryOutput, artifactPaths);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    throw new Error("Foundry output is missing. Run the Web3 build before generating ABIs.", {
      cause: error,
    });
  }
  throw error;
}

await rm(generatedOutput, { recursive: true, force: true });
await mkdir(generatedOutput, { recursive: true });
const manifest = {};

for (const artifactPath of artifactPaths.sort()) {
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  if (!Array.isArray(artifact.abi) || artifact.abi.length === 0) {
    continue;
  }
  const contractName = basename(artifactPath, ".json");
  const outputName = `${contractName}.json`;
  await writeFile(
    new URL(outputName, generatedOutput),
    `${JSON.stringify(artifact.abi, null, 2)}\n`,
    "utf8",
  );
  manifest[contractName] = {
    abi: outputName,
    source: relative(root, artifactPath).replaceAll("\\", "/"),
  };
}

await writeFile(
  new URL("manifest.json", generatedOutput),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log(`generated ${Object.keys(manifest).length} contract ABIs`);
