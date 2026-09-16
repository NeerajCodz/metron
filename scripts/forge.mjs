import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const localExecutable = resolve(repositoryRoot, ".tools", "foundry", "forge.exe");
const executable =
  process.env.FORGE_BIN ?? (existsSync(localExecutable) ? localExecutable : "forge");
const result = spawnSync(executable, process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw new Error(`Unable to run Foundry at ${executable}`, { cause: result.error });
}
process.exitCode = result.status ?? 1;
