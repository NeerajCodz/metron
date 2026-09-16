import { copyFile, cp, mkdir } from "node:fs/promises";

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await copyFile(
  new URL("../src/styles.css", import.meta.url),
  new URL("../dist/styles.css", import.meta.url),
);
await cp(
  new URL("../src/styles/", import.meta.url),
  new URL("../dist/styles/", import.meta.url),
  { recursive: true },
);
