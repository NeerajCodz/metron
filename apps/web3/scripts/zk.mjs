import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("..", import.meta.url));

const circuits = ["intent", "ownership", "collateral"];
const command = process.argv[2] ?? "check";
if (!["check", "compile", "prove"].includes(command))
  throw new Error(`unsupported zk command: ${command}`);
const nargoBinary = process.env.METRON_NARGO_BIN ?? "nargo";
const bbBinary = process.env.METRON_BB_BIN ?? "bb";
const packageNames = {
  intent: "metron_intent",
  ownership: "metron_ownership",
  collateral: "metron_collateral",
};

function run(binary, args, cwd) {
  const result = spawnSync(binary, args, { cwd, stdio: "inherit" });
  if (result.error?.code === "ENOENT") {
    throw new Error(
      `${binary} is required for zk:${command}; install the pinned Noir/Barretenberg toolchain`,
    );
  }
  if (result.status !== 0)
    throw new Error(`${binary} ${args.join(" ")} failed with status ${result.status}`);
}

function requireFile(path, description) {
  if (!existsSync(path)) throw new Error(`${description} is required: ${path}`);
}

for (const circuit of circuits) {
  const cwd = resolve(root, "zk", circuit);
  if (!existsSync(resolve(cwd, "Nargo.toml")))
    throw new Error(`missing circuit manifest: ${circuit}`);
  run(nargoBinary, ["check", "--silence-warnings"], cwd);
  if (command === "compile" || command === "prove")
    run(nargoBinary, ["compile", "--silence-warnings"], cwd);
  if (command === "prove") {
    const proverToml = resolve(cwd, "Prover.toml");
    requireFile(proverToml, `prover inputs for ${circuit}`);
    run(nargoBinary, ["execute", "--silence-warnings", packageNames[circuit]], cwd);
    const output = resolve(root, "zk", "artifacts", circuit);
    const bytecode = resolve(cwd, "target", `${packageNames[circuit]}.json`);
    const witness = resolve(cwd, "target", `${packageNames[circuit]}.gz`);
    mkdirSync(output, { recursive: true });
    run(
      bbBinary,
      [
        "prove",
        "-s",
        "ultra_honk",
        "-b",
        bytecode,
        "-w",
        witness,
        "-o",
        output,
        "--write_vk",
        "--verify",
      ],
      cwd,
    );
  }
}

console.log(`zk:${command} completed for ${circuits.join(", ")}`);
