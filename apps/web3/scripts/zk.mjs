import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const circuits = ["intent", "ownership", "collateral"];
const command = process.argv[2] ?? "check";

function run(binary, args, cwd) {
  const result = spawnSync(binary, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error?.code === "ENOENT") {
    throw new Error(`${binary} is required for zk:${command}; install the pinned Noir/Barretenberg toolchain`);
  }
  if (result.status !== 0) throw new Error(`${binary} ${args.join(" ")} failed with status ${result.status}`);
}

for (const circuit of circuits) {
  const cwd = resolve(root, "zk", circuit);
  if (!existsSync(resolve(cwd, "Nargo.toml"))) throw new Error(`missing circuit manifest: ${circuit}`);
  run("nargo", ["check"], cwd);
  if (command === "compile" || command === "prove") run("nargo", ["compile", "--silence-warnings"], cwd);
  if (command === "prove") {
    const output = resolve(root, "zk", "artifacts", circuit);
    mkdirSync(output, { recursive: true });
    run("bb", ["prove", "-b", resolve(cwd, "target", `${circuit}.json`), "-w", resolve(cwd, "Prover.toml"), "-o", resolve(output, "proof")], cwd);
    run("bb", ["write_vk", "-b", resolve(cwd, "target", `${circuit}.json`), "-o", resolve(output, "vk")], cwd);
    run("bb", ["verify", "-k", resolve(output, "vk"), "-p", resolve(output, "proof")], cwd);
  }
}

console.log(`zk:${command} completed for ${circuits.join(", ")}`);
