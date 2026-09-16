import { readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url);
const REMOVABLE_DIRECTORY_NAMES = new Set([
  ".turbo",
  "artifacts",
  "broadcast",
  "cache",
  "coverage",
  "dist",
  "out",
  "target",
]);
const SKIPPED_DIRECTORY_NAMES = new Set([".git", ".pnpm-store", "lib", "node_modules"]);

async function collectRemovableDirectories(directory, results) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (REMOVABLE_DIRECTORY_NAMES.has(entry.name)) {
      results.push(path);
      continue;
    }
    await collectRemovableDirectories(path, results);
  }
}

const rootPath =
  ROOT.pathname.startsWith("/") && /^[A-Za-z]:/.test(ROOT.pathname.slice(1))
    ? ROOT.pathname.slice(1)
    : ROOT.pathname;
const directories = [];
await collectRemovableDirectories(rootPath, directories);

for (const directory of directories) {
  await rm(directory, { recursive: true, force: true });
  console.log(`removed ${relative(rootPath, directory)}`);
}
